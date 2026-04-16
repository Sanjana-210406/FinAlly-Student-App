import re

raw_text = """100.00
Paid to
PRINCIPAL BVRIT NARSAPUR
] Banking name: PRINCIPAL BVRIT NARSAPUR
15 September 2025, 1:07 pm"""

lines = [l.strip() for l in raw_text.split('\n') if l.strip()]
transactions = []

for i, line in enumerate(lines):
    amt_match = re.search(r'(?:[₹$£]|rs\.?|paid|amount|total|-)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', line, re.IGNORECASE)
    if amt_match:
        amt_str = amt_match.group(1).replace(',', '')
        amt = float(amt_str)
        
        has_currency_symbol = bool(re.search(r'(?:[₹$£]|rs\.?|paid)', line, re.IGNORECASE))
        if amt > 0 and (has_currency_symbol or '.' in line):
            desc = "Unknown Merchant"
            
            if i > 0 and len(lines[i-1]) > 2 and not bool(re.search(r'\d{3}', lines[i-1])):
                desc = lines[i-1].strip()
            else:
                stripped_line = line.replace(amt_match.group(0), '').strip()
                if len(stripped_line) > 2 and not bool(re.search(r'^[\d:\-\/]+$', stripped_line)):
                    desc = stripped_line
                elif i + 1 < len(lines) and not bool(re.search(r'\d', lines[i+1])):
                    desc = lines[i+1].strip()
            
            desc = re.sub(r'[^a-zA-Z0-9\s&*]', '', desc).strip()
            if not desc:
                desc = 'Unknown Scanned Merchant'
            
            transactions.append({
                'description': desc,
                'amount': amt
            })

print(transactions)
