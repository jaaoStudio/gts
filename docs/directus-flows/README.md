# Directus flow 腳本的鏡像

這裡的 `.js` 是 **Directus flow 裡 `exec` operation 的程式碼副本**，放進版控只為了
兩件事：改動看得到 diff、以及在本機用 node 餵假資料跑過再貼上去。

⚠️ **這裡不是真相來源，線上那份才是。** 改完必須自己貼回 Directus，沒有任何自動同步。
兩邊不同步不會有任何錯誤訊息。

| 檔案 | Flow | Operation |
|---|---|---|
| `calc.js` | 訂購單存檔後自動計算（`items.update` on `orders`） | `calc` |

## calc.js

算 `orders.shipping_fee` 與 `confirmed_total`——**那才是真正進應付金額的值**，前台
`utils/orderTotals.js` 算的是預估（見 `docs/adr/0003`）。

⚠️ 裡面的 `CVS_TIERS` 與前台 `CVS_IBON` 是同一份資料的兩份副本，改費率兩邊都要動
（見 `docs/adr/0006` 規則 2）。

本機驗證：

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
