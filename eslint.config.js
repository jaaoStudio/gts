import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * 起手式刻意保守：只接機械性錯誤，不管排版。
 *
 * 用 vue 的 `flat/essential`（Priority A：錯誤預防）而不是 `flat/recommended`。
 * 實測過差別：recommended 在現有 6,725 行上噴 808 個 warning，其中 777 個是
 * max-attributes-per-line / singleline-html-element-content-newline / html-indent
 * 這類純排版規則。那些規則會製造大量與正確性無關的 diff，人看久了就會開始
 * 忽略紅字——而紅字一旦被忽略，linter 就失去意義了。
 *
 * 要收緊請從個別規則加起，不要整包換成更嚴的 preset。若哪天要導入排版統一，
 * 該用 formatter（prettier）在存檔時自動處理，而不是用 linter 事後罵人。
 *
 * **本專案沒有 warning 層級**：規則不是 error 就是關掉。`npm run lint` 帶
 * `--max-warnings 0`，所以就算哪天有人把某條設成 warn，也一樣擋得住 CI。
 * 理由與上面選 essential 是同一個——會被習慣性忽略的警告，等於沒有警告。
 */
export default [
    {
        // build 產物與相依套件不進 lint
        ignores: ['dist/**', 'node_modules/**'],
    },

    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],

    {
        // 前台程式跑在瀏覽器：localStorage、fetch、console 等都是合法全域
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser },
        },
        rules: {
            // essential 不含這條，但 v-html 是 stored XSS 的主要入口，值得一直盯著。
            // 現有唯一一處（ProductDetail）已經過 DOMPurify，就地標了 disable 並註明原因。
            //
            // ⚠️ 必須是 error 不能是 warn。#18 原本設 warn，但 `eslint .` 遇到 warning
            // 的 exit code 是 0——新增一個未豁免的 v-html，CI 照樣綠燈通過。
            // 「會被攔下來要求說明」這個保證，只有 error 才成立。
            // 要放行請就地標 eslint-disable-next-line 並寫清楚為什麼安全。
            'vue/no-v-html': 'error',
        },
    },

    {
        // 元件名稱單字即可。這條規則是為了避開與 HTML 元素撞名，但本專案的
        // Home / Products / Footer 都是路由頁面、命名一致且不會被當成自訂元素註冊。
        files: ['**/*.vue'],
        rules: {
            'vue/multi-word-component-names': 'off',
        },
    },

    {
        // 這幾支跑在 node：vite 設定檔與測試環境的 setup
        files: ['vite.config.js', 'eslint.config.js', 'src/test/**', '**/*.test.js'],
        languageOptions: {
            globals: { ...globals.node },
        },
    },
]
