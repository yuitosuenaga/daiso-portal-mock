import os

from PIL import Image

SRC_DIR = "/home/suenagayuito/daiso/Local POPs List"
DST_DIR = "/home/suenagayuito/daiso/portal_mock/demo-assets/pop-local"
os.makedirs(DST_DIR, exist_ok=True)

files = sorted(os.listdir(SRC_DIR))
for filename in files:
    if not filename.lower().endswith(".jpg"):
        continue
    src_path = os.path.join(SRC_DIR, filename)
    dst_name = os.path.splitext(filename)[0] + ".pdf"
    dst_path = os.path.join(DST_DIR, dst_name)
    image = Image.open(src_path).convert("RGB")
    image.save(dst_path, "PDF")
    print(f"created: {dst_path}")

print("done")
