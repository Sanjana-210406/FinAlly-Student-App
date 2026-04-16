import os
import re

# Fix Controllers.java
controller_path = 'backend/src/main/java/com/studentfinance/controller/Controllers.java'
with open(controller_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove @RequiredArgsConstructor from controllers that extend BaseController
c = re.sub(r'@RequiredArgsConstructor(\s+class\s+\w+\s+extends\s+BaseController)', r'\1', c)

with open(controller_path, 'w', encoding='utf-8') as f:
    f.write(c)

# Fix DTOs that had @Data inside them so my previous script skipped them
dtos_to_fix = ['GamificationResponse.java', 'InvestmentResponse.java', 'SimulatorResponse.java', 'ForecastResponse.java']
for dto in dtos_to_fix:
    p = os.path.join('backend/src/main/java/com/studentfinance/dto', dto)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Insert if absent before public class
        if '@Builder\npublic class' not in content:
            content = re.sub(r'public class', r'@Data @NoArgsConstructor @AllArgsConstructor @Builder\npublic class', content, count=1)
        
        with open(p, 'w', encoding='utf-8') as f:
            f.write(content)

print("Fixes applied.")
