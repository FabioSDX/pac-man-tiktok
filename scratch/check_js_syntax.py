import sys
import re

def extract_and_check(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
    if not match:
        print("No script found")
        return
    
    js_content = match.group(1)
    with open('scratch/temp.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    import subprocess
    result = subprocess.run(['node', '--check', 'scratch/temp.js'], capture_output=True, text=True)
    if result.returncode != 0:
        print("Syntax Error found:")
        print(result.stderr)
    else:
        print("No syntax error found in JS block.")

if __name__ == "__main__":
    extract_and_check(sys.argv[1])
