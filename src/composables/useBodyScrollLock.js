import { watch, onBeforeUnmount } from 'vue'

// 目前有幾個東西正鎖著。⚠️ 必須計數，不能各自把 overflow 設回空字串：
// Navbar 的手機選單與詳情頁的 lightbox 會同時開著（從選單點進商品再放大圖），
// 先關的那個會把另一個的鎖一起解掉，整頁在 lightbox 還開著時就能捲動。
let locks = 0

const apply = () => {
    document.body.style.overflow = locks > 0 ? 'hidden' : ''
}

/**
 * 依 ref 的真假鎖住 / 放開 body 捲動，元件卸載時一定歸還自己那一份。
 * @param {import('vue').Ref<boolean>} isOpen
 */
export const useBodyScrollLock = (isOpen) => {
    let held = false

    const set = (shouldLock) => {
        if (shouldLock === held) return
        held = shouldLock
        locks += shouldLock ? 1 : -1
        apply()
    }

    watch(isOpen, (open) => set(!!open))

    // 鎖著的時候離開這一頁，body 會永遠卡在 overflow:hidden，全站都捲不動
    onBeforeUnmount(() => set(false))
}
