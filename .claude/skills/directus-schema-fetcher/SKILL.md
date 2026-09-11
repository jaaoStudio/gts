---
name: Directus Schema Fetcher
description: 獲取最新的 Directus 資料庫結構 (Schema)。處理資料庫關聯、API 串接或 Vue 元件開發時必須優先執行。
---

# Directus Schema Fetcher

## 觸發時機 (Trigger Conditions)
當使用者的請求涉及以下情況時，請務必先執行此技能：
1. 詢問資料庫結構、資料表 (Collections) 或特定欄位 (Fields) 類型。
2. 開發或修改 `services/<domain>Service.js` 等 API 串接邏輯。
3. 撰寫需要對應後端資料欄位的 Vue 前端元件。

## 執行步驟 (Execution Steps)
1. 執行同目錄下的 `./fetch_schema.sh` 腳本。
2. 腳本會回傳最新的 Directus Schema (JSON 格式)，請將此結構載入你的記憶脈絡中。

## 嚴格守則 (Rules)
- **保持安靜：** 絕對不要把抓取到的冗長 JSON 原始碼印出來給使用者看。
- **精準應用：** 請利用抓取到的 Schema 資訊，精準回答使用者的問題，確保生成的 Vue 程式碼或 API 查詢過濾器 (Filters) 的欄位名稱、資料型別與關聯完全符合當下的資料庫狀態。

## 「某個角色能不能改這個欄位？」——permission 只是一半

⚠️ **回答這個問題必須查兩個地方，缺一個就會給出錯的答案。**

| 要查 | 端點 | 意義 |
|---|---|---|
| Permission | `/permissions?fields=collection,action,fields,policy.name` | API 層。決定「這個 policy 能不能透過 API 寫這個欄位」 |
| 欄位 meta | `/fields/<collection>/<field>` 的 `meta.readonly` | **UI 層。決定「後台介面能不能編輯」，對所有人生效——連 `admin_access: true` 也繞不過** |

2026-09-10 實際踩到：`orders.payment_note` 的 permission 是 `店務 → fields=['*']`、
而 `Administrator` 是 `admin_access: true`，看起來誰都改得動；但 `meta.readonly` 是
`true`，所以**實際上沒有任何人在後台改得動它**。只查 permission 就下結論，會寫出一份
「看起來完備、實際無法執行」的作業規則。

順帶兩個相關陷阱：

- **`admin_access: true` 只繞過 permission，不繞過 `meta.readonly`。** 兩者是不同層。
- **文件的敘述不等於實際設定。** 當時 `docs/proposals/訂購單.md` 寫「`orders` update
  主要用來改 `status`」，那是描述用途、不是欄位限制，卻讓人以為欄位被鎖住。
  **一律以 API 查到的為準**，文件只當線索。

查唯讀欄位的一行指令（`orders` 為例）：

```bash
set -a; . .claude/skills/directus-schema-fetcher/.env; set +a
curl -s -H "Authorization: Bearer $DIRECTUS_AI_TOKEN" \
  "https://core.gtxin.com.tw/fields/orders" | python3 -c "
import json,sys
for f in json.load(sys.stdin)['data']:
    m = f.get('meta') or {}
    if m.get('readonly'): print(f['field'])"
```

> 此 token 讀得到 `fields` / `permissions` / `policies` / `presets` / `flows` / `revisions`
> 與各 collection 的資料，但**讀不到 `directus_users` 與 `roles`（403）**——要查「某個人
> 掛哪個 policy」得自己登入後台看。