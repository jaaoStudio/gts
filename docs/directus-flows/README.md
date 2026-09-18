# Directus flow 腳本的鏡像

這裡的 `.js` 是 **Directus flow 裡 `exec` operation 的程式碼副本**，放進版控只為了
兩件事：改動看得到 diff、以及在本機用 node 餵假資料跑過再貼上去。

⚠️ **這裡不是真相來源，線上那份才是。** 改完必須自己貼回 Directus，沒有任何自動同步。
兩邊不同步不會有任何錯誤訊息。

| 檔案 | Flow | Operation |
|---|---|---|
| `calc.js` | 訂購單存檔後自動計算（`items.update` on `orders`） | `calc` |
| `cust_build.js` | 訂購單存檔後自動計算（`items.update` on `orders`） | `cust_build` |
| `ack_build.js` | 訂購單送出後處理（`items.create` on `orders`） | `ack_build` |
| `compute2.js` | 訂購單送出後處理（`items.create` on `orders`） | `compute2` |
| `pick_to.js` | 訂購單送出後處理（`items.create` on `orders`） | `pick_to` |

## ⚠️ 進得了信件 body 的客戶輸入一律要跳脫

`notify_mail`（寄給老闆的新單通知）的 `type` 是 `markdown`，Directus 會把 body 算繪成
HTML 再寄出（`marked`，`gfm` 開著）。`compute2` 的 `note` / `contact` / `item_summary`
與 `pick_to` 的 `customer_label_md` 全部來自客人自己填的欄位，**不跳脫的話，備註欄一個
`[看起來正常的字](https://釣魚站)` 就會變成一封從本站網域寄出、通過 SPF/DKIM 的釣魚信**，
收件人是老闆。

**四層缺一層都不算擋住**，以 marked 18 逐條實測過：

| 要擋的 | 靠什麼 | 漏掉會怎樣 |
|---|---|---|
| `<img src=x onerror=1>` | HTML 實體 | 原始標籤照進信裡 |
| `[字](網址)` | 跳脫 `[` `]` `(` `)` | 變成可點連結 |
| 裸 `https://…`、`www.…` | **跳脫 `:` 與 `.`** | gfm autolink 照樣變連結 |
| `=====`、`- ` 開頭 | 換行收成 `<br>` 或空白 | 偽造標題與清單，包出像官方通知的版面 |

⚠️ 第三層最容易漏，而且**漏了會讓前兩層一起失效**：`[字](https://evil.tw)` 的中括號
跳脫之後，裡面那段裸網址仍然被 autolink 成可點連結，等於只換掉字面、管道原封不動。
這個修補的第一版就是這樣漏的（PR #32 的 review 抓到）。

跳脫 `.` 與 `:` 不會讓正常文字長出反斜線 —— marked 會還原，實測
「0912-345-678 / No.5 3F / 14:30」算繪後乾淨。

跳脫函式在 `compute2.js` 與 `pick_to.js` 各有一份（沙箱裡 import 不到彼此），**改一邊
要改兩邊**。寄給客人自己的 `ack_build` / `cust_build` 不在此列——那兩封的內容只有
他自己讀得到。

`{{ }}` 是單次代換、代換進去的值不會被重新掃描，所以沒有 template injection 的面向；
要擋的只有算繪成 HTML 這一段。

## calc.js

算 `orders.shipping_fee` 與 `confirmed_total`——**那才是真正進應付金額的值**，前台
`utils/orderTotals.js` 算的是預估（見 `docs/adr/0003`）。

⚠️ 裡面的 `CVS_TIERS` 與前台 `CVS_IBON` 是同一份資料的兩份副本，改費率兩邊都要動
（見 `docs/adr/0006` 規則 2）。

本機驗證（**要先有這個目錄裡的 `package.json`**：根目錄是 `"type": "module"`，
少了它 node 會把這裡的 `.js` 當 ESM 載入，第一行 `module.exports` 就
`ReferenceError: module is not defined`）：

```js
// t.mjs
import { createRequire } from 'module'
const calc = createRequire(import.meta.url)('./calc.js')
const settings = [{ default_shipping_fee: 140, free_shipping_threshold: 2000 }]
console.log(await calc({
  read_items: [{ unit_price: 45, confirmed_price: null, quantity: 1 }],
  read_settings: settings,
  read_order: [{ id: 1, status: 'quoted', shipping_fee: null, discount: 0,
                 delivery_method: 'cvs_cod', paid_at: null, shipped_at: null }],
}))  // → { shipping_fee: 60, confirmed_total: 105 }
```
