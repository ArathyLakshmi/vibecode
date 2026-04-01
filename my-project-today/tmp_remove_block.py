from pathlib import Path

path = Path(r'c:\Users\arath\my-project-today\src\client\src\components\MeetingRequestsList.jsx')
text = path.read_text().splitlines()
out = []
seen_requestor = False
skipping = False
start = "// Get user email for permission checks (memoized to prevent unnecessary recalculations)"
end_marker = "disabled={cancellingRegistration}"
for line in text:
    if '<Field label="Requestor">' in line:
        seen_requestor = True
    if seen_requestor and not skipping and start in line.strip():
        print("Starting removal at line", len(out))
        skipping = True
        continue
    if skipping:
        if end_marker in line:
            skipping = False
            out.append(line)
            print("Ending removal at line", len(out))
        continue
    out.append(line)
path.write_text("\n".join(out))
print("Original lines", len(text), "New lines", len(out))
