---
name: deploy-ops
description: >-
  GTS storefront 正式站的部署 / 回滾 / 線上除錯 runbook(Hetzner VM + Traefik 藍綠部署)。
  當任務涉及:部署上線、rollback、除錯線上站台、動 Traefik / TLS 憑證、連進正式 VM、
  CI/CD 或 GitHub Actions 部署、藍綠 slot、harbor image 時使用。
---

# GTS 正式站部署維運 runbook

> 一次性「新機安裝」步驟看 `deploy/README.md`(正典)。本 skill 記**目前線上實際情況 + 日常操作 + 回滾 + 踩過的雷**。
>
> 「線上實際情況」= 正式機當下真實的狀態(版本、流量在哪、哪些容器還活著),不是設計意圖也不是歷史快照。這類事實會隨時間變,**斷言前先實機驗證**——下面每一項都標了最後驗證日期。
>
> 日期基準:2026-07-29 建立。最後實機驗證:**2026-09-10**(藍綠 slot 判斷修復 + 部署過期檢查;同時發現第 2 層回滾已失效、憑證到期日與舊記錄不符)。

## 線上架構(2026-09-10 實機驗證)

```
Cloudflare(橘雲) ─▶ Traefik(:443, DNS-01 憑證 cf) ─┬─ gtxin.com.tw ─▶ gts-frontend-<當前 slot>@docker
  VM: 46.225.53.14                                   └─ core.gtxin.com.tw ─▶ directus_app:8055(file router)
  (ssh hetzner, key ~/.ssh/hetzner)
```

⚠️ 上圖刻意不寫死顏色。**流量所在的 slot 每次部署都會換**,別把某一色當常態(這份文件先前寫死 `blue`,而實際已經是 `green`)。要問就跑:

```bash
ssh hetzner 'cd ~/gts-web && . ./lib-slot.sh && current_slot /opt/traefik/dynamic/gts.yml'
```

- **反向代理**:Traefik **v3.7.9**(codename langres),設定在 VM `/opt/traefik/`(檔案式:`traefik.yml` 靜態 + `dynamic/gts.yml` + `acme.json` + `.env` 放 `CF_DNS_API_TOKEN`)。憑證 Cloudflare DNS-01,resolver 名 `cf`。
- **Docker**:**29.6.2**(這個大版本會卡舊 Traefik 的 docker provider,見雷區 1)。
- **前端**:藍綠雙 slot `gts_web_store_blue` / `gts_web_store_green`(image `harbor.jaao.tw/gts/gts_web_store:<tag>`),同時常駐,`dynamic/gts.yml` 的 `service: gts-frontend-<color>@docker` 那行決定流量。
- **後端**:`directus_app`(**directus/directus:11.5.1**)+ `directus_db`(**postgres:15-alpine**)+ `directus_cache`(**redis:6-alpine**)。
- 所有服務容器都在 external network **`traefik-net`**。前端 nginx 靠 `directus_app:8055` 反代 `/api`。
- **舊網域 `jaao.tw` 已棄用**,`dynamic/gts.yml` 內僅保留 301 轉址
  (`gts.jaao.tw`/`jaao.tw` → `gtxin.com.tw`、`gts-core.jaao.tw` → `core.gtxin.com.tw`)。
  ⚠️ 憑證實際到期 **2026-10-27**(2026-09-10 實測 `openssl s_client` 的 `notAfter`;
  本文件先前寫 2026-11-19,是錯的)。現行 Cloudflare token **已不含 `jaao.tw` zone**、無法續簽,
  到期後轉址失效,屆時直接刪掉那兩條 router 即可。查法:
  ```bash
  ssh hetzner 'echo | openssl s_client -connect 127.0.0.1:443 -servername jaao.tw 2>/dev/null | openssl x509 -noout -enddate'
  ```
  ⚠️ 新舊網域**必須拆成不同 router**:寫在同一條 rule 會讓 Traefik 去要一張同時涵蓋兩者的
  憑證而失敗,連帶整個 router 不可用。
- **郵件**:Directus 走 Resend SMTP relay(`smtp.resend.com:587`,帳號固定字串 `resend`,
  密碼為 API key)。VM 對外 **port 25 被 Hetzner 封鎖**,只能用 relay,不要考慮自架 MTA。

## 部署流程(自動)

**merge / push 到 `main`** → GitHub Actions(`.github/workflows/deploy.yml`):
1. `test` job:`npm ci` → `npm run lint` → `npm test`。紅了就不會部署(擋直接 push 到 main 與 merge 後才浮現的問題)
2. `freshness` job:跑 `.github/scripts/deploy-freshness.sh`,確認這個 commit 還值得部署;過期就把 build-and-deploy 整個 job **skip**(顯示 skipped 不是 failed)
3. build 前端 image(build-args 烘 `VITE_DIRECTUS_URL=/api`、`VITE_DIRECTUS_PUBLIC_URL`)
4. push `harbor.jaao.tw/gts/gts_web_store:{sha}` + `:latest`
5. **切流量前再跑一次 freshness 檢查**(擋「Re-run failed jobs」繞過第 2 步的快取結果)
6. SSH(部署 key)進 VM 跑 `~/gts-web/deploy.sh {sha}`:部署到**閒置** slot → 等 healthcheck healthy → 改 `gts.yml` 切流量(Traefik file provider 自動 reload,秒切)

**`concurrency: deploy-main` 只給互斥,不保證版本順序**——佇列是 FIFO 依「進入等待的時間」,不是 commit 順序,重跑舊 commit 也照樣排得進來。「最新的 commit 最後生效」靠的是 freshness 檢查,不是 concurrency。

> workflow `paths-ignore` 排除 `**.md`/`deploy/**` 等;**改 `deploy/` 下腳本不會觸發 build,需手動 scp 同步到 VM `~/gts-web/`**:
>
> ```bash
> scp deploy/{deploy.sh,rollback.sh,lib-slot.sh} hetzner:~/gts-web/
> ```
>
> **三支要一起放**——少了 `lib-slot.sh`,另兩支會因 source 失敗而中止(刻意的:寧可不部署,也不要判不出 slot 就亂寫)。
> `deploy-freshness.sh` 在 `.github/scripts/` 底下、跑在 runner 上,不需要同步到 VM。

## 日常操作(在本機跑,`ssh hetzner` 進 VM)

```bash
# 目前流量在哪個 slot
ssh hetzner 'grep "service: gts-frontend-" /opt/traefik/dynamic/gts.yml'
# 各容器健康
ssh hetzner 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "gts_web_store|traefik|directus"'
# Traefik log / 憑證
ssh hetzner 'docker logs --tail 50 traefik'
# 三站健康(繞過 Cloudflare,直測 origin)
for h in gtxin.com.tw core.gtxin.com.tw; do
  ssh hetzner "curl -sk -o /dev/null -w '$h %{http_code}\n' --resolve $h:443:127.0.0.1 https://$h/"; done
```

### 確認藍綠機制真的在運作(不要只看 Actions 綠燈)

上面雷區 0 那個 bug 三週沒被發現,就是因為每次部署都是綠燈。**部署類的失效幾乎都是靜默的**,要驗就看實際狀態:

```bash
ssh hetzner 'cd ~/gts-web
  echo "--- 流量 slot(兩行應一致) ---"; grep "service: gts-frontend-" /opt/traefik/dynamic/gts.yml
  echo "--- 容器實際跑的 image(真相) ---"
  for s in blue green; do printf "%-6s %s\n" "$s" "$(docker inspect gts_web_store_$s --format "{{.Config.Image}} {{.State.Status}} {{.State.Health.Status}}")"; done
  echo "--- .env(僅參考,見下方警告) ---"; grep -E "^(BLUE|GREEN|ACTIVE)_TAG=" .env'
```

⚠️ **`.env` 的 `*_TAG` 是「打算跑的」不是「實際在跑的」。** `deploy.sh` 必須先把 tag 寫進 `.env`,compose 才解析得出 image,所以部署只要在 pull／up 之後失敗,`.env` 就會留下一個從沒跑起來的 tag。**要判斷版本一律看 `docker inspect` 的 `.Config.Image`。**

判準要看情況,沒有單一通則:

| 狀態 | 該看到什麼 |
|---|---|
| **剛成功部署、之後沒回滾** | 兩個 slot 都 `healthy`;live 的 uptime 較短、image 等於最後一次部署的 commit;閒置的是前一版 |
| **剛回滾之後** | live 的 uptime **反而較長**(回滾目標的容器本來就比較舊),image 是**回滾目標的版本**——不是最後一次部署的 commit。這是正常的,不要當成異常 |
| **很久沒部署** | 兩個 slot uptime 都很長。之後成功部署一次,閒置那個 uptime 依然很長——**也是正常的**,不能因此斷言失效 |

所以「閒置 slot uptime 很舊」**單獨不足以判定藍綠失效**。真正可靠的訊號是**連續幾次部署有沒有交替 slot**:

```bash
# 近幾次部署各自打進哪個 slot（看 deploy.sh 的第一行輸出）
gh run list --workflow deploy.yml --limit 6 --json databaseId --jq '.[].databaseId' \
  | xargs -I{} sh -c 'gh run view {} --log 2>/dev/null | grep -m1 "▶ 目前:"'
```

- 正常:`blue → green → blue → green` 交替
- **失效:`blue → blue → blue`**(雷區 0 那三週的實況)

也可以直接用腳本自己的判斷來問(只讀,不改任何狀態):

```bash
ssh hetzner 'cd ~/gts-web && . ./lib-slot.sh
  C=$(current_slot /opt/traefik/dynamic/gts.yml)
  echo "current=$C ($(slot_image_tag "$C"))  next=$(other_slot "$C") ($(slot_image_tag "$(other_slot "$C")"))"'
```

## 回滾(三層,由輕到重)

| 層 | 情境 | 動作 | 2026-09-10 狀態 |
|---|---|---|---|
| 1 | 新版前端有問題(同架構) | `ssh hetzner '~/gts-web/rollback.sh'`(blue↔green 秒切回前一版) | ✅ **可用**(當日實測切換成功) |
| 2 | ~~退回舊單容器~~ | ~~`cp gts.yml.phase1.bak gts.yml`~~ | ❌ **已失效** |
| 3 | Traefik 本身有問題,退回舊 NPM 代理 | `ssh hetzner 'docker stop traefik && docker start nginx_proxy_manager'` | ⚠️ **降級**,見下 |

⚠️ **第 2 層已經不能用了。** `gts.yml.phase1.bak` 還在 `/opt/traefik/dynamic/`,但它指向的 **`gts_store_frontend` 容器已經不存在**(2026-09-10 `docker ps -a` 確認,連 exited 的都沒有)。照著它做會把 Traefik 指到一個不存在的後端 → **站直接掛**,比原本的問題更糟。要嘛把那個 `.bak` 刪掉,要嘛就記住只剩第 1、3 層。

⚠️ **第 3 層是降級狀態。** `nginx_proxy_manager` 仍在(`Exited (0)` 已 6 週,`docker start` 起得來),但它的設定是**換 gtxin 網域之前**的,起來之後代理的是舊網域組態,不會是現在的 `gtxin.com.tw` / `core.gtxin.com.tw`。當「Traefik 整個壞掉」的最後手段可以,但別預期它一切就恢復正常。

> `/opt/traefik/dynamic/` 另有 `gts.yml.bak-before-gtxin`(2026-09-07),那是換網域前的組態,同樣**不是**可用的回滾目標——還原它會把網域改回舊的。

> **按第 1 層之前先確認閒置 slot 跑的是你要退回的版本。** 雷區 0 那段期間閒置 slot 停在三週前,按下去會把站退回三週前。
> 確認方式**只看容器實際的 image**,不要看 `.env`:
>
> ```bash
> ssh hetzner 'docker inspect gts_web_store_green gts_web_store_blue --format "{{.Name}} {{.Config.Image}}"'
> ```
>
> `rollback.sh` 會同步更新 `ACTIVE_TAG`,而且(2026-09-10 修)它讀的是**容器實際的 image**而不是 `.env`——否則「上次部署失敗過的 slot」會讓它回報一個線上根本不存在的版本。即便如此,`ACTIVE_TAG` 仍只是給人看的追蹤欄位,**判斷版本請一律回到 `docker inspect`**。

> 遷移期的安全網現在只剩 `nginx_proxy_manager`(第 3 層,降級)。`gts_store_frontend` 已經被清掉了——**清的時候沒有一併更新這份文件**,於是「第 2 層回滾」在文件上又活了六週。清安全網時記得同步改這裡。

## 踩過的雷(重要)

0. **slot 判斷不能只 `grep -o 'blue|green'`——這條讓藍綠整套失效了三週**(2026-09-10 修好)

   `gts.yml` 裡 `gts-frontend-<slot>@docker` 出現在**兩個** router:正式的 `gts`(Host `gtxin.com.tw`)與舊網域轉址的 `legacy-front`(Host `gts.jaao.tw || jaao.tw`)。原本的寫法

   ```bash
   CURRENT=$(grep "service: gts-frontend-" "$f" | grep -o 'blue\|green')   # ❌
   ```

   會吐出**兩行**,`CURRENT` 實際是 `"blue\nblue"`,於是 `[ "$CURRENT" = "blue" ]` 永遠 false → `NEXT=blue` → **每次都部署到正在服務的那個 slot**。後果全部是靜默的:

   - 沒有零停機(重建的是 live 容器)
   - healthcheck 檢查的是已被覆蓋的 live slot;腳本印的「放棄部署(流量仍在 X)」是**假的**,流量早就在壞掉的新版上,而 `exit 1` 就把站留在壞的狀態
   - Traefik 那行 `sed` 是 blue→blue,白做
   - `rollback.sh` 算出 `PREV=blue` 切到自己,**回滾是 no-op**——出事按了沒反應

   **而 Actions 上一路全綠**,三週都沒人發現。判斷已抽成 `deploy/lib-slot.sh` 的 `current_slot()` / `other_slot()`,用 `sort -u` 收重複;若兩個 router 真的指向不同 slot 則**明確報錯而不是猜**。

   > 教訓兩點:①「兩份相同邏輯複製在兩個檔案」→ 這個 bug 一次弄壞 deploy 與 rollback 兩支。②**部署類的錯誤幾乎都是靜默的**,綠燈不代表機制在運作;要驗就 ssh 進去看容器 uptime 與 `.env` 的 tag。`green` 的 uptime 停在幾週前就是警訊。

1. **Docker 29 卡 Traefik docker provider**:Docker 29 最低 API 1.40,Traefik v3.3~v3.5 的 docker client 卡在 1.24 協商失敗(狂洗 log)。**升到 v3.7.x 解決**(v3.7 是分水嶺),不需要動 daemon 的 `DOCKER_MIN_API_VERSION`。
2. **藍綠 healthcheck 用 `localhost` 會 fail**:前端 `nginx/nginx.conf` 只 `listen 80`(無 IPv6),`localhost`→`::1` 連不到 → slot 卡 unhealthy。healthcheck 必須用 `127.0.0.1`(已修在 `deploy/docker-compose.yml`)。
3. **前端 nginx 啟動硬相依 `directus_app`**:`proxy_pass http://directus_app:8055` 在 nginx 啟動時就解析主機名,`directus_app` 不可解析(不在 traefik-net)→ nginx 起不來。所以 slot 與 directus_app 必須同在 `traefik-net`。
4. ~~**traefik-net 連線的脆弱點**~~ ✅ **已修**(2026-09-07):`traefik-net` 原本是手動
   `docker network connect` 接上、不在 compose 裡,`--force-recreate` 之後就會掉,
   Traefik 找不到後端 → **兩個 Directus 網域一起 502**(實際踩到過)。
   已把 `traefik-net` 寫進 `/root/gtsWebSite/directus/docker-compose.yaml` 的
   `directus` 服務與頂層 `networks`(external: true),重建後會自動保留。
   > 若哪天又出現 502,第一件事就是 `docker inspect directus_app --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'` 看 traefik-net 在不在。
5. **改 `.env` 後 `docker restart` 沒用**:`docker restart` 會沿用既有容器設定,
   **不會重讀 env_file**。必須 `docker compose up -d --force-recreate <service>`。
   注意 service 名不等於 container_name——Directus 的 container 叫 `directus_app`,
   但 compose service 是 **`directus`**;Traefik 兩者都叫 `traefik`。
6. **`EMAIL_FROM` 只能填純位址**:此版 Directus 會把整串當信封寄件人送進 SMTP 的
   `MAIL FROM`,帶任何顯示名稱(連 ASCII 都算)都會 `501 Bad sender address syntax`。
   **寄件者的顯示名稱其實取自 Directus 的 `project_name`**(已設為「金同心實業」)。
   另外 compose 的 `env_file` 解析器遇到值裡有 `<` `>` 又只用雙引號包住時,
   剝掉引號後會把 `<noreply@…>` 當成新變數名而整個檔案解析失敗。

## image 組成(`Dockerfile` + `nginx/nginx.conf`)

兩階段:`node:24-alpine` builder(`npm ci` → `npm run build`)→ `nginx:alpine`,
把 `dist/` 複製到 `/usr/share/nginx/html`,`EXPOSE 80`。

- **`VITE_*` 是 build-time 烘進靜態檔的**,不是 runtime 環境變數。Dockerfile 以
  `ARG VITE_DIRECTUS_URL=/api` / `ARG VITE_DIRECTUS_PUBLIC_URL` 接,轉成 `ENV` 供 build 使用。
  換後端網址**必須重 build image**,改容器環境變數沒有用。
- `nginx/nginx.conf` 負責:靜態檔服務、SPA fallback(`try_files $uri $uri/ /index.html`)、
  `/api` 反代到 `directus_app:8055`。只 `listen 80`(無 IPv6)——healthcheck 用 `127.0.0.1`,見上方雷區 2。
- **根目錄的 `docker-compose.yml` 不是正式部署路徑**:它仍指向舊的
  `${REMOTE_REGISTRY_IP}`、`9053:80`,屬本機/遺留用途。正式藍綠部署走 `deploy/docker-compose.yml`
  + harbor image,由 CI 呼叫 `~/gts-web/deploy.sh`。

## 首次 bootstrap 一顆 image(不經 CI)

本機已登入 harbor,可直接 build+push(複製 CI 的 build-args):
```bash
IMG=harbor.jaao.tw/gts/gts_web_store
docker build --build-arg VITE_DIRECTUS_URL=/api \
  --build-arg VITE_DIRECTUS_PUBLIC_URL=https://core.gtxin.com.tw \
  -t $IMG:<tag> -t $IMG:latest .
docker push $IMG:<tag> && docker push $IMG:latest
```

## 關鍵位置速查

- **repo**:`deploy/`(compose + `deploy.sh` + `rollback.sh` + **`lib-slot.sh`** + README + traefik-dynamic/gts.yml)、`.github/workflows/deploy.yml`、**`.github/scripts/deploy-freshness.sh`**、`Dockerfile`、`nginx/nginx.conf`
- **VM**:`/opt/traefik/`(Traefik)、`~/gts-web/`(藍綠 compose + **三支腳本** + .env;`.bak-*/` 是手動同步前的備份)
- **GitHub Secrets**(`jaaoStudio/gts`):`HARBOR_URL/USER/PASSWORD`、`VM_HOST/USER/SSH_KEY`(部署 key `~/.ssh/gts-deploy`)、`VITE_DIRECTUS_PUBLIC_URL`
- **SSH key 分工**:`~/.ssh/hetzner`=你自己登入;`~/.ssh/gts-deploy`=GitHub Actions 部署專用(要撤 CI 權限就從 VM authorized_keys 移掉這把)

## 專案要點(部署相關)

- 前端 Vue 3 SPA(Vite build → nginx),後端 Directus 11 + Postgres + Redis;領域詞彙見 `CONTEXT.md`。
- 網域:`gtxin.com.tw` = 前端;`core.gtxin.com.tw` = Directus 後台/API。全開 Cloudflare 橘雲。
- Directus 認證用 session 模式(`AUTH_GOOGLE_MODE=session` + cookie 三項 + `CACHE_AUTO_PURGE=true`)。
  - **CSRF**:前端走 `/api` 與 Directus 同源,`SESSION_COOKIE_SAMESITE=Lax`(勿用 `None`,否則 cookie 被跨站夾帶開啟 CSRF 面向);`SESSION_COOKIE_SECURE=true`。
- VM 架構 x86_64 → workflow `platforms: linux/amd64`(換 ARM 機才要改)。
