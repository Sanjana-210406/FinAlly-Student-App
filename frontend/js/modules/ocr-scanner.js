/* ============================================================
   js/modules/ocr-scanner.js
   Frontend Tesseract.js wrapper for parsing transactional screenshots.
   ============================================================ */

window.OcrScanner = (() => {

  function init() {
    const input = document.getElementById('scanImageInput');
    if (!input) return;

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      Toast.info('🔍 Initializing AI Scanner... this might take 5-10s.');
      
      try {
        // Tesseract v5 API
        // createWorker is now async in v5 and better initialized like this
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text' && Math.round(m.progress * 100) % 25 === 0) {
              console.log(`Scanning progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        const { data: { text } } = await worker.recognize(file);
        console.log("Raw OCR Result:\n", text);
        await worker.terminate();

        const transactions = parseHeuristics(text);

        if (!transactions.length) {
          Toast.error('Could not detect any clear amounts or merchants. Try a clearer screenshot.');
          return;
        }

        // Instead of auto-saving, we pass results to the UI for confirmed editing
        if (window.AddExpenseModule && window.AddExpenseModule.showOcrResults) {
            window.AddExpenseModule.showOcrResults(transactions);
            Toast.success(`Found ${transactions.length} items! Please review and confirm.`);
        } else {
            // Fallback for pages without the new UI: just save them
            Toast.success(`Found ${transactions.length} items! Syncing...`);
            const res = await ApiUtil.Expenses.bulk(transactions);
            if (res && res.length > 0) {
               Toast.success(`✨ Successfully synced ${res.length} scanned transactions!`);
               if (window.ExpensesModule) window.ExpensesModule.init();
            }
        }

      } catch (err) {
        console.error("OCR Error: ", err);
        if (err.message.includes('fetch') || err.message.includes('Network')) {
            Toast.error('Scanner failed. Backend server might be down.');
        } else {
            Toast.error('Scanner failed. Is the image clear?');
        }
      } finally {
        input.value = ''; // Reset input
      }
    });
  }

  function parseHeuristics(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const transactions = [];
    const today = Helpers.todayStr();

    // Date Pattern: DD MMM (e.g. 5 Apr) or numeric (DD-MM-YYYY)
    const dateRegex = /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Improved Amount Regex to handle Indian numbering and leading symbols
      const amtMatch = line.match(/(?:[₹$£]|rs\.?|paid|amount|total|-|[z?])?\s*(\d+[,.\d]*\d+)/i);
      
      if (amtMatch) {
        let amtStr = amtMatch[1].replace(/,/g, '');
        // Fix multiple dots if any
        const dots = amtStr.match(/\./g);
        if (dots && dots.length > 1) {
            const parts = amtStr.split('.');
            amtStr = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
        }

        const amt = parseFloat(amtStr);

        // Sanity thresholds
        if (isNaN(amt) || amt <= 0 || amt > 500000) continue; 
        if (line.match(/^\d{4}$/) || line.match(/^\d{1,2}:\d{2}/)) continue; // Skip years/times misidentified as amounts

        const hasCurrencySymbol = /(?:[₹$£]|rs\.?|paid)/i.test(line);
        const looksLikePrice = line.includes('.') || hasCurrencySymbol;

        if (looksLikePrice || (amt > 10 && amt < 10000)) {
          
          let desc = "";
          let txnDate = today;
          const candidateLines = [];
          
          // Look in window for merchant and date
          for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
            const cLine = lines[j];
            
            // Extract date if found
            const dMatch = cLine.match(dateRegex);
            if (dMatch && txnDate === today) {
                txnDate = parseExtractDate(dMatch[0]);
            }

            if (j === i) continue;
            
            if (/sep|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|am|pm|\d{2,4}/i.test(cLine) && /\d/.test(cLine)) {
                if (cLine.length < 20) continue; // Likely just info line
            }

            if (/banking name|upi id|transaction id|paid to|sent to/i.test(cLine)) {
                const bMatch = cLine.match(/(?:banking name|paid to|sent to):?\s*(.*)/i);
                if (bMatch && bMatch[1].trim()) {
                    candidateLines.unshift(bMatch[1].trim());
                }
                continue;
            }

            if (!/\d{4,}/.test(cLine) && cLine.length > 2) {
                candidateLines.push(cLine);
            }
          }
          
          if (candidateLines.length > 0) {
             desc = candidateLines[0];
          } else {
             const strippedLine = line.replace(amtMatch[0], '').trim();
             if (strippedLine.length > 2 && !/^[\d:\-\/]+$/.test(strippedLine)) {
                desc = strippedLine;
             }
          }

          desc = desc.replace(/[^a-zA-Z0-9\s&*]/g, '').slice(0, 50).trim() || 'Scanned Merchant';

          transactions.push({
            date: txnDate,
            description: desc,
            amount: amt
          });
        }
      }
    }

    function parseExtractDate(dStr) {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const dMmmMatch = dStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
            if (dMmmMatch) {
                const day = parseInt(dMmmMatch[1]);
                const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
                const month = months.indexOf(dMmmMatch[2].toLowerCase().substring(0,3));
                const d = new Date(year, month, day);
                if (d > now) d.setFullYear(year - 1);
                return Helpers.formatDate ? Helpers.formatDate(d) : d.toISOString().split('T')[0];
            }
        } catch(e) {}
        return today;
    }

    const uniqueTxns = [];
    const seen = new Set();
    for (const t of transactions) {
      const key = `${t.amount}-${t.description.toLowerCase()}-${t.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTxns.push(t);
      }
    }

    return uniqueTxns.slice(0, 20);
  }

  return { init };

})();

