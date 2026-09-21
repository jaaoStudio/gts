// @vitest-environment jsdom
//
// 這個 composable 存在的理由就是計數。改成「各自把 overflow 設回空字串」時每一條
// 都要紅——Navbar 的手機選單與詳情頁的 lightbox 會同時開著，先關的那個不可以把
// 另一個的鎖一起解掉。

import { afterEach, describe, expect, test } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useBodyScrollLock } from './useBodyScrollLock'

// 每個測試都掛載自己的元件，卸載時歸還自己那一份鎖
const mountLocker = (isOpen) => mount({
    setup() {
        useBodyScrollLock(isOpen)
        return () => null
    },
})

const overflow = () => document.body.style.overflow

afterEach(() => {
    document.body.style.overflow = ''
})

describe('useBodyScrollLock', () => {
    test('開時鎖住，關時放開', async () => {
        const open = ref(false)
        const w = mountLocker(open)
        expect(overflow()).toBe('')

        open.value = true
        await nextTick()
        expect(overflow()).toBe('hidden')

        open.value = false
        await nextTick()
        expect(overflow()).toBe('')
        w.unmount()
    })

    test('兩個同時鎖住時，先關的那個不會解掉另一個的鎖', async () => {
        const menu = ref(false)
        const lightbox = ref(false)
        const a = mountLocker(menu)
        const b = mountLocker(lightbox)

        menu.value = true
        await nextTick()
        lightbox.value = true
        await nextTick()
        expect(overflow()).toBe('hidden')

        // lightbox 關掉，但選單還開著
        lightbox.value = false
        await nextTick()
        expect(overflow()).toBe('hidden')

        menu.value = false
        await nextTick()
        expect(overflow()).toBe('')
        a.unmount()
        b.unmount()
    })

    test('掛載當下就已經是開著的，也要立刻鎖住', () => {
        // watch 少了 immediate 的話這裡會是空字串：ref 在 setup 當下就是 true 的
        // 元件永遠不會取得鎖
        const w = mountLocker(ref(true))
        expect(overflow()).toBe('hidden')
        w.unmount()
    })

    test('鎖著的時候卸載，鎖要跟著歸還', async () => {
        const open = ref(true)
        const w = mountLocker(open)
        expect(overflow()).toBe('hidden')

        w.unmount()
        expect(overflow()).toBe('')
    })
})
