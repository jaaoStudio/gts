import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { CVS } from '../utils/orderTotals'

/**
 * 說明頁的運費文案。
 *
 * 金額一律從 Directus 讀，**不寫死在文案裡**——這個專案已經因為「文案說一套、
 * 程式做一套」出過事：說明頁寫著「運費依重量材積計算」，實際上運費功能根本
 * 還沒實作。以後改價只要動後台，兩處說明頁與訂購單頁會一起跟上。
 *
 * 設定讀不到時回傳 `rule = null`，呼叫端要改用不帶數字的說法，
 * 不可退回寫死的預設值——那等於又把文案與實際行為分家一次。
 */
export const useShippingCopy = () => {
    const settingsStore = useSettingsStore()

    const rule = computed(() => settingsStore.shippingRule)

    const feeText = computed(() =>
        rule.value ? `NT$${rule.value.fee.toLocaleString()}` : null
    )
    const thresholdText = computed(() =>
        rule.value ? `NT$${rule.value.threshold.toLocaleString()}` : null
    )

    // 超商的數字不從 Directus 來（是 7-11 的公告費率，見 utils/orderTotals 的 CVS），
    // 但同一條「說明頁不自己重打數字」的規則照樣適用——改通路時只要動 CVS 一處。
    const cvs = computed(() => ({
        feeRange: `${CVS.tiers[0].fee}–${CVS.tiers.at(-1).fee}`,
        maxCollectableText: `NT$${CVS.maxCollectable.toLocaleString()}`,
        holdDays: CVS.holdDays,
        size: CVS.size,
    }))

    return { rule, feeText, thresholdText, cvs }
}
