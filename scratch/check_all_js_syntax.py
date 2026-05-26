import re
import subprocess
import sys

def check_html_js(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
    print(f"Found {len(scripts)} script blocks.")
    
    for i, js in enumerate(scripts):
        # Skip empty script blocks
        if not js.strip():
            continue
            
        temp_file = f'scratch/temp_block_{i}.js'
        with open(temp_file, 'w', encoding='utf-8') as f_out:
            f_out.write(js)
            
        result = subprocess.run(['node', '--check', temp_file], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Syntax Error in script block {i}:")
            print(result.stderr)
            sys.exit(1)
        else:
            print(f"Script block {i}: OK")
            
    print("All script blocks are syntactically valid!")

if __name__ == "__main__":
    check_html_js('index.html')
