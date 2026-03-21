#!/usr/bin/env bash
# 从 input/202601/京宏logo.pdf 导出登录页用 PNG。
#
# 设计说明与复用范围见同目录：export-jinghong-logo.md
#
# 摘要：不使用 sips 栅格整页（避免 CropBox 裁切）；抽取内嵌 JPEG → 预览图红/灰掩膜+膨胀定框
# → 全分辨率裁切 → 浅灰底转 alpha → 行/列收紧 → 缩放到目标宽度。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="${ROOT}/input/202601/京宏logo.pdf"
OUT="${ROOT}/frontend/public/branding/jinghong-logo.png"
TARGET_W="${1:-480}"

if [[ ! -f "$PDF" ]]; then
  echo "缺少母版 PDF: $PDF" >&2
  exit 1
fi

python3 - "$PDF" "$OUT" "$TARGET_W" << 'PY'
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

pdf_path, dst, target_w = Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3])
data = pdf_path.read_bytes()
idx = data.find(b"/Filter/DCTDecode")
if idx < 0:
    sys.exit("PDF 内未找到 DCTDecode 图像流（可能不是单图嵌入稿）")
sub = data[idx : idx + 12000]
m = re.search(rb"stream\r?\n", sub)
if not m:
    sys.exit("未找到图像 stream")
start = idx + m.end()
end = data.find(b"endstream", start)
if end < 0:
    sys.exit("未找到 endstream")
jpeg = data[start:end].lstrip(b"\r\n")
if not jpeg.startswith(b"\xff\xd8"):
    sys.exit("提取流不是有效 JPEG")

im = Image.open(__import__("io").BytesIO(jpeg)).convert("RGB")
a = np.asarray(im, dtype=np.int16)
h, w = a.shape[:2]

corners = np.concatenate(
    [
        a[0:3, 0:3].reshape(-1, 3),
        a[0:3, -3:].reshape(-1, 3),
        a[-3:, 0:3].reshape(-1, 3),
        a[-3:, -3:].reshape(-1, 3),
    ],
    axis=0,
)
bg = corners.mean(axis=0)

# 用「笔画颜色」在缩小图上定包围盒，避免 diff 掩膜被 JPEG 噪点拉成全图大框；膨胀吞没内部白路/浅部
pw = min(480, w)
ph = max(1, int(round(h * pw / w)))
preview = im.resize((pw, ph), Image.Resampling.LANCZOS)
pa = np.asarray(preview, dtype=np.int16)
pr, pg, pb = pa[:, :, 0], pa[:, :, 1], pa[:, :, 2]
stroke = (pr > 130) & (pr > pg + 28) & (pr > pb + 28)
bridge = (pr < 115) & (pg < 115) & (pb < 115) & (pr > 35)
pm = stroke | bridge
if not np.any(pm):
    sys.exit("未检测到红/灰笔画（请检查稿件或阈值）")
d = max(21, min(41, pw // 14))
if d % 2 == 0:
    d += 1
pimg = Image.fromarray((pm.astype(np.uint8) * 255))
pimg = pimg.filter(ImageFilter.MaxFilter(d))
pm2 = np.asarray(pimg) > 0
ys, xs = np.where(pm2)
sx0, sx1, sy0, sy1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
scale_x = w / pw
scale_y = h / ph
pad_f = max(10, int(round(0.007 * max(w, h))))
left = max(0, int(sx0 * scale_x) - pad_f)
top = max(0, int(sy0 * scale_y) - pad_f)
right = min(w - 1, int(sx1 * scale_x) + pad_f)
bottom = min(h - 1, int(sy1 * scale_y) + pad_f)
cropped_rgb = im.crop((left, top, right + 1, bottom + 1))
ca = np.asarray(cropped_rgb, dtype=np.int16)
bgc = bg.reshape(1, 1, 3)
md = np.abs(ca - bgc).max(axis=2)
# 略收窄过渡带，减轻横向 alpha 晕染（否则行投影裁不掉留白）
t0, t1 = 13, 24
alpha = np.clip((md - t0) * 255 // max(1, t1 - t0), 0, 255).astype(np.uint8)
rgba = np.zeros((ca.shape[0], ca.shape[1], 4), dtype=np.uint8)
rgba[:, :, :3] = np.asarray(cropped_rgb, dtype=np.uint8)
rgba[:, :, 3] = alpha
out_rgba = Image.fromarray(rgba)
oa = rgba[:, :, 3]
thr = 36
cols = np.where(np.any(oa > thr, axis=0))[0]
rows = np.where(np.any(oa > thr, axis=1))[0]
if len(cols) and len(rows):
    lt, rt = int(cols[0]), int(cols[-1])
    tt, bt = int(rows[0]), int(rows[-1])
    pad = 2
    ch, cw = oa.shape
    lt = max(0, lt - pad)
    tt = max(0, tt - pad)
    rt = min(cw - 1, rt + pad)
    bt = min(ch - 1, bt + pad)
    out_rgba = out_rgba.crop((lt, tt, rt + 1, bt + 1))
w0, h0 = out_rgba.size
target_h = max(1, round(h0 * target_w / w0))
out_im = out_rgba.resize((target_w, target_h), Image.Resampling.LANCZOS)
out_im.save(dst, optimize=True)
print(f"OK PDF-JPEG {im.size} -> crop {left},{top}-{right},{bottom} -> RGBA {out_im.size} -> {dst}")
PY
