import re

samples = [
"""100.00
Paid to
PRINCIPAL BVRIT NARSAPUR
] Banking name: PRINCIPAL BVRIT NARSAPUR
15 September 2025, 1:07 pm""",
"""Paid to
John Doe
? 500
11-04-2026""",
"""Sent to
Zomato
1,250
UPI ID: zomato@upi"""
]

for raw_text in samples:
    lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
    transactions = []
    
    for i, line in enumerate(lines):
        amt_match = re.search(r'(?:[₹$£]|rs\.?|paid|amount|total|-|[z?])?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', line, re.IGNORECASE)
        
        if amt_match:
            amt_str = amt_match.group(1).replace(',', '')
            amt = float(amt_str)
            
            is_just_number = bool(re.match(r'^[^a-zA-Z\d]*\d+[\d,]*(\.\d+)?\s*$', line))
            has_currency_symbol = bool(re.search(r'(?:[₹$£]|rs\.?|paid)', line, re.IGNORECASE))
            
            if amt > 0 and (has_currency_symbol or '.' in line or is_just_number):
                desc = ""
                
                candidate_lines = []
                for j in range(max(0, i - 3), min(len(lines), i + 4)):
                    if j == i:
                        continue
                    c_line = lines[j]
                    
                    if re.search(r'sep|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|am|pm|\d{2,4}', c_line, re.IGNORECASE) and re.search(r'\d', c_line):
                        continue
                        
                    if re.search(r'banking name|upi id|transaction id|paid to|sent to', c_line, re.IGNORECASE):
                        b_name_match = re.search(r'banking name:?\s*(.*)', c_line, re.IGNORECASE)
                        if b_name_match and b_name_match.group(1).strip():
                            candidate_lines.insert(0, b_name_match.group(1).strip())
                        continue
                        
                    if not re.search(r'\d{3,}', c_line) and len(c_line) > 2:
                        candidate_lines.append(c_line)
                        
                if candidate_lines:
                    desc = candidate_lines[0]
                else:
                    stripped_line = line.replace(amt_match.group(0), '').strip()
                    if len(stripped_line) > 2 and not bool(re.search(r'^[\d:\-\/]+$', stripped_line)):
                        desc = stripped_line
                        
                desc = re.sub(r'[^a-zA-Z0-9\s&*]', '', desc).strip()
                if not desc:
                    desc = 'Unknown Scanned Merchant'
                    
                transactions.append({'description': desc, 'amount': amt})
                
    print(transactions)
