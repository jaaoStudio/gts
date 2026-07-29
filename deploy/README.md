# gts 前端 — CI/CD + 藍綠部署

## 架構

```
push main ──▶ GitHub Actions
                ├─ build 前端 image（Vite→nginx，VITE 變數用 build args 烘進去）
                ├─ push 到 Harbor（:{sha} + :latest）
                └─ SSH 進 VM ▶ ~/gts-web/deploy.sh {sha}
                                   ├─ 部署到閒置 slot（blue/green）
                                   ├─ 等 healthcheck 通過
                                   └─ 改 Traefik dynamic 檔切流量（秒切、可秒回滾）

外部流量：Cloudflare ─▶ Traefik(:443, DNS-01 憑證) ─▶ 當前 slot 的 nginx ─▶ /api 反代 directus_app:8055
```

- blue / green 兩個 slot 常駐，Traefik 的 `service: gts-frontend-<color>@docker` 決定流量。
- rollback = 把該行切回另一色（前一版還在跑，秒切）。

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
# docker-compose.yml / deploy.sh / rollback.sh / .env.example → ~/gts-web/
cp docker-compose.yml deploy.sh rollback.sh .env.example ~/gts-web/
cd ~/gts-web
cp .env.example .env && vi .env          # 填 REMOTE_REGISTRY_IP，其餘先留 latest
chmod +x deploy.sh rollback.sh

# Traefik router
sudo cp traefik-dynamic/gts.yml /opt/traefik/dynamic/gts.yml
```

### 4. DNS
Cloudflare 加 `gts.jaao.tw` A record 指向新 VM（DNS-01 憑證，橘雲/灰雲都可）。

### 5. 登入 Harbor + 首次啟動兩個 slot
```bash
docker login <REMOTE_REGISTRY_IP>        # 用 boss-timing 那組帳密
cd ~/gts-web
docker compose --env-file .env up -d     # blue + green 都起來
docker compose ps                        # 兩個都 healthy
```
確認 https://gts.jaao.tw 正常後即完成。之後 push main 就會自動滾動更新。

### 6. GitHub Secrets（本 repo → Settings → Secrets and variables → Actions）
| Secret | 說明 |
|---|---|
| `HARBOR_URL` / `HARBOR_USER` / `HARBOR_PASSWORD` | 沿用 boss-timing 那組 Harbor |
| `VM_HOST` / `VM_USER` / `VM_SSH_KEY` | **新 VM** 的 SSH（key 用 private key 全文） |
| `VITE_DIRECTUS_PUBLIC_URL` | `https://gts-core.jaao.tw`（SSO 導向用的絕對網址） |

> `VITE_DIRECTUS_URL` 固定 `/api`（已寫死在 workflow build-args），不需 secret。

### 7. 架構注意
- 若新 VM 是 ARM：把 `.github/workflows/deploy.yml` 的 `platforms:` 改成 `linux/arm64`（VM 上 `uname -m` 確認）。
- Directus 端記得 `AUTH_GOOGLE_MODE=session` + cookie 三項 + `CACHE_AUTO_PURGE=true`（見對話紀錄）。

---

## 日常操作
- **部署**：merge 到 `main` → 自動跑。
- **回滾**：GitHub → Actions → **Rollback** → Run；或 VM 上 `~/gts-web/rollback.sh`。
- **看目前哪色**：`grep service /opt/traefik/dynamic/gts.yml`
