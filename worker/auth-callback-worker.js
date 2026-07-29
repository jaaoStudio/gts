/**
 * Cloudflare Worker — Google SSO callback 的 double-tap spinner
 *
 * 背景見 docs/adr/0001-google-sso-登入流程.md。
 * 後端 Directus 在歐洲，callback 這一跳要等數秒，使用者會盯著凍住的 Google 頁。
 * 這支 Worker 在邊緣先回一頁 spinner，再把瀏覽器導回同一組 OAuth 參數交給後端處理。
 *
 * ⚠️ 狀態一律走 URL 旗標，不要改回 cookie。舊版用 `edge_loading` cookie 判斷第一/第二擊，
 *    在 iOS Safari 上會卡死：
 *      1. `location.replace(window.location.href)` 目標與當前頁完全相同，WebKit 視為重導
 *         迴圈，在沒有使用者手勢時直接取消 navigation → 第二擊根本不會發出。
 *      2. cookie 只活 10 秒，行動網路下很容易在第二擊之前就過期 → 又被判成第一擊，無限迴圈。
 *
 * ⚠️ `code`/`state` 一個 byte 都不能動,否則 Directus 回 INVALID_CREDENTIALS。
 *    因此旗標只用字串接在網址尾端、也只用字串切掉,全程不碰 URLSearchParams
 *    (它會重新序列化整串 query,可能改動 state 的編碼)。
 */

const CALLBACK_PATH = '/auth/login/google/callback'
const EDGE_FLAG = '_edge=1'

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname !== CALLBACK_PATH || request.method !== 'GET') {
      return fetch(request)
    }

    // ── 第二擊：帶旗標 → 剝掉旗標,把原封不動的 OAuth 參數交給後端 ──
    const stripped = stripEdgeFlag(request.url)
    if (stripped !== null) {
      // 量真實耗時。這段涵蓋「邊緣 → 芬蘭 Directus → Directus 去 Google 換 token
      // 與拉 userinfo → 寫 session → 回 302」的全部,是判斷要不要再優化的唯一依據。
      // 在 Cloudflare 的 Workers Logs / `wrangler tail` 看得到。
      const t0 = Date.now()
      const response = await fetch(new Request(stripped, request))
      console.log(JSON.stringify({
        evt: 'sso_callback_upstream',
        ms: Date.now() - t0,
        status: response.status,
        colo: request.cf?.colo,
        ua: request.headers.get('User-Agent'),
      }))
      return response
    }

    // ── 第一擊：邊緣立刻回 spinner,同時把瀏覽器導向帶旗標的同一組參數 ──
    const nextUrl = request.url + (url.search ? '&' : '?') + EDGE_FLAG

    return new Response(spinnerPage(nextUrl), {
      status: 200,
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        // 這頁只是過場,別讓任何中間層留下來
        'Referrer-Policy': 'same-origin',
      },
    })
  },
}

/**
 * 旗標一定是我們自己接在尾端的,所以只認尾端、用純字串切除。
 * @returns {string|null} 剝除後的網址;沒有旗標則回 null
 */
function stripEdgeFlag(rawUrl) {
  if (rawUrl.endsWith('&' + EDGE_FLAG) || rawUrl.endsWith('?' + EDGE_FLAG)) {
    return rawUrl.slice(0, -(EDGE_FLAG.length + 1))
  }
  return null
}

function spinnerPage(nextUrl) {
  // meta refresh 走 HTML parser,不受 WebKit 對 script navigation 的節流影響 → iOS 上最穩。
  // JS 與手動按鈕是兩層備援,任一條通了就會離開這頁。
  //
  // 視覺必須與 src/views/AdminCallback.vue 保持一致(色票取自 src/style.css 的 @theme):
  // 這兩頁是連著出現的,第二擊 navigation 期間畫面仍停在本頁,結束後才換到 AdminCallback。
  // 長得不一樣就會在中間閃一下,使用者會覺得流程不穩。改動任一邊記得同步另一邊。
  //
  // ⚠️ 一律 inline,不得引用任何外部資源(字體/圖檔/CSS)。這頁存在的意義就是「立刻出現」,
  //    多一次網路請求就自我否定了。品牌字體載不到會自動 fallback,可接受。
  // ⚠️ logo 的描邊動畫只在本頁播一次當進場,AdminCallback 那邊不重播(否則換頁會閃第二次)。
  //    之後的動態一律用循環型(呼吸/掃描),循環動畫在任何時間點被打斷都不突兀。
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="same-origin">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(nextUrl)}">
    <title>登入中｜金同心實業</title>
    <style>
        :root { color-scheme: light; --ease: cubic-bezier(0.32, 0.72, 0, 1); }
        * { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100dvh; position: relative; overflow: hidden;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: #f7f7f8; color: #1a1b1f;
            font-family: "Geist Variable", ui-sans-serif, system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        /* blueprint 方格底紋 — 同 .bg-blueprint */
        body::before {
            content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .6;
            background-image:
                linear-gradient(to right, rgba(16, 17, 21, 0.04) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(16, 17, 21, 0.04) 1px, transparent 1px);
            background-size: 44px 44px;
        }
        /* 右上角暖色光暈 — 同 AdminCallback 的 bg-brand-500/10 blur-[120px] */
        body::after {
            content: ''; position: absolute; top: -10%; right: -10%; width: 28rem; height: 28rem;
            pointer-events: none; border-radius: 50%; filter: blur(120px);
            background: rgba(249, 115, 22, 0.10);
        }
        .stage { position: relative; display: flex; flex-direction: column; align-items: center; }

        .mark { width: 76px; height: 76px; display: block; }
        .mark .stroke {
            stroke-dasharray: 1; stroke-dashoffset: 1;
            animation: draw .45s var(--ease) forwards;
        }
        .mark .stroke-2 { animation-delay: .18s; }
        .mark .chip {
            transform-box: fill-box; transform-origin: center; opacity: 0;
            animation: pop .3s var(--ease) .42s both, breathe 2.2s var(--ease) .72s infinite;
        }
        @keyframes draw   { to { stroke-dashoffset: 0; } }
        @keyframes pop    { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes breathe{ 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .55; transform: scale(.9); } }

        .label {
            margin-top: 22px; font-size: 13px; font-weight: 500; color: #6c6f7a;
            text-transform: uppercase; letter-spacing: 0.16em;
            font-family: "JetBrains Mono Variable", ui-monospace, "SFMono-Regular", monospace;
        }
        /* 不定量進度條:比轉圈更沉穩,也更符合 premium-industrial */
        .bar {
            margin-top: 18px; width: 168px; height: 2px; border-radius: 999px;
            background: #d9dade; overflow: hidden;
        }
        .bar span {
            display: block; width: 40%; height: 100%; border-radius: inherit;
            background: #f97316; animation: sweep 1.5s var(--ease) infinite;
        }
        @keyframes sweep { from { transform: translateX(-110%); } to { transform: translateX(360%); } }

        .fallback {
            margin-top: 30px; opacity: 0; pointer-events: none;
            font-size: 13px; color: #c2410c; text-decoration: underline; text-underline-offset: 3px;
            transition: opacity .4s var(--ease);
        }
        .fallback.show { opacity: 1; pointer-events: auto; }

        @media (prefers-reduced-motion: reduce) {
            .mark .stroke { stroke-dashoffset: 0; animation: none; }
            .mark .chip { opacity: 1; animation: none; }
            .bar span { width: 100%; animation: none; opacity: .5; }
        }
    </style>
</head>
<body>
    <div class="stage">
        <svg class="mark" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="金同心實業">
            <path class="stroke" pathLength="1" d="M133 419.56V184.04C133 122.6 163.72 91.8799 225.16 91.8799H286.6C348.04 91.8799 378.76 122.6 378.76 184.04V419.56" stroke="#101115" stroke-width="30.72" stroke-linecap="round"/>
            <path class="stroke stroke-2" pathLength="1" d="M204.68 204.52H307.08" stroke="#101115" stroke-width="30.72" stroke-linecap="round"/>
            <path class="chip" d="M271.24 271.08H240.52C229.209 271.08 220.04 280.249 220.04 291.56V322.28C220.04 333.591 229.209 342.76 240.52 342.76H271.24C282.551 342.76 291.72 333.591 291.72 322.28V291.56C291.72 280.249 282.551 271.08 271.24 271.08Z" fill="#F97316"/>
        </svg>

        <p class="label">正在完成登入…</p>
        <div class="bar"><span></span></div>

        <a class="fallback" id="fallback" href="${escapeHtml(nextUrl)}">繼續登入</a>
    </div>

    <script>
        var next = ${jsString(nextUrl)};
        // 備援一：meta refresh 若被忽略,onload 後再導一次(此時 document 已 commit)
        addEventListener('load', function () { location.replace(next); });
        // 備援二：3 秒還在這頁就給使用者一個帶手勢的出口,手勢 navigation 不會被任何節流擋下
        setTimeout(function () {
            document.getElementById('fallback').className = 'fallback show';
        }, 3000);
    </script>
</body>
</html>`
}

// 供本機預覽/測試用（Workers runtime 只吃 default export，多這個具名 export 無副作用）。
// 預覽：node -e 'import("./worker/auth-callback-worker.js").then(m=>console.log(m.spinnerPage("#")))' > preview.html
export { spinnerPage }

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function jsString(s) {
  return JSON.stringify(s).replace(/</g, '\\u003c')
}
