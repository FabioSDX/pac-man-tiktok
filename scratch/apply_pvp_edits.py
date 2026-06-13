import json
import os
import re

transcript_path = r"C:\Users\fabai\.gemini\antigravity\brain\37d8f314-310a-4e1a-9882-5261ef4615ad\.system_generated\logs\transcript.jsonl"
app_js_path = r"c:\laragon8\www\fallingpickaxeticktockmoney - Copia\js\app.js"
style2_css_path = r"c:\laragon8\www\fallingpickaxeticktockmoney - Copia\css\style2.css"

# Backup app.js before modifying
if os.path.exists(app_js_path):
    with open(app_js_path, 'r', encoding='latin1') as f:
        app_js_backup = f.read()
    with open(app_js_path + ".backup_pvp_restore", 'w', encoding='latin1') as f:
        f.write(app_js_backup)
    print("Backed up app.js to app.js.backup_pvp_restore")

# Parse transcript to extract tool calls
edits = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
        except Exception as e:
            continue
        
        if step.get("source") == "MODEL" and "tool_calls" in step:
            for tc in step["tool_calls"]:
                name = tc.get("name")
                args = tc.get("args", {})
                
                if name == "replace_file_content":
                    target_file = args.get("TargetFile", "")
                    if "app.js" in target_file or "style2.css" in target_file:
                        edits.append({
                            "step_index": step.get("step_index"),
                            "tool": name,
                            "target_file": "app.js" if "app.js" in target_file else "style2.css",
                            "args": args
                        })

print(f"Found {len(edits)} replace_file_content edits in transcript.")

# Helper to clean string values that are JSON stringified inside JSON
def clean_content(val):
    if not val:
        return ""
    # If the value is wrapped in double quotes and contains escaped quotes/newlines,
    # it might have been stored as a JSON string within JSON.
    if val.startswith('"') and val.endswith('"') and len(val) >= 2:
        try:
            # Try parsing it as JSON string
            parsed = json.loads(val)
            return parsed
        except Exception:
            # Fallback: strip outer quotes and replace escaped characters manually
            inner = val[1:-1]
            inner = inner.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            return inner
    return val

# Track stats
success_count = 0
failed_edits = []

# Open target files
with open(app_js_path, 'r', encoding='latin1') as f:
    app_js_content = f.read()

with open(style2_css_path, 'r', encoding='latin1') as f:
    style2_css_content = f.read()

for edit in edits:
    step_idx = edit["step_index"]
    target_file = edit["target_file"]
    args = edit["args"]
    
    desc = args.get("Description", "")
    target = clean_content(args.get("TargetContent", ""))
    replacement = clean_content(args.get("ReplacementContent", ""))
    
    # Skip style2.css if already present
    if target_file == "style2.css":
        if replacement in style2_css_content:
            print(f"Step {step_idx}: [style2.css] Already applied ({desc})")
            success_count += 1
            continue
        else:
            # Apply to CSS
            if target in style2_css_content:
                style2_css_content = style2_css_content.replace(target, replacement, 1)
                print(f"Step {step_idx}: [style2.css] Success ({desc})")
                success_count += 1
            else:
                print(f"Step {step_idx}: [style2.css] FAILED - Target not found ({desc})")
                failed_edits.append((step_idx, "style2.css", desc))
            continue

    # Apply to app.js
    # Normalize carriage returns for matching
    target_norm = target.replace('\r\n', '\n').replace('\r', '\n')
    app_js_norm = app_js_content.replace('\r\n', '\n').replace('\r', '\n')
    
    if replacement.replace('\r\n', '\n').replace('\r', '\n') in app_js_norm:
        print(f"Step {step_idx}: [app.js] Already applied ({desc})")
        success_count += 1
        continue

    # Try replacement
    if target_norm in app_js_norm:
        # We replace in the normalized content, but to preserve line endings of the original file,
        # we can find the exact match in the original content.
        # Let's find target_norm in app_js_norm, and get the line start/end offsets,
        # or search for the exact carriage-return formatted string.
        # Simplest: replace in normalized and write out. Since modern browsers don't care about \r\n vs \n.
        app_js_norm = app_js_norm.replace(target_norm, replacement.replace('\r\n', '\n').replace('\r', '\n'), 1)
        app_js_content = app_js_norm # Keep the normalized one
        print(f"Step {step_idx}: [app.js] Success ({desc})")
        success_count += 1
    else:
        # Try a fuzzy match where we ignore white spaces at the start/end of lines
        # or check if it's already there with slight differences
        print(f"Step {step_idx}: [app.js] FAILED - Target not found ({desc})")
        # Let's print the target to see why it failed
        # print("TARGET:")
        # print(repr(target_norm[:100]))
        failed_edits.append((step_idx, "app.js", desc))

# Save files
with open(app_js_path, 'w', encoding='latin1') as f:
    f.write(app_js_content)

with open(style2_css_path, 'w', encoding='latin1') as f:
    f.write(style2_css_content)

print("\n--- Restore Summary ---")
print(f"Successfully applied: {success_count} / {len(edits)}")
if failed_edits:
    print(f"Failed edits ({len(failed_edits)}):")
    for step_idx, filename, desc in failed_edits:
        print(f"  - Step {step_idx} in {filename}: {desc}")
else:
    print("All edits applied successfully!")
