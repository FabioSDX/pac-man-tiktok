import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find the main script block
    import re
    # Match <script> then anything until </script>
    scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
    
    if not scripts:
        print("No script blocks found.")
        return

    for i, script in enumerate(scripts):
        print(f"Checking script block {i}...")
        stack = []
        lines = script.split('\n')
        for line_num, line in enumerate(lines):
            # Ignore strings and comments to avoid false positives
            # This is a bit complex for a scratch script, but let's try to handle basic // comments
            clean_line = line.split('//')[0]
            # Handle /* */ comments roughly
            # (Not handling multiline comments well here, but usually index.html has //)
            
            for char_pos, char in enumerate(clean_line):
                if char == '{':
                    stack.append((line_num + 1, char_pos + 1, line))
                elif char == '}':
                    if not stack:
                        print(f"ERROR: Extra closing brace at script {i}, line {line_num + 1}, pos {char_pos + 1}")
                        print(f"Context: {line.strip()}")
                    else:
                        stack.pop()
        
        if stack:
            print(f"ERROR: Script {i} has {len(stack)} unclosed opening braces.")
            for ln, cp, txt in stack[-5:]:
                print(f"  Unclosed brace at line {ln}, pos {cp}: {txt.strip()}")

if __name__ == "__main__":
    check_braces(sys.argv[1])
