# GTS 金同心 — 品牌識別檔

金同心實業有限公司（五金行）· 英文品牌 **GTS**

## 核心概念
**同心圓 × 六角螺帽** —— 「同心」化為同心圓，外框取六角螺帽，一眼是五金、也是「金同心」。橘色中心點是唯一的重音。

## 顏色
| 用途 | Hex |
|---|---|
| 主色 · 工業橘 | `#f97316` |
| 強調 · 深橘 | `#ea580c` |
| 鋼黑 | `#101115` |
| 主文字 · 鋼灰 | `#1a1b1f` |
| 次要文字 · 中灰 | `#6c6f7a` |
| 淺底 | `#f7f7f8` |

## 字型
- **Geist**（GTS 字標，weight 600 / SemiBold）— 開源 OFL，見 `fonts/Geist-SemiBold.ttf`
- **Noto Sans TC**（金同心實業，Medium）— 開源 OFL，公司名子集見 `fonts/NotoSansTC-Medium-subset.ttf`；完整字型可在 Google Fonts 下載

## 怎麼改（重點！）
所有 `.svg` 都是**向量檔**，可直接拖進 **Figma**、或用 **Illustrator / Inkscape（免費）** 開啟編輯。

- **要改文字** → 用 `gts-logo-editable*.svg`（文字是真的可編輯文字）。先把 `fonts/` 裡兩個字型**安裝到系統**，繪圖軟體才會用對字型。
- **要當最終檔用** → 用 `gts-logo.svg`（文字已轉外框，到哪都顯示一致、不依賴字型）。
- 顏色、位置、間距都能在軟體裡自由調整。

## 檔案清單
| 檔案 | 說明 |
|---|---|
| `gts-logo.svg` / `-white.svg` | **完整 lockup**（符號＋GTS＋金同心實業）· 文字已外框 · 深/淺 |
| `gts-logo-editable.svg` / `-white.svg` | 完整 lockup · **文字可編輯**（需安裝 fonts/）· 內嵌字型 |
| `gts-logo-compact.svg` / `-white.svg` | 符號＋GTS（無中文）· 適合 navbar / 小尺寸 |
| `gts-mark.svg` / `-white.svg` | 純符號 · 透明底 |
| `gts-icon-orange.svg` | app icon · 橘底白 mark（**網站 favicon 用這個**）|
| `gts-icon-dark.svg` | app icon · 黑底白 mark＋橘中心點（社群大頭貼建議）|
| `gts-icon-light.svg` | app icon · 淺底鋼灰 mark＋橘中心點 |
| `*.png` | 對應的透明 PNG（相容/預覽用）|
| `preview-white.png` / `preview-dark.png` | 完整 lockup 在白底/深底的樣子 |
| `fonts/` | Geist SemiBold + Noto Sans TC 子集 |

## 符號建構規格
- 六角螺帽：`polygon` 描邊，stroke-width 6.5
- 同心圓：`circle` r=27，stroke-width 6.5
- 軸心橘點：`circle` r=10.5，fill `#f97316`
- 在 100×100 座標系中央（螺帽含邊約佔 4–96）
