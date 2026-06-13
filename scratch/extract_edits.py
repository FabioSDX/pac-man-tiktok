import json
import os

transcript_path = r"C:\Users\fabai\.gemini\antigravity\brain\37d8f314-310a-4e1a-9882-5261ef4615ad\.system_generated\logs\transcript.jsonl"
output_path = r"c:\laragon8\www\fallingpickaxeticktockmoney - Copia\scratch\pvp_edits_dump.md"

if not os.path.exists(transcript_path):
    print(f"Error: transcript.jsonl not found at {transcript_path}")
    exit(1)

edits = []

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
        except Exception as e:
            continue
        
        # Check if it is a tool call from the model
        if step.get("source") == "MODEL" and "tool_calls" in step:
            for tc in step["tool_calls"]:
                name = tc.get("name")
                args = tc.get("args", {})
                
                # Check for replace_file_content or write_to_file
                if name in ["replace_file_content", "multi_replace_file_content", "write_to_file"]:
                    # Look ahead or check if it was successful (we can check the next line(s) from system/IDE if status is DONE)
                    # But actually, we can just dump all tool calls of these types since they show what the model planned to write.
                    # We will filter by target files of interest.
                    target_file = args.get("TargetFile", "")
                    if any(x in target_file for x in ["app.js", "index.html", "style.css", "style2.css"]):
                        edits.append({
                            "step_index": step.get("step_index"),
                            "tool": name,
                            "target_file": target_file,
                            "args": args
                        })

with open(output_path, 'w', encoding='utf-8') as out:
    out.write("# PvP Edits Dump\n\nThis file contains a list of edits performed during the PvP implementation conversation.\n\n")
    for edit in edits:
        out.write(f"## Step {edit['step_index']} | Tool: {edit['tool']}\n")
        out.write(f"**Target File:** `{edit['target_file']}`\n")
        args = edit["args"]
        if edit["tool"] == "replace_file_content":
            desc = args.get("Description", "")
            instr = args.get("Instruction", "")
            target = args.get("TargetContent", "")
            replacement = args.get("ReplacementContent", "")
            start = args.get("StartLine", "")
            end = args.get("EndLine", "")
            out.write(f"**Description:** {desc}\n")
            out.write(f"**Instruction:** {instr}\n")
            out.write(f"**Line Range:** {start} - {end}\n\n")
            out.write("### Target Content\n```javascript\n" + target + "\n```\n\n")
            out.write("### Replacement Content\n```javascript\n" + replacement + "\n```\n\n")
        elif edit["tool"] == "multi_replace_file_content":
            desc = args.get("Description", "")
            instr = args.get("Instruction", "")
            chunks = args.get("ReplacementChunks", [])
            out.write(f"**Description:** {desc}\n")
            out.write(f"**Instruction:** {instr}\n\n")
            for idx, chunk in enumerate(chunks):
                out.write(f"#### Chunk {idx + 1}\n")
                out.write(f"**Line Range:** {chunk.get('StartLine')} - {chunk.get('EndLine')}\n\n")
                out.write("##### Target Content\n```javascript\n" + chunk.get("TargetContent", "") + "\n```\n\n")
                out.write("##### Replacement Content\n```javascript\n" + chunk.get("ReplacementContent", "") + "\n```\n\n")
        elif edit["tool"] == "write_to_file":
            desc = args.get("Description", "")
            content = args.get("CodeContent", "")
            out.write(f"**Description:** {desc}\n\n")
            out.write("### Content\n```javascript\n" + content + "\n```\n\n")
        out.write("\n---\n\n")

print(f"Successfully wrote {len(edits)} edits to {output_path}")
