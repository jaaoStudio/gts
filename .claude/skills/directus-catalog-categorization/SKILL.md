---
name: Directus Catalog Categorization
description: Directus 商品分類的批次維運與重歸類手法。整批改分類、細分/合併分類、清理錯誤歸類、直接打 Directus REST API 做大量寫入時使用。
---

# Directus 商品分類批次維運

## 觸發時機
- 需要「整批」重新歸類商品、細分/合併/刪除分類。
- 懷疑分類歸錯（尤其「當初用關鍵字自動分、沒一個個分」）。
- 需要繞過前端、直接用 Directus REST API 做大量讀寫。

不確定 schema 先跑 `directus-schema-fetcher`；服務層慣例見 `directus-service-layer`。

## 資料模型現況（2026-07 起）
- 商品分類**只用 M2M** `categories`（junction `products_categories`：`id` / `products_id` / `categories_id`）。舊 M2O `category` 欄位全空、已棄用。
- 每個商品掛剛好 **2 筆：`[父分類, 子分類]`**（父父分類頁與子分類頁都能出現）。
- 前端主分類取「有 parent 的葉節點（子分類）」；breadcrumb 取最長路徑。
- 目前約 **56 個分類**。2026-07 大整理：668 筆商品重歸類 328 筆。新增子分類（手工具下
  `刀具/剪具/鋸具/板手類/起子類/套筒類`、電動配件下 `鑽尾類`(原鑽頭類改名, slug=drill-bits)
  `/開孔器·自由錐`、電動工具下 `氣動工具`），刪掉九個空分類。
- 「電動工具」大分類商品極少——此店本質是手工具／配件／耗材店。留在「雜項五金」的是真雜項
  （密碼鎖／磁鐵／延長線／LED燈泡／電池）；`測試的哆拉a夢`、`補差額專用` 不是商品。

### ⚠️ 統計一定要用 `countDistinct`，不能用 `count`

**「每商品掛 [父,子] 兩筆」的隱藏後果**：任何「同時用父與子 id 篩選」的查詢，JOIN 後
同一件商品會命中多列。Directus 的 `aggregate: { count: '*' }` 數的是 **JOIN 後的列數**，
不是商品數。

2026-08-13 實際踩到：十個根分類的商品總數**全被灌成剛好 2 倍**（工安防護 9→18、
手工具 189→377），還連帶算出永遠空白的幽靈分頁。

```js
// ❌ 錯：數 JOIN 後的列
aggregate: { count: '*' }
// ✅ 對：回傳形狀是 [{ countDistinct: { id: "9" } }]
aggregate: { countDistinct: 'id' }
```

葉節點分類與「不帶分類條件」的查詢只命中一列，本來就正確——**所以這個錯很久沒被發現**。
日後在這個 M2M 上再加任何統計都要留意同一個坑。

### 批次建立商品前必讀（2026-08 起）

- **`products.slug` 已改為自動產生，欄位設為 readonly**。Flow「商品 slug 自動產生」
  （`action` 型、`items.create` on `products`）會在建立後補上 `p-<數字>`，沿用既有 668 筆的格式。
  - **自己帶 slug 時不會被覆蓋**（Flow 判斷有值就原樣寫回），批次匯入可繼續自訂。
  - `meta.required` 已關閉（DB 本來就 nullable），`is_unique = true` 仍在，撞號會被 DB 擋下。
  - 要手動改某筆 slug，得先去 Data Model 取消 readonly。改 slug 會讓既有連結失效。
  - ⚠️ 該 Flow 原本寫成 `filter` 型並靠回傳值改 payload —— **在 Directus 11.5.1 無效**
    （實測無條件回傳固定值也不生效）。改用 `action` + `item-update` 兩段式才成功。
- **`products.stock` 欄位已刪除**（2026-08-03）。庫存只住在 `product_variants.stock`，
  且該欄為 REQUIRED，缺貨填 `0`、不能留空。
- 建立商品的必填：`name`、`description`、`image`（`slug` 已免填）。
  另外 `status` 預設 `draft`，不改成 `published` 不會上架。

## 直接打 API 的連線守則（踩過的坑）
連線：`https://core.gtxin.com.tw`。token 有**兩個位置、變數名不同**，別搞混：

| 位置 | 變數名 | 用途 |
|---|---|---|
| 專案根 `.env` | `DIRECTUS_AI_AGENT_TOKEN` | Python 批次腳本 |
| `.claude/skills/directus-schema-fetcher/.env` | `DIRECTUS_AI_TOKEN` | `fetch_schema.sh`、`setup-shopkeeper-role.sh` |

兩者皆被 gitignore。**只放非 `VITE_` 前綴的變數**——`VITE_` 會被打包進前端＝公開。

```python
import json, urllib.request
B = "https://core.gtxin.com.tw"
TOKEN = open("/path/to/.env").read().split("DIRECTUS_AI_AGENT_TOKEN=")[1].split("\n")[0].strip()
H = {"Authorization": f"Bearer {TOKEN}", "User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}
```

- **WAF 會擋非瀏覽器 UA** → 一定要帶 `User-Agent: Mozilla/5.0`（不帶會 403）。
- **`limit=-1` 會 403**（public/受限 role）；**單次 `limit=200` 也可能被靜默截斷** → **一律分頁** (`limit=100&page=N` 直到空陣列)。忘了分頁會讓 name→id 對照缺項、進而寫入 `parent=""` 噴 400。
- 讀 M2M 展開：`fields=categories.categories_id.id,categories.categories_id.name,categories.categories_id.parent`。

### M2M 覆寫分類（核心寫入格式）
把某商品分類覆寫成 `[父, 子]`：先抓「當前」junction id 再刪，才可重複執行、不殘留：

```python
live = get(f"/items/products/{pid}?fields=categories.id")           # 即時抓，勿用舊快照
old = [c["id"] for c in (live.get("categories") or [])]
body = {"categories": {"create": [{"categories_id": child_id}, {"categories_id": parent_id}],
                       "delete": old}}
api("PATCH", f"/items/products/{pid}", body)
```

### 建/改分類的坑
- 建分類：`POST /items/categories` body `{name, slug, parent:<父UUID>, status:"published"}`。
- **slug 有唯一約束**：若新分類 slug 撞到既有（尤其要被取代的舊分類），**改用「重新命名既有分類」而非刪了再建**（例：`鑽頭類` 直接改名 `鑽尾類`、沿用 slug `drill-bits`）。
- 刪分類：`DELETE /items/categories/<id>`，**務必先確認該分類商品數為 0**。刪除後立即再讀可能有讀取延遲，以隔一次的分頁查詢為準。
- 下架非商品（測試品/補差價品）：`PATCH` 商品 `status:"archived"`（前台只顯示 `published`）。

## 重歸類工作流程（可複用）
1. **先結構健檢，再語意複檢**：結構（每品[父,子]、父子一致）通常是乾淨的；真正的錯是**語意**（歸到結構合法但內容不符的分類），純規則抓不到。
2. **根因常是關鍵字誤比對**：例「膠柄」被當「黏著劑」、「拋光石英磚水泥鑽頭」被當「砂輪」、「起子機」被當手工具起子。整理時規則要**由具體到一般排序**、加**排除詞**（套/袋/架、起子機/無刷…），避免關鍵字互搶。
3. **按「目前分類」分組列出**，同組放一起，格格不入的一眼可見（最有效的人工複查法）。
4. **分層驗證**（成本/信心平衡）：規則分類器初判 → 強模型（Opus）自查全部、抓規則 bug 與個別誤判 → 對「連強模型都看不懂」的 cryptic 少數品項，派 **haiku 子代理上網查證**（回傳只列需修正的）。
5. **子代理有用量上限**：實測 6 個 haiku × 40 筆搜尋就撞爆 session 限額。**別想 668 筆全上網搜**；只搜真正不確定的（從垃圾桶分類搬出、名稱看不懂的）。
6. **安全寫回**：先 `--dry` → 寫 1 筆讀回驗證格式 → 全量跑（每筆 try/except、印進度）→ 收尾重新健檢（檢查 1父1子、無重複連結、舊分類已空）。**先備份**原始 `products.json` 供回滾。

## 分類樹備註
- 頂層分類夠用，別加頂層；問題在子分類肥瘦不均。肥的（≥40 筆、混多種購買意圖）才細分，空的合併/刪。
- 「電動工具」大分類商品極少 —— 此店本質是**手工具/配件/耗材**店。
- 「雜項五金」保留真雜項（密碼鎖/磁鐵/延長線/LED燈泡/電池）即可，別硬塞。

## `can_ship_cvs`：可超商寄送（2026-09 起）

`product_variants.can_ship_cvs`（boolean，預設 `false`、not null）決定一張訂購單能不能
選超商取貨付款——**任一品項未勾，整張單就不給選**（why: `docs/adr/0006` 第 5 條）。
建立當下 1,399 筆全部回填 `false`，等於功能預設關閉，要人工勾開。

### ⚠️ 不要用品名自動推斷

試過了，**精確度低到不能用**。用正則抓品名裡的長度數字（`>45cm` 就排除），52 件命中裡
絕大多數是誤判——因為那些數字是**量測長度，不是包裹尺寸**：

| 品名 | 抓到 | 實際 |
|---|---|---|
| LEO小型捲米尺 5.5米x25mm | 550cm | 尺帶 5.5 米，本體是個小盒子 |
| secco亮螢光色墨斗線40米細線 | 4000cm | 一捲線，比拳頭小 |
| 黑皮卡式膠扣S腰帶 5公分x110公分 | 110cm | 腰帶，捲起來很小 |
| 鷹嘴大彎鋸專用鋸片 SK5x1.5x480mm | 48cm | ← 只有這種才是真的 |

真正的檢查點在超商櫃台（店員拿量尺量），**建單 API 根本沒有材積欄位**。所以這個旗標
只能靠懂貨的人判斷，任何自動化都是在猜。

### 為了讓老闆自己勾，動過三個後台設定（2026-09-16）

`product_variants` 原本 `collection.meta.hidden = true`——**它根本不出現在側邊欄**，
點不進去就談不上批次編輯。三處都只影響 Directus 後台顯示，前台零影響：

| 對象 | 改了什麼 |
|---|---|
| collection `product_variants` | `hidden: false`、`display_template: "{{product_id.name}} — {{spec_name}}"` |
| field `product_id` | `hidden: false`、`readonly: true`（要看得到屬於哪件商品，但不該在這裡改掛載） |

要收回就把 `hidden` 改回 `true`。

### 老闆的批次勾選動線

`product_variants` 列表 → **Filter** 篩 `product_id → categories` → 表頭 checkbox 全選
→ **Edit**（批次編輯）→ 勾「可超商寄送」→ Save。`店務` policy 對 `product_variants`
有 update `['*']`，權限沒問題。

各主分類的規格筆數與風險（2026-09 清點）：

| 筆數 | 分類 | 判讀 |
|---:|---|---|
| 434 | 電動配件 | 幾乎全可寄（鑽尾、起子頭、鋸片、砂輪） |
| 363 | 手工具 | 多數可寄，長柄鎚／大板手／鋸具要挑掉 |
| 240 | 測量與畫線 | 多數可寄，**水平尺常見 60/90/120cm** |
| 133 | 工具收納 | 袋、腰帶、套鞘可；大型收納盒不行 |
| 103 | 其他五金 | 雜，逐項看 |
| 43 | 耗材與化工 | ⚠️ **見下** |
| 37 | 工安防護 | 全可寄 |
| 19 | 電動工具 | 多數可寄但偏重 |
| 15 | 五金掛扣 | 全可寄 |
| 12 | 園藝水材 | 接頭可，水管本身不行 |

⚠️ **耗材與化工整批維持 `false`。** 超商禁寄危險物品——黏著劑、清潔用品裡的酒精類、
噴罐、易燃液體，交貨便一律不收。**那跟尺寸無關，是另一條規則**，勾了會在櫃台被退件。

## 角色與權限（2026-08 起）

Directus 有三個非系統角色：`Administrator`、`customer`（前台註冊會員）、`AI_agnet`，
以及新增的 **`店務`** —— 給店內人員做日常商品維護。

- 建立/補齊用 `.claude/skills/directus-schema-fetcher/setup-shopkeeper-role.sh`（冪等，可重跑）。
- 該 policy `admin_access = false`：**改不了 schema、權限、系統設定**，這是它與 Administrator 的關鍵差別。
- 可寫：`products`（不含 delete，下架改 status）、`product_variants`、三個 junction、`directus_files`。
- 只讀：`categories`、`tags` —— 能掛既有分類/標籤，但**不能改分類樹**。新分類由管理者建
  （分類 slug 要有意義的英文，且分類樹＝網站導覽的資訊架構）。
- **Public 與 customer access 兩個 policy 都帶 `status=published` filter**，
  所以訪客與註冊會員都讀不到 draft 的商品與規格。

相關：`.claude/skills/directus-schema-fetcher`（查欄位能不能改：permission 只是一半，
另一半是 `meta.readonly`）。
