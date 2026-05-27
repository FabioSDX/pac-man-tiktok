import re
import os

def split_html():
    filepath = 'index.html'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    style_blocks = list(re.finditer(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE))
    
    script_blocks = []
    for match in re.finditer(r'<script[^>]*>(.*?)</script>', content, re.DOTALL | re.IGNORECASE):
        # Ignore empty or src scripts
        if 'src=' not in content[match.start():match.start()+100].lower():
            script_blocks.append(match)

    print(f"Found {len(style_blocks)} style blocks")
    print(f"Found {len(script_blocks)} script blocks")

    new_content = content
    
    # Process from end to start so indices don't shift
    # Scripts first (if they are after styles usually, but better sort all matches by start)
    all_matches = style_blocks + script_blocks
    all_matches.sort(key=lambda x: x.start(), reverse=True)

    style_count = 1
    script_count = 1

    for match in all_matches:
        if match in style_blocks:
            # write to css
            filename = f"css/style{style_count if style_count > 1 else ''}.css"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(match.group(1).strip())
            
            replacement = f'<link rel="stylesheet" href="{filename}">'
            new_content = new_content[:match.start()] + replacement + new_content[match.end():]
            print(f"Extracted style to {filename}")
            style_count += 1
            
        elif match in script_blocks:
            # write to js
            # The last script block found in document is actually the main one, wait, reverse sorted!
            # so the first one in the loop is the LAST in the document
            if len(match.group(1).strip()) < 100:
                # ignore tiny scripts if any, but let's just write them
                filename = f"js/script{script_count}.js"
            else:
                filename = "js/app.js" if len(match.group(1)) > 100000 else f"js/script_{script_count}.js"
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(match.group(1).strip())
                
            replacement = f'<script src="{filename}"></script>'
            new_content = new_content[:match.start()] + replacement + new_content[match.end():]
            print(f"Extracted script to {filename}")
            script_count += 1

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("HTML split completed successfully.")

if __name__ == '__main__':
    split_html()
