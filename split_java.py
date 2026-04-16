import os
import re

def split_java_file(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract imports and package declaration
    header_match = re.search(r'(package\s+[\w\.]+;\s*)(import\s+[\w\.\*]+;\s*)*', content)
    header = header_match.group(0) if header_match else ""

    # Split by docstrings & annotations followed by "public class/interface/enum/record"
    # This regex is careful about annotations and modifiers
    parts = re.split(r'(?m)^(?=.*(?:public\s+(?:class|interface|enum|record)\s+\w+))', content)
    
    dir_path = os.path.dirname(filepath)
    files_created = 0

    for part in parts:
        if "public class" not in part and "public interface" not in part and "public enum" not in part and "public record" not in part:
            continue
        
        # Extract class name
        name_match = re.search(r'public\s+(?:class|interface|enum|record)\s+(\w+)', part)
        if name_match:
            class_name = name_match.group(1)
            new_file = os.path.join(dir_path, f"{class_name}.java")
            
            # Write to new file with the header (if not already there)
            with open(new_file, 'w', encoding='utf-8') as new_f:
                if "package " not in part:
                    new_f.write(header + part)
                else:
                    new_f.write(part)
            print(f"Created {new_file}")
            files_created += 1

    if files_created > 0:
        os.remove(filepath)
        print(f"Removed original file {filepath}")

# Process known consolidated files
files_to_split = [
    "backend/src/main/java/com/studentfinance/dto/Dtos.java",
    "backend/src/main/java/com/studentfinance/repository/Repositories.java",
    "backend/src/main/java/com/studentfinance/controller/Controllers.java",
    "backend/src/main/java/com/studentfinance/service/Services.java"
]

for f in files_to_split:
    split_java_file(f)
