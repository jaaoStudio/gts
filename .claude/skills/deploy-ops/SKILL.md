---
name: deploy-ops
description: >-
  GTS storefront 正式站的部署 / 回滾 / 線上除錯 runbook(Hetzner VM + Traefik 藍綠部署)。
  當任務涉及:部署上線、rollback、除錯線上站台、動 Traefik / TLS 憑證、連進正式 VM、
  CI/CD 或 GitHub Actions 部署、藍綠 slot、harbor image 時使用。
---

# GTS 正式站部署維運 runbook

> 一次性「新機安裝」步驟看 `deploy/README.md`(正典)。本 skill 記**目前線上實況 + 日常操作 + 回滾 + 踩過的雷**。
> 日期基準:2026-07-29 建立。斷言前先實機驗證(容器名/檔案可能已變)。

## 線上架構(現況)

```
Cloudflare(橘雲) ─▶ Traefik(:443, DNS-01 憑證 cf) ─┬─ gts.jaao.tw / jaao.tw ─▶ gts-frontend-blue@docker(藍綠 slot)
  VM: 46.225.53.14                                   └─ gts-core.jaao.tw ─▶ directus_app:8055(file router)
  (ssh hetzner, key ~/.ssh/hetzner)
```

- **反向代理**:Traefik **v3.7.9**,設定在 VM `/opt/traefik/`(檔案式:`traefik.yml` 靜態 + `dynamic/gts.yml` + `acme.json` + `.env` 放 `CF_DNS_API_TOKEN`)。憑證 Cloudflare DNS-01,resolver 名 `cf`。
- **前端**:藍綠雙 slot `gts_web_store_blue` / `gts_web_store_green`(image `harbor.jaao.tw/gts/gts_web_store:<tag>`),同時常駐,`dynamic/gts.yml` 的 `service: gts-frontend-<color>@docker` 那行決定流量。
- **後端**:`directus_app`(Directus 11)+ `directus_db`(postgres 15)+ `directus_cache`(redis)。
- 所有服務容器都在 external network **`traefik-net`**。前端 nginx 靠 `directus_app:8055` 反代 `/api`。

## 部署流程(自動)

**merge / push 到 `main`** → GitHub Actions(`.github/workflows/deploy.yml`):
1. build 前端 image(build-args 烘 `VITE_DIRECTUS_URL=/api`、`VITE_DIRECTUS_PUBLIC_URL`)
2. push `harbor.jaao.tw/gts/gts_web_store:{sha}` + `:latest`
3. SSH(部署 key)進 VM 跑 `~/gts-web/deploy.sh {sha}`:部署到**閒置** slot → 等 healthcheck healthy → 改 `gts.yml` 切流量(Traefik file provider 自動 reload,秒切)

> workflow `paths-ignore` 排除 `**.md`/`deploy/**` 等;**改 `deploy/` 下腳本不會觸發 build,需手動 scp 同步到 VM `~/gts-web/`**。

## 日常操作(在本機跑,`ssh hetzner` 進 VM)

```bash
# 目前流量在哪個 slot
ssh hetzner 'grep "service: gts-frontend-" /opt/traefik/dynamic/gts.yml'
# 各容器健康
ssh hetzner 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "gts_web_store|traefik|directus"'
# Traefik log / 憑證
ssh hetzner 'docker logs --tail 50 traefik'
# 三站健康(繞過 Cloudflare,直測 origin)
for h in gts.jaao.tw jaao.tw gts-core.jaao.tw; do
  ssh hetzner "curl -sk -o /dev/null -w '$h %{http_code}\n' --resolve $h:443:127.0.0.1 https://$h/"; done
```

## 回滾(三層,由輕到重)

| 情境 | 動作 |
|---|---|
| 新版前端有問題(同架構) | `ssh hetzner '~/gts-web/rollback.sh'`(blue↔green 秒切回前一版) |
| 整個藍綠架構要退回舊單容器 | `ssh hetzner 'cp /opt/traefik/dynamic/gts.yml.phase1.bak /opt/traefik/dynamic/gts.yml'`(切回 `gts_store_frontend:0.0.5`,該容器仍 running) |
| Traefik 本身有問題,退回舊 NPM 代理 | `ssh hetzner 'docker stop traefik && docker start nginx_proxy_manager'` |

> 舊 `gts_store_frontend` 與 `nginx_proxy_manager` 是遷移期的安全網,**確認穩定後可清掉**(清掉後上面第 2、3 層回滾就失效)。

## 踩過的雷(重要)

1. **Docker 29 卡 Traefik docker provider**:Docker 29 最低 API 1.40,Traefik v3.3~v3.5 的 docker client 卡在 1.24 協商失敗(狂洗 log)。**升到 v3.7.x 解決**(v3.7 是分水嶺),不需要動 daemon 的 `DOCKER_MIN_API_VERSION`。
2. **藍綠 healthcheck 用 `localhost` 會 fail**:前端 `nginx/nginx.conf` 只 `listen 80`(無 IPv6),`localhost`→`::1` 連不到 → slot 卡 unhealthy。healthcheck 必須用 `127.0.0.1`(已修在 `deploy/docker-compose.yml`)。
3. **前端 nginx 啟動硬相依 `directus_app`**:`proxy_pass http://directus_app:8055` 在 nginx 啟動時就解析主機名,`directus_app` 不可解析(不在 traefik-net)→ nginx 起不來。所以 slot 與 directus_app 必須同在 `traefik-net`。
4. **traefik-net 連線的脆弱點**:`directus_app` / `gts_store_frontend` 接 traefik-net 是**手動 `docker network connect`**、不在它們自己的 compose 裡。若 `docker compose down/up` 重建這些容器會掉連線 → Traefik 找不到後端 → 站掛。長久解:把 `traefik-net` 寫進它們的 compose。

## 首次 bootstrap 一顆 image(不經 CI)

本機已登入 harbor,可直接 build+push(複製 CI 的 build-args):
```bash
IMG=harbor.jaao.tw/gts/gts_web_store
docker build --build-arg VITE_DIRECTUS_URL=/api \
  --build-arg VITE_DIRECTUS_PUBLIC_URL=https://gts-core.jaao.tw \
  -t $IMG:<tag> -t $IMG:latest .
docker push $IMG:<tag> && docker push $IMG:latest
```

## 關鍵位置速查

- **repo**:`deploy/`(compose + deploy.sh + rollback.sh + README + traefik-dynamic/gts.yml)、`.github/workflows/deploy.yml`、`Dockerfile`、`nginx/nginx.conf`
- **VM**:`/opt/traefik/`(Traefik)、`~/gts-web/`(藍綠 compose + 腳本 + .env)
- **GitHub Secrets**(`jaaoStudio/gts`):`HARBOR_URL/USER/PASSWORD`、`VM_HOST/USER/SSH_KEY`(部署 key `~/.ssh/gts-deploy`)、`VITE_DIRECTUS_PUBLIC_URL`
- **SSH key 分工**:`~/.ssh/hetzner`=你自己登入;`~/.ssh/gts-deploy`=GitHub Actions 部署專用(要撤 CI 權限就從 VM authorized_keys 移掉這把)

## 專案要點(部署相關)

- 前端 Vue 3 SPA(Vite build → nginx),後端 Directus 11 + Postgres + Redis;領域詞彙見 `CONTEXT.md`。
- 網域:`gts.jaao.tw`(+ apex `jaao.tw`)= 前端;`gts-core.jaao.tw` = Directus 後台/API。全開 Cloudflare 橘雲。
- Directus 認證用 session 模式(`AUTH_GOOGLE_MODE=session` + cookie 三項 + `CACHE_AUTO_PURGE=true`)。
  - **CSRF**:前端走 `/api` 與 Directus 同源,`SESSION_COOKIE_SAMESITE=Lax`(勿用 `None`,否則 cookie 被跨站夾帶開啟 CSRF 面向);`SESSION_COOKIE_SECURE=true`。
- VM 架構 x86_64 → workflow `platforms: linux/amd64`(換 ARM 機才要改)。
