# gts 前端 — CI/CD + 藍綠部署

## 架構

```
push main ──▶ GitHub Actions
                ├─ test：npm ci → lint → test（紅了就不部署）
                ├─ freshness：這個 commit 還值得部署嗎？
                │    └─ 已過期 ▶ 整個 build-and-deploy job skip（不是 failed）
                ├─ build 前端 image（Vite→nginx，VITE 變數用 build args 烘進去）
                ├─ push 到 Harbor（:{sha} + :latest）
                ├─ 切流量前再檢查一次 freshness（擋 re-run 繞過上面那道的快取結果）
                └─ SSH 進 VM ▶ ~/gts-web/deploy.sh {sha}
                                   ├─ 判斷目前 slot（lib-slot.sh）
                                   ├─ 同版就跳過（避免吃掉回滾目標）
                                   ├─ 部署到閒置 slot（blue/green）
                                   ├─ 等 healthcheck 通過
                                   └─ 改 Traefik dynamic 檔切流量（秒切、可秒回滾）

外部流量：Cloudflare ─▶ Traefik(:443, DNS-01 憑證) ─▶ 當前 slot 的 nginx ─▶ /api 反代 directus_app:8055
```

> `concurrency: deploy-main` 只保證不同時跑，**不保證版本順序**（佇列依進入等待的時間，
> 不是 commit 順序）。「最新 commit 最後生效」靠的是上面那兩道 freshness 檢查。

- blue / green 兩個 slot 常駐，Traefik 的 `service: gts-frontend-<color>@docker` 決定流量。
- rollback = 把該行切回另一色（前一版還在跑，秒切）。

---

## `.env` 的定位：它記的是「打算跑的」，不是「實際在跑的」

**要判斷某個 slot 現在跑哪一版，一律看容器實際的 image，不要看 `.env`。**

```bash
docker inspect gts_web_store_blue gts_web_store_green --format '{{.Name}} {{.Config.Image}}'
```

原因在流程順序上：`deploy.sh` 必須**先**把 tag 寫進 `.env`，`docker compose` 才解析得出要拉哪顆 image。所以只要部署在那之後失敗（pull 失敗、healthcheck 逾時、image 壞掉），`.env` 就會留下一個**從沒跑起來的 tag**：

```
初始：blue 跑 A、green 跑 B，流量在 blue
部署 C：.env 先寫入 GREEN_TAG=C → pull 失敗、部署中止
結果：.env 說 GREEN_TAG=C，但 green 實際仍跑 B
```

此時若回滾到 green，光看 `.env` 會以為線上是 C——而 C 從來沒上線過。
（2026-09-10 修好：`rollback.sh` 與 `deploy.sh` 的同版守衛都改讀容器實際 image，
見 `lib-slot.sh` 的 `slot_image_tag()`。）

| 欄位 | 意義 | 可信度 |
|---|---|---|
| `BLUE_TAG` / `GREEN_TAG` | compose 要拉的 image tag（**部署意圖**） | 部署成功時才等於現實 |
| `docker inspect` 的 `.Config.Image` | 容器實際跑的 image | **唯一真相** |

> `.env` 原本還有一個 `ACTIVE_TAG` 記「目前對外的版本」。**已移除**——沒有任何程式讀它，
> 而它在部署失敗或回滾後就會與現實脫節，於是唯一的作用是騙看到它的人。
> 快取一個會過期的答案，只會製造「快取與現實不符」那一整類 bug；現算就沒有這個問題。

要問「現在線上是哪一版」就呼叫 `active_tag`（它現算，不讀任何欄位）：

```bash
cd ~/gts-web && . ./lib-slot.sh
echo "對外：$(current_slot) ($(active_tag))"
echo "閒置：$(other_slot "$(current_slot)") ($(slot_image_tag "$(other_slot "$(current_slot)")"))"
```

---

## 一次性設定（新 VM）

### 1. 前置：Docker + 你現有的 Traefik
沿用 `/opt/traefik`（v3、Cloudflare DNS-01、external network `traefik-net`）。確認：
```bash
docker network ls | grep traefik-net      # 不存在就 docker network create traefik-net
```

### 2. directus_app 要在 traefik-net 上
blue/green 的 nginx 靠容器名 `directus_app:8055` 反代 `/api`，所以 Directus 必須跟它們同網路：
```bash
docker network connect traefik-net directus_app   # 若還沒在上面
```
（或在 Directus 自己的 compose 裡把 traefik-net 加進去。）

### 3. 放置本目錄檔案
把本 `deploy/` 內容放到 VM：
```bash
mkdir -p ~/gts-web
cp docker-compose.yml deploy.sh rollback.sh lib-slot.sh .env.example ~/gts-web/
cd ~/gts-web
cp .env.example .env && vi .env          # 填 REMOTE_REGISTRY_IP，其餘先留 latest
chmod +x deploy.sh rollback.sh lib-slot.sh

# Traefik router
sudo cp traefik-dynamic/gts.yml /opt/traefik/dynamic/gts.yml
```

> ⚠️ **`lib-slot.sh` 一定要一起放。** `deploy.sh` 與 `rollback.sh` 都 source 它取得
> slot 判斷；少了它兩支都會因 source 失敗而中止（刻意的：寧可不部署，也不要在
> 判不出 slot 的情況下亂寫 Traefik 設定）。
>
> 之後修改這三支也一樣——`deploy/**` 在 workflow 的 `paths-ignore` 內，**不會**經 CI
> 自動更新，必須手動同步：
> ```bash
> scp deploy/{deploy.sh,rollback.sh,lib-slot.sh} <vm>:~/gts-web/
> ```
>
> ✅ **忘記同步不會靜默過去**（2026-09-11 起）：`deploy.yml` 在切流量前會比對 repo 與
> VM 三支腳本的 md5，不一致就紅並印出兩邊 hash。紅在**切流量之前**，正式站不受影響，
> 照錯誤訊息裡的 `scp` 同步完重跑即可。

### 4. DNS
Cloudflare 加 `gtxin.com.tw` / `core.gtxin.com.tw` A record 指向新 VM（DNS-01 憑證，橘雲/灰雲都可）。

### 5. 登入 Harbor + 首次啟動兩個 slot
```bash
docker login <REMOTE_REGISTRY_IP>        # 用 boss-timing 那組帳密
cd ~/gts-web
docker compose --env-file .env up -d     # blue + green 都起來
docker compose ps                        # 兩個都 healthy
```
確認 https://gtxin.com.tw 正常後即完成。之後 push main 就會自動滾動更新。

### 6. GitHub Secrets（本 repo → Settings → Secrets and variables → Actions）
| Secret | 說明 |
|---|---|
| `HARBOR_URL` / `HARBOR_USER` / `HARBOR_PASSWORD` | 沿用 boss-timing 那組 Harbor |
| `VM_HOST` / `VM_USER` / `VM_SSH_KEY` | **新 VM** 的 SSH（key 用 private key 全文） |
| `VITE_DIRECTUS_PUBLIC_URL` | `https://core.gtxin.com.tw`（SSO 導向用的絕對網址） |

> `VITE_DIRECTUS_URL` 固定 `/api`（已寫死在 workflow build-args），不需 secret。

### 7. 架構注意
- 若新 VM 是 ARM：把 `.github/workflows/deploy.yml` 的 `platforms:` 改成 `linux/arm64`（VM 上 `uname -m` 確認）。
- Directus 端記得 `AUTH_GOOGLE_MODE=session` + cookie 三項 + `CACHE_AUTO_PURGE=true`（見對話紀錄）。

---

## 日常操作
- **部署**：merge 到 `main` → 自動跑。
- **回滾**：GitHub → Actions → **Rollback** → Run；或 VM 上 `~/gts-web/rollback.sh`。
  - ⚠️ **按之前先確認閒置 slot 跑的是你要退回的版本**（看 `.Config.Image`，不是 `.env`）。
- **看目前哪色**：`grep service /opt/traefik/dynamic/gts.yml`
  - 該檔有**兩處** `gts-frontend-*`（正式 router 與舊網域轉址 router），兩處應一致。
    腳本用 `sort -u` 收重複；若不一致會直接報錯而不是猜——曾經因為沒處理這點，
    slot 判斷永遠失敗、每次都部署到 live slot，藍綠與回滾同時失效三週。
- **看目前跑哪版**：見上方「`.env` 的定位」——用 `docker inspect`，不要用 `.env`。
- **確認藍綠真的在交替**（部署類失效幾乎都是靜默的，Actions 一路綠燈）：
  ```bash
  gh run list --workflow deploy.yml --limit 6 --json databaseId --jq '.[].databaseId' \
    | xargs -I{} sh -c 'gh run view {} --log 2>/dev/null | grep -m1 "▶ 目前:"'
  ```
  正常會看到 `blue → green → blue` 交替；連續同色代表 slot 判斷壞了。

> 更完整的**線上實際情況**（版本、流量在哪個 slot、哪些回滾層還活著）、除錯手法與踩過的雷，
> 見 `.claude/skills/deploy-ops/SKILL.md`。本檔只負責「新機從零裝起來」。
>
> ⚠️ **回滾只剩兩層可用**（2026-09-10 實機確認）：`rollback.sh` 的 blue↔green 切換，
> 以及退回 `nginx_proxy_manager`（降級，設定是換 gtxin 網域之前的）。
> 舊文件寫的「切回 `gts_store_frontend`」那層**已失效**，該容器已不存在。
