import json

transcript_path = r"C:\Users\fabai\.gemini\antigravity\brain\036a7d0b-7aa2-4457-aeca-4aebe1e790bf\.system_generated\logs\transcript.jsonl"
out_path = r"c:\laragon8\www\fallingpickaxeticktockmoney\scratch\edits_dump.md"

def dump_edits():
    with open(transcript_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out = open(out_path, 'w', encoding='utf-8')
    
    for idx, line in enumerate(lines):
        try:
            data = json.loads(line)
            if 'tool_calls' in data and data['tool_calls']:
                for tool in data['tool_calls']:
                    name = tool.get('name')
                    if name in ('replace_file_content', 'multi_replace_file_content'):
                        args = tool.get('args', {})
                        if isinstance(args, str):
                            try: args = json.loads(args)
                            except: continue
                            
                        file_path = args.get('TargetFile') or args.get('targetFile') or args.get('targetfile')
                        if not file_path or '.gemini' in file_path.lower(): continue
                            
                        out.write(f"\n\n=================================\n")
                        out.write(f"EDIT at STEP {idx} for {file_path}\n")
                        out.write(f"=================================\n")

                        if name == 'replace_file_content':
                            target = args.get('TargetContent') or args.get('targetContent') or ''
                            replacement = args.get('ReplacementContent') or args.get('replacementContent') or ''
                            out.write("--- TARGET ---\n" + target + "\n+++ REPLACEMENT +++\n" + replacement + "\n")
                                
                        elif name == 'multi_replace_file_content':
                            chunks = args.get('ReplacementChunks') or args.get('replacementChunks') or []
                            for c_idx, chunk in enumerate(chunks):
                                target = chunk.get('TargetContent') or chunk.get('targetContent') or ''
                                replacement = chunk.get('ReplacementContent') or chunk.get('replacementContent') or ''
                                out.write(f"\n--- TARGET CHUNK {c_idx} ---\n" + target + "\n+++ REPLACEMENT CHUNK {c_idx} +++\n" + replacement + "\n")

        except Exception as e:
            pass

    out.close()
    print("Done")

if __name__ == '__main__':
    dump_edits()
