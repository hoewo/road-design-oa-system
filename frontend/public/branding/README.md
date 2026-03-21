# branding（静态资源）

用于存放登录页等品牌相关文件（由组织提供的 **京宏logo.pdf** 等母版导出后的 SVG / PNG / WebP 等）。

**状态说明**：在 `arckit/spec/login-page-branding.md` §10 **D-03** 获得干系人签批前，本目录为工程侧**推荐约定**，不作为产品需求中的唯一合法路径；签批后须与决策记录一致。

## 当前文件

| 文件 | 说明 |
|------|------|
| `jinghong-logo.png` | 由内嵌 **JPEG（2048²）** 导出：在缩小预览上按 **红/灰笔画掩膜 + 膨胀** 定主体包围盒（避免 JPEG 噪点把整图当前景），映射全分辨率裁切后 **浅灰底抠透明**，再按 alpha 行/列收紧；带 **alpha** 的 PNG。 |

完整流程、AI/脚本分工与**能否复用到其他 PDF** 见：`scripts/export-jinghong-logo.md`。

**再导出**（仓库根目录，默认宽 480；可选参数传目标宽度像素）：

```bash
./scripts/export-jinghong-logo.sh
# 或：./scripts/export-jinghong-logo.sh 520
```

导出后若宽度与 `Login.tsx` 中 `img` 的 `width`/`height` 不一致，请同步修改。

**素材溯源**：组织侧母版为 **京宏logo.pdf**（产品规格见 `arckit/spec/login-page-branding.md`）。
