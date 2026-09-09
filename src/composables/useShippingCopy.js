import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings'

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

    /**
     * 運費本身就是 0（全站免運促銷）。此時「一箱 NT$0，滿 NT$2,000 免運」是自相
     * 矛盾的句子——門檻沒有意義，因為湊不湊都一樣。呼叫端要改講「不收運費」。
     * 與 estimateShipping() 的 `fee === 0 → free` 是同一條規則。
     */
    const isFreeShipping = computed(() => rule.value?.fee === 0)

    const feeText = computed(() =>
        rule.value ? `NT$${rule.value.fee.toLocaleString()}` : null
    )
    const thresholdText = computed(() =>
        rule.value ? `NT$${rule.value.threshold.toLocaleString()}` : null
    )

    return { rule, isFreeShipping, feeText, thresholdText }
}
