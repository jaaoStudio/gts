---
name: mobile-debugging
description: 手機專屬 bug（iOS Safari/Chrome 才會壞）的除錯方法：先分診 runtime 還是 navigation/server，再選手法。使用者說「手機才會壞」而你無法直接觀察時使用。
---

# 手機專屬 bug：先分診，再選手法

**不要靠靜態讀碼推測，要把真實狀態量出來。** 這類 bug 的共同特徵是「你看不到現場」，
而猜測的成本極高——`HeroProductRing` 轉盤凍結那次**猜了四輪全錯**（先怪 blur 效能、
再怪 iOS `touch-action` 消歧、再怪 Draggable 失同步）。量到數據後一次定案。

## 第一步：分診

| 症狀 | 類別 | 手法 |
|---|---|---|
| 動畫凍結、手勢失效、元件狀態不對 | **元件 runtime** | 建下面的 Vite log 管線 |
| 跳轉卡住、cookie 沒生效、登入斷在中途 | **navigation / server 回應層** | **先用 `curl` 帶 iPhone UA 打線上端點** |

第二類**不要建管線**——真實 headers 幾秒就到手，比建管線快得多：

```bash
curl -D - -o /dev/null -s \
  -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' \
  https://<端點>
```

2026-07-29 修「SSO 卡在 CF Worker 過場頁」就是這樣定案的：一眼看到 `Set-Cookie` 缺
`Secure`、`Max-Age=10`，再對照原始碼就確定根因是 `location.replace(同一 URL)` 被 WebKit
當成重導迴圈取消。細節見 `docs/adr/0001-google-sso-登入流程.md`。

## Vite log 管線（runtime 類）

本專案驗證有效的做法（2026-07-29 建立）：

1. 在 `vite.config.js` 加 **dev-only** plugin（`apply: 'serve'`），用
   `server.middlewares.use('/__log', ...)` 接收 POST。
2. **關鍵：必須 `appendFileSync` 寫進固定檔案**（如 `/tmp/ring-debug.log`）。
   只用 `console.log` **沒用**——背景執行的 dev server stdout 會被緩衝，讀不到。
3. 元件內用 `navigator.sendBeacon('/__log', JSON.stringify(payload))` 回報，
   高頻事件加節流（~200ms）。
4. **dev server 要由 AI 自己用 `run_in_background` 啟動**，手機再連過來。
   使用者自己跑的 server，AI 讀不到輸出。
5. 查完務必把 plugin、log 呼叫、HUD **全部移除再 commit**。

### 回報欄位要能互斥地區分假設

這是管線有沒有用的關鍵。轉盤那次同時記錄三者：

| 欄位 | 分辨的假設 |
|---|---|
| GSAP 內部值（`gsap.getProperty`） | 「沒算對」 |
| inline style（`el.style.transform`） | 「沒寫入」 |
| computed style（`getComputedStyle`） | 「被覆蓋」 |

結果是 `rot`／`gx0` 正常變化、但 `mtx`（實際 CSS transform）永久凍結 → 根因是 NaN 寫進
transform（見 `.claude/skills/gsap-animation-conventions`）。**只記其中一個都定不了案。**

## 「手機才會壞」不等於「iOS 擋了什麼」

第一直覺常是跨網域／隱私設定，但實際根因往往是 **WebKit 對某個 API 的行為與 Chrome 不同**
（navigation 節流、自動播放、儲存期限）。

**修法要設計成不依賴哪一方猜對。** 上面那個 SSO case 最後是把狀態從 cookie 換成 URL 旗標
——無論是「cookie 被擋」還是「navigation 被取消」都能通。

## 相關

- `.claude/skills/gsap-animation-conventions` — 動畫類的已知雷與 headless 驗證
- `.claude/skills/routing-and-auth` — 登入／SSO 的已知雷
- `docs/adr/0001-google-sso-登入流程.md`
