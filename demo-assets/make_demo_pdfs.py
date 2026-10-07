import os
import zlib


def make_pdf(path: str, title_en: str, lines: list[str]) -> None:
    content_lines = [f"({title_en}) Tj", "0 -40 Td"]
    body = "\n".join(
        f"({line}) Tj\n0 -24 Td" for line in lines
    )
    stream = (
        "BT\n/F1 24 Tf\n72 700 Td\n"
        + f"({title_en}) Tj\n"
        + "/F1 12 Tf\n0 -40 Td\n"
        + body
        + "\nET\n"
    ).encode("latin-1")

    objects = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
    )
    objects.append(
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n"
        + stream + b"\nendstream"
    )
    objects.append(
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    )

    out = [b"%PDF-1.4\n"]
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(sum(len(chunk) for chunk in out))
        out.append(f"{i} 0 obj\n".encode() + obj + b"\nendobj\n")

    xref_offset = sum(len(chunk) for chunk in out)
    n = len(objects) + 1
    xref = [f"xref\n0 {n}\n".encode(), b"0000000000 65535 f \n"]
    for off in offsets[1:]:
        xref.append(f"{off:010d} 00000 n \n".encode())

    trailer = (
        f"trailer\n<< /Size {n} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF"
    ).encode()

    with open(path, "wb") as f:
        for chunk in out:
            f.write(chunk)
        for chunk in xref:
            f.write(chunk)
        f.write(trailer)


BASE = os.path.dirname(os.path.abspath(__file__))
MANUAL_DIR = os.path.join(BASE, "manuals")
SFM_DIR = os.path.join(BASE, "sales-floor-meeting")
os.makedirs(MANUAL_DIR, exist_ok=True)
os.makedirs(SFM_DIR, exist_ok=True)

# (category, title_ja, title_en_for_pdf_body, year, month)
MANUALS = [
    ("storeOperations", "店舗運営マニュアル（開店・閉店業務）", "Store Operations Manual", 2026, 1),
    ("registerPayment", "レジ操作・会計対応マニュアル", "Register and Payment Manual", 2026, 2),
    ("inventoryOrdering", "発注・在庫管理マニュアル", "Inventory and Ordering Manual", 2026, 3),
    ("salesFloorDisplay", "売場ディスプレイ基準マニュアル", "Sales Floor Display Standards Manual", 2026, 4),
    ("promotion", "POP設置・販促運用マニュアル", "Promotion and POP Operation Manual", 2026, 5),
    ("safetyHygiene", "安全衛生・防災対応マニュアル", "Safety, Hygiene and Disaster Response Manual", 2026, 6),
    ("hrTraining", "新人研修マニュアル", "New Staff Training Manual", 2026, 7),
    ("systemOperation", "POSシステム操作マニュアル", "POS System Operation Manual", 2026, 8),
    ("accounting", "日次経理処理マニュアル", "Daily Accounting Procedure Manual", 2026, 9),
    ("other", "緊急時対応マニュアル", "Emergency Response Manual", 2026, 9),
]

# (department, department_ja, year, month)
SALES_FLOOR_MEETINGS = [
    ("seasonalEvent", "季節・催事", 2026, 1),
    ("storage", "収納・整理", 2026, 2),
    ("kitchen", "キッチン・食器", 2026, 3),
    ("cleaning", "掃除・洗濯", 2026, 4),
    ("beautyHealth", "美容・健康", 2026, 5),
    ("stationery", "文具・事務", 2026, 6),
    ("interior", "インテリア・雑貨", 2026, 7),
    ("craftDiy", "手芸・DIY", 2026, 8),
    ("food", "食品・菓子", 2026, 9),
    ("other", "その他", 2026, 9),
]

for i, (category, title_ja, title_en, year, month) in enumerate(MANUALS, start=1):
    filename = f"{i:02d}_{title_ja}.pdf"
    path = os.path.join(MANUAL_DIR, filename)
    make_pdf(
        path,
        title_en,
        [
            "This is a placeholder PDF for demo purposes.",
            f"Category: {category}",
            f"Target period: {year}-{month:02d}",
            "Uploaded via the Helpdesk manual management screen.",
        ],
    )
    print(f"created: {path}")

for i, (department, department_ja, year, month) in enumerate(SALES_FLOOR_MEETINGS, start=1):
    filename = f"{i:02d}_売場検討会資料_{department_ja}_{year}{month:02d}.pdf"
    path = os.path.join(SFM_DIR, filename)
    make_pdf(
        path,
        "Sales Floor Meeting - Demo Material",
        [
            "This is a placeholder PDF for demo purposes.",
            f"Department: {department}",
            f"Target period: {year}-{month:02d}",
            "Uploaded via the Helpdesk sales floor meeting management screen.",
        ],
    )
    print(f"created: {path}")

print("done")
