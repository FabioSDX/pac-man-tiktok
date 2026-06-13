import json
import re

transcript_path = r'C:\Users\fabai\.gemini\antigravity\brain\5610364d-9c48-4cb3-b432-a7efd8f54a77\.system_generated\logs\transcript.jsonl'
output_path = r'c:\laragon8\www\fallingpickaxeticktockmoney - Copia\scratch\edits_dump.md'

print("Starting recovery from transcript...")

out_lines = []

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
        except Exception as e:
            continue
        
        # Check if model call
        if data.get("source") == "MODEL" and data.get("type") in ["PLANNER_RESPONSE", "CODE_ACTION"]:
            tool_calls = data.get("tool_calls", [])
            for tc in tool_calls:
                name = tc.get("name")
                args = tc.get("args", {})
                
                # Check for edits on app.js
                target_file = args.get("TargetFile", "")
                if "app.js" in target_file or "index.html" in target_file:
                    desc = args.get("Description", "")
                    out_lines.append(f"\n=================================")
                    out_lines.append(f"Tool: {name} | Target: {target_file}")
                    out_lines.append(f"Description: {desc}")
                    out_lines.append(f"=================================")
                    
                    if name == "replace_file_content":
                        out_lines.append("--- TARGET ---")
                        out_lines.append(str(args.get("TargetContent")))
                        out_lines.append("+++ REPLACEMENT +++")
                        out_lines.append(str(args.get("ReplacementContent")))
                    elif name == "multi_replace_file_content":
                        chunks = args.get("ReplacementChunks", [])
                        for i, chunk in enumerate(chunks):
                            out_lines.append(f"\nChunk {i}:")
                            out_lines.append("--- TARGET ---")
                            out_lines.append(str(chunk.get("TargetContent")))
                            out_lines.append("+++ REPLACEMENT +++")
                            out_lines.append(str(chunk.get("ReplacementContent")))

with open(output_path, 'w', encoding='utf-8') as out_f:
    out_f.write("\n".join(out_lines))

print("Finished recovery scan. Saved to scratch/edits_dump.md")
