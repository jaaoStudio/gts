module.exports = async function (data) {
    const items = data.read_items || [];
    // 讀不到品項就中止：寧可不動，也不要把 confirmed_total 算成只有運費的錯誤金額。
    // （客人回報匯款時也會觸發本 flow，那個情境下讀不到品項是正常的。）
    if (!items.length) throw new Error('skip: no items');

    const order = Array.isArray(data.read_order) ? data.read_order[0] : data.read_order;
    if (!order) throw new Error('skip: no order');

    const s = Array.isArray(data.read_settings) ? data.read_settings[0] : data.read_settings;

    // 商品小計：確認單價優先，未填則沿用客人下單時看到的；詢價品項（皆為 null）跳過
    let goods = 0;
    for (const it of items) {
        const price = (it.confirmed_price !== null && it.confirmed_price !== undefined)
            ? it.confirmed_price : it.unit_price;
        if (price === null || price === undefined) continue;
        goods += price * (it.quantity || 0);
    }
    const afterDiscount = goods - (order.discount || 0);

    // 7-11 交貨便的級距，依代收金額分階。
    // ⚠️ 這張表與前端 utils/orderTotals.js 的 CVS_IBON 是**同一份資料的兩份副本**
    //    （flow 在 Directus 裡跑，import 不到 repo 的程式）。改費率時兩邊都要動，
    //    見 docs/adr/0006 的 Consequences。
    const CVS_TIERS = [[1000, 60], [2000, 70], [3000, 80], [4000, 90], [5000, 100]];
    const tierFee = (amount) => {
        for (const [max, fee] of CVS_TIERS) if (amount <= max) return fee;
        return CVS_TIERS[CVS_TIERS.length - 1][1];
    };

    // shipping_fee 為 null＝老闆沒動過 → 自動算；填過任何數字（含 0）就尊重
    let shipping = order.shipping_fee;
    if (shipping === null || shipping === undefined) {
        if (order.delivery_method === 'cvs_cod') {
            // ⚠️ 超商**不套免運門檻**：那是老闆對宅配運費的補貼，而交貨便的運費是
            //    7-11 從代收款直接扣走的，免了就是老闆自吃（docs/adr/0006 第 1 條）。
            // ⚠️ 級距查的是**含運的代收金額**，所以要查兩次（同 ADR 第 3 條）。
            shipping = tierFee(afterDiscount + tierFee(afterDiscount));
        } else {
            const threshold = s ? s.free_shipping_threshold : null;
            const defFee = (s && s.default_shipping_fee) || 0;
            shipping = (threshold !== null && threshold !== undefined && afterDiscount >= threshold)
                ? 0 : defFee;
        }
    }

    const out = {
        shipping_fee: shipping,
        confirmed_total: afterDiscount + shipping,
    };

    // 狀態推進到已付款／已出貨時自動補時間戳，老闆不必自己填
    const now = new Date().toISOString();
    if (order.status === 'paid' && !order.paid_at) out.paid_at = now;
    if (order.status === 'shipped' && !order.shipped_at) out.shipped_at = now;

    return out;
};
