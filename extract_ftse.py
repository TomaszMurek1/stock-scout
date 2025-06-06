import json
import re
from collections import OrderedDict

# Read the file content (replace with your file path)
with open(r"/c:/Users/tomas/stock-scout/paste.txt", encoding="utf-8") as f:
    text = f.read()

# Remove code block markers if present
text = re.sub(r"^```plaintext|^```json|^```", "", text, flags=re.MULTILINE)
text = text.strip()

# Find all JSON arrays in the text
arrays = re.findall(r"\[\s*{.*?}\s*\]", text, flags=re.DOTALL)

# Merge all JSON arrays into one big list
merged = []
for arr in arrays:
    try:
        merged.extend(json.loads(arr))
    except Exception:
        continue

# Remove duplicates by 'id' field
unique = OrderedDict()
for item in merged:
    uid = item.get("id")
    if uid:
        # If this block contains a 'content'->'value'->'content' list, deduplicate those by 'tidm'
        if "content" in item:
            for c in item["content"]:
                if (
                    isinstance(c, dict)
                    and "value" in c
                    and "content" in c["value"]
                    and isinstance(c["value"]["content"], list)
                ):
                    seen_tidm = set()
                    new_content = []
                    for row in c["value"]["content"]:
                        tidm = row.get("tidm")
                        if tidm and tidm not in seen_tidm:
                            seen_tidm.add(tidm)
                            new_content.append(row)
                    c["value"]["content"] = new_content
        unique[uid] = item

# Output as a single JSON array
with open("merged.json", "w", encoding="utf-8") as f:
    json.dump(list(unique.values()), f, indent=2)
