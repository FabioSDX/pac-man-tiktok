import re

def analyze_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"File size: {len(content)} characters")
    
    # Encontrar <style>
    for match in re.finditer(r'<style[^>]*>.*?</style>', content, re.DOTALL | re.IGNORECASE):
        print(f"STYLE BLOCK: starts at {match.start()}, ends at {match.end()}, length: {match.end() - match.start()}")

    # Encontrar <script>
    for match in re.finditer(r'<script[^>]*>.*?</script>', content, re.DOTALL | re.IGNORECASE):
        # ignore scripts with src attribute
        if 'src=' not in content[match.start():match.start()+100].lower():
            print(f"INLINE SCRIPT BLOCK: starts at {match.start()}, ends at {match.end()}, length: {match.end() - match.start()}")
        else:
            print(f"EXTERNAL SCRIPT: starts at {match.start()}, length: {match.end() - match.start()}")

if __name__ == '__main__':
    analyze_html('index.html')
