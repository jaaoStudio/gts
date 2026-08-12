import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * lineReveal — 標題逐行揭露：每行從遮罩下緣翻出。
 *
 * 為什麼不用 v-reveal：v-reveal 是把整個元素當一塊淡入，逐行需要把文字
 * 實際切成多個 DOM 行才做得到，只有 SplitText 能切。
 *
 * 不掛 ScrollTrigger（ADR 0002 第 6 點）— 只用在首屏標題，onMounted 直接播。
 *
 * autoSplit + onSplit：字體載入完成或視窗寬度改變時會自動重切並重播，
 * 避免中文換行位置在 web font 換上去之後跑掉、行數對不上。
 * 動畫必須寫在 onSplit() 內才會指向重切後的新元素。
 *
 * 必須在 gsap.context() 內呼叫 — ctx.revert() 會把被切散的 DOM 還原。
 *
 * @param {string|Element} target 標題元素
 * @param {{delay?: number, duration?: number, stagger?: number}} opts
 * @returns {SplitText|null} reduced-motion 時回傳 null（文字保持原樣直接可讀）
 */
export function lineReveal(target, { delay = 0, duration = 1, stagger = 0.12 } = {}) {
  if (prefersReduced()) return null

  let split = null
  try {
    split = SplitText.create(target, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line-reveal',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration,
          delay,
          stagger,
          ease: 'power3.out',
        })
      },
    })
  } catch (err) {
    // 動畫出錯絕不能讓標題留在 yPercent:110（遮罩外）變成永久看不見 —— 這正是
    // ADR 0002 記錄過的失敗模式。還原成未切分的純文字，寧可沒動畫也要讀得到。
    split?.revert()
    console.warn('[lineReveal] 切行失敗，標題已還原為靜態文字', err)
    return null
  }
  return split
}

export default lineReveal
