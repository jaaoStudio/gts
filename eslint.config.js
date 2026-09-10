import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

/**
 * 只接機械性錯誤，不管排版。
 *
 * 用 `flat/essential`（Priority A）而不是 `flat/recommended`：後者在本專案噴
 * 808 個 warning，其中 777 個是純排版規則。排版交給 formatter，不要用 linter。
 * 要收緊請從個別規則加起，不要整包換更嚴的 preset。
 *
 * **本專案沒有 warning 層級**：規則不是 error 就是關掉，`npm run lint` 帶
 * `--max-warnings 0`。會被習慣性忽略的警告等於沒有警告。
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
            // essential 不含這條，但 v-html 是 stored XSS 的主要入口。
            // ⚠️ 必須 error 不能 warn——`eslint` 遇 warning 的 exit code 是 0，CI 會放行。
            // 要放行個別用法請就地標 eslint-disable-next-line 並寫清楚為什麼安全。
            'vue/no-v-html': 'error',

            // 本專案的 Home / Products / Footer 都是路由頁面，不會被當自訂元素註冊。
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
