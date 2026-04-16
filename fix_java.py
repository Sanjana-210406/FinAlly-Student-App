import os
import re

directories = {
    'backend/src/main/java/com/studentfinance/dto': '@Data @NoArgsConstructor @AllArgsConstructor @Builder',
    'backend/src/main/java/com/studentfinance/service': '@Service\n@RequiredArgsConstructor',
    'backend/src/main/java/com/studentfinance/repository': ''
}

for d, ann in directories.items():
    if not os.path.exists(d): continue
    for f in os.listdir(d):
        if not f.endswith('.java'): continue
        filepath = os.path.join(d, f)
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Find the last closing brace
        last_brace_idx = content.rfind('}')
        if last_brace_idx != -1:
            content = content[:last_brace_idx+1] # Remove everything after last brace
            
        # Check if the class is missing its specific annotations
        # We find the class declaration
        class_match = re.search(r'public\s+(class|interface)\s+\w+', content)
        if class_match and ann:
            # Check if annotation already exists
            if '@Data' not in content and '@Service' not in content:
                # Insert annotation right before public class
                idx = class_match.start()
                content = content[:idx] + ann + '\n' + content[idx:]

        # For DTOs, ensure lombok imports
        if 'dto' in filepath and 'import lombok.*' not in content:
            content = content.replace('package com.studentfinance.dto;', 'package com.studentfinance.dto;\nimport lombok.*;\n')
            
        # For Services, ensure annotations imports
        if 'service' in filepath and 'import lombok.RequiredArgsConstructor' not in content:
            content = content.replace('package com.studentfinance.service;', 'package com.studentfinance.service;\nimport lombok.RequiredArgsConstructor;\nimport org.springframework.stereotype.Service;\n')

        with open(filepath, 'w', encoding='utf-8') as file:
            file.write(content)

print("Files fixed.")
