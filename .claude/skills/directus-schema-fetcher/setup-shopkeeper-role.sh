#!/bin/bash
# ============================================================================
# 建立 Directus「店務」角色（給店內人員做日常商品維護用）
#
# 用法：bash .claude/skills/directus-schema-fetcher/setup-shopkeeper-role.sh
#
# 特性：
#   - 冪等：已存在的 policy / role / 綁定 / 權限一律跳過，可安全重跑
#   - 只新增，不修改也不刪除任何既有角色或權限
#   - 不動任何使用者的角色歸屬——建立完成後要不要把人轉過去，由你決定時機
#
# 註：查詢一律「抓回清單後在本地比對」，不把條件塞進 URL query，
#     以免中文名稱未編碼、或 filter[...] 的中括號被 shell/curl 處理掉。
# ============================================================================
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
source "$DIR/.env"
BASE="https://gts-core.jaao.tw"
AUTH="Authorization: Bearer $DIRECTUS_AI_TOKEN"
JSON="Content-Type: application/json"
NAME="店務"

api() { curl -sSg -m 30 -H "$AUTH" -H "$JSON" "$@"; }

# 從 stdin 的 {"data":[...]} 找出 name 等於 $1 的那筆的 id，找不到印空字串
find_by_name() {
  python3 -c '
import sys, json
target = sys.argv[1]
for row in (json.load(sys.stdin).get("data") or []):
    if row.get("name") == target:
        print(row["id"]); break
' "$1"
}

echo "▶ 連線檢查"
if api "$BASE/server/ping" | grep -q pong; then echo "  OK"; else echo "  ✗ 連不到 Directus"; exit 1; fi

# ---------------------------------------------------------------- policy ----
echo "▶ Policy「$NAME」"
POLICY=$(api "$BASE/policies?limit=-1&fields=id,name" | find_by_name "$NAME")
if [ -n "$POLICY" ]; then
  echo "  已存在，沿用：$POLICY"
else
  POLICY=$(api -X POST "$BASE/policies" -d '{
    "name": "店務",
    "icon": "inventory_2",
    "description": "日常商品維護：新增/編輯商品與規格、上傳圖片、掛既有分類與標籤。不可改分類樹、不可動會員資料與系統設定。",
    "app_access": true,
    "admin_access": false,
    "enforce_tfa": false
  }' | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')
  echo "  已建立：$POLICY"
fi

# ------------------------------------------------------------------ role ----
echo "▶ Role「$NAME」"
ROLE=$(api "$BASE/roles?limit=-1&fields=id,name" | find_by_name "$NAME")
if [ -n "$ROLE" ]; then
  echo "  已存在，沿用：$ROLE"
else
  ROLE=$(api -X POST "$BASE/roles" -d '{
    "name": "店務",
    "icon": "inventory_2",
    "description": "店內日常商品維護人員。"
  }' | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["id"])')
  echo "  已建立：$ROLE"
fi

# ---------------------------------------------------------------- access ----
echo "▶ 綁定 Role ← Policy"
BOUND=$(api "$BASE/access?limit=-1&fields=id,role,policy" | python3 -c '
import sys, json
role, policy = sys.argv[1], sys.argv[2]
for row in (json.load(sys.stdin).get("data") or []):
    if row.get("role") == role and row.get("policy") == policy:
        print(row["id"]); break
' "$ROLE" "$POLICY")
if [ -n "$BOUND" ]; then
  echo "  已綁定，略過"
else
  api -X POST "$BASE/access" -d "{\"role\":\"$ROLE\",\"policy\":\"$POLICY\",\"sort\":1}" >/dev/null
  echo "  已綁定"
fi

# ----------------------------------------------------------- permissions ----
# 格式：collection:action1,action2,...
GRANTS=(
  "products:create,read,update"                 # 不給 delete：要下架改 status 就好
  "product_variants:create,read,update,delete"  # 規格是商品的一部分，可增可刪
  "products_categories:create,read,delete"      # junction：掛分類
  "products_tags:create,read,delete"            # junction：掛標籤
  "products_files:create,read,delete"           # junction：商品相簿
  "categories:read"                             # 只讀：可選既有分類，不可改分類樹
  "tags:read"                                   # 只讀：可選既有標籤，不可新增
  "directus_files:create,read,update"           # 上傳商品圖
  "directus_folders:read"                       # 檔案庫資料夾瀏覽
)

echo "▶ 權限"
# 先把這個 policy 現有的權限抓回來，本地比對，避免逐項打 API
EXISTING=$(api "$BASE/permissions?limit=-1&fields=policy,collection,action" | python3 -c '
import sys, json
policy = sys.argv[1]
for row in (json.load(sys.stdin).get("data") or []):
    if row.get("policy") == policy:
        print("{}:{}".format(row.get("collection"), row.get("action")))
' "$POLICY")

for g in "${GRANTS[@]}"; do
  COLL="${g%%:*}"
  IFS=',' read -ra ACTIONS <<< "${g#*:}"
  for ACT in "${ACTIONS[@]}"; do
    if printf '%s\n' "$EXISTING" | grep -qx "$COLL:$ACT"; then
      printf "  = %-22s %-7s (已存在)\n" "$COLL" "$ACT"
    else
      api -X POST "$BASE/permissions" -d "{
        \"policy\": \"$POLICY\",
        \"collection\": \"$COLL\",
        \"action\": \"$ACT\",
        \"permissions\": {},
        \"validation\": {},
        \"fields\": [\"*\"]
      }" >/dev/null
      printf "  + %-22s %-7s\n" "$COLL" "$ACT"
    fi
  done
done

# --------------------------------------------------------------- summary ----
cat <<EOF

────────────────────────────────────────────────────────────
完成。role_id = $ROLE

刻意「沒有」做的事：沒有更動任何使用者的角色歸屬。
把人轉過去會立刻改變他的權限，所以留給你決定時機。

要把某個帳號轉為店務時（換掉 <USER_ID>）：

  curl -sS -X PATCH "$BASE/users/<USER_ID>" \\
    -H "Authorization: Bearer \$DIRECTUS_AI_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"role":"$ROLE"}'

建議順序：先自己用店務帳號登入 $BASE 試一輪
（新增商品 → 加規格 → 掛分類 → 上傳圖 → 改 status 上架），
確認流程順暢，再把日常使用的帳號轉過去。
────────────────────────────────────────────────────────────
EOF
