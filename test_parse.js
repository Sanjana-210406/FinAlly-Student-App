const Helpers = { todayStr: () => '2026-04-11' };

function parseHeuristics(rawText) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const transactions = [];
    const today = Helpers.todayStr();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const amtMatch = line.match(/(?:[₹$£]|rs\.?|paid|amount|total|-)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
      
      if (amtMatch) {
        const amtStr = amtMatch[1].replace(/,/g, '');
        const amt = parseFloat(amtStr);

        const hasCurrencySymbol = /(?:[₹$£]|rs\.?|paid)/i.test(line);
        if (amt > 0 && (hasCurrencySymbol || line.includes('.'))) {
          let desc = "Unknown Merchant";
          
          if (i > 0 && lines[i-1].length > 2 && !/\d{3}/.test(lines[i-1])) {
            desc = lines[i-1].trim();
          } else {
            const strippedLine = line.replace(amtMatch[0], '').trim();
            if (strippedLine.length > 2 && !/^[\d:\-\/]+$/.test(strippedLine)) {
               desc = strippedLine;
            } else if (i + 1 < lines.length && !/\d/.test(lines[i+1])) {
               desc = lines[i+1].trim();
            }
          }

          desc = desc.replace(/[^a-zA-Z0-9\s&*]/g, '').slice(0, 50).trim() || 'Unknown Scanned Merchant';

          transactions.push({
            date: today,
            description: desc,
            amount: amt
          });
        }
      }
    }

    const uniqueTxns = [];
    const seen = new Set();
    for (const t of transactions) {
      const key = `${t.amount}-${t.description.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTxns.push(t);
      }
    }

    return uniqueTxns.slice(0, 20);
}

const sample = `
Uber ride
₹ 250.00
Date: 11-04-2026
Zomato
Paid 450
Amazon
Amount: $ 1,200.50
`;

console.log(parseHeuristics(sample));
