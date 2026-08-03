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

## 直接打 API 的連線守則（踩過的坑）
連線：`https://gts-core.jaao.tw`，token 在專案 `.env` 的 `DIRECTUS_AI_AGENT_TOKEN`（**只放非 VITE_ 前綴、被 gitignore 的變數**；VITE_ 會被打包進前端＝公開）。

```python
import json, urllib.request
B = "https://gts-core.jaao.tw"
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

相關記憶：`category-taxonomy`。
