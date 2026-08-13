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