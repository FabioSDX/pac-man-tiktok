import json

transcript_path = r"C:\Users\fabai\.gemini\antigravity\brain\37d8f314-310a-4e1a-9882-5261ef4615ad\.system_generated\logs\transcript.jsonl"
app_js_path = r"c:\laragon8\www\fallingpickaxeticktockmoney - Copia\js\app.js"

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        step = json.loads(line)
        if step.get("step_index") == 137:
            args = step["tool_calls"][0]["args"]
            target = args.get("TargetContent", "")
            print("RAW TARGET:")
            print(repr(target))
            
            # Clean target
            if target.startswith('"') and target.endswith('"'):
                try:
                    cleaned = json.loads(target)
                except Exception as e:
                    cleaned = target[1:-1].replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            else:
                cleaned = target
                
            print("CLEANED TARGET:")
            print(repr(cleaned))
            
            with open(app_js_path, 'r', encoding='latin1') as js_f:
                app_js = js_f.read().replace('\r\n', '\n').replace('\r', '\n')
            
            cleaned_norm = cleaned.replace('\r\n', '\n').replace('\r', '\n')
            
            # Print check
            print("MATCH FOUND:", cleaned_norm in app_js)
            
            # If not found, check why by looking for substrings
            if cleaned_norm not in app_js:
                print("First 100 chars match:", cleaned_norm[:100] in app_js)
                print("Last 100 chars match:", cleaned_norm[-100:] in app_js)
                
                # Check for where it diverges
                for i in range(1, len(cleaned_norm)):
                    sub = cleaned_norm[:i]
                    if sub not in app_js:
                        print(f"Divergence at char {i}: {repr(cleaned_norm[i-20:i+20])}")
                        break
