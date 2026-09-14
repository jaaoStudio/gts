# Frontend Dockerfile (frontend/Dockerfile)
FROM node:24-alpine AS builder

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製源代碼
COPY . .

# VITE 變數：CI 環境沒有 .env（未被 git 追蹤），改由 build args 注入，
# Vite 於 build 時讀取 process env 的 VITE_* 並烘進 dist。
ARG VITE_DIRECTUS_URL=/api
ARG VITE_DIRECTUS_PUBLIC_URL
ARG VITE_GA_ID
ENV VITE_DIRECTUS_URL=$VITE_DIRECTUS_URL
ENV VITE_DIRECTUS_PUBLIC_URL=$VITE_DIRECTUS_PUBLIC_URL
# 沒傳這個 build arg 的話 GA 會整個不載入，而且不會有任何錯誤訊息（見 main.js）
ENV VITE_GA_ID=$VITE_GA_ID

# 構建應用 (Vue.js 項目通常使用 npm run build)
RUN npm run build

# 「GA 沒載入」是完全靜默的失敗：畫面正常、CI 全綠、只是永遠收不到資料。
# 有傳 VITE_GA_ID 就代表要啟用，那它就必須出現在產物裡——擋得住 build arg 漏接、
# env 沒被替換，以及有人把 main.js 那個 `if (import.meta.env.VITE_GA_ID)` 改成恆假。
# 留空＝刻意停用，跳過檢查。
RUN if [ -n "$VITE_GA_ID" ]; then \
      grep -rq "$VITE_GA_ID" dist/assets/ || { \
        echo "VITE_GA_ID 有傳入卻沒烘進 dist/assets，GA 不會載入" >&2; exit 1; }; \
    fi

# Production stage
FROM nginx:alpine

# 複製自定義 nginx 配置
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# 複製構建產物到 nginx 服務目錄
# Vue.js 項目構建產物通常在 dist 目錄
COPY --from=builder /app/dist /usr/share/nginx/html


# 暴露端口
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]