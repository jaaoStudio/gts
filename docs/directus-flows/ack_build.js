module.exports = async function (data) {
    const one = (x) => (Array.isArray(x) ? x[0] : x);
    const order = one(data.read_saved);
    if (!order) throw new Error('skip: 讀不到訂單');

    const c = order.customer || {};
    const to = c.user_id && c.user_id.email;
    // 會員一律以 Google 登入，理論上必有 email；沒有就安靜略過而非讓 flow 報錯
    if (!to) throw new Error('skip: 客戶沒有 email');

    const lines = (order.items || []).map((it) => {
        const name = it.product_name + (it.spec_name ? ' / ' + it.spec_name : '');
        if (it.unit_price === null || it.unit_price === undefined) {
            return '- ' + name + ' × ' + it.quantity + '　（詢價）';
        }
        return '- ' + name + ' × ' + it.quantity + '　NT$' + (it.unit_price * it.quantity);
    });

    const sub = 'NT$' + (order.subtotal || 0) + (order.has_quote_items ? '（另有詢價品項）' : '');
    const url = 'https://gtxin.com.tw/account/orders/' + order.id;

    // 超商取貨付款的下一步與宅配完全不同：客人不會收到匯款資訊，也不必付任何動作，
    // 沿用「會通知您匯款方式」那句對他是錯的指示。見 docs/adr/0006。
    const isCvs = order.delivery_method === 'cvs_cod';
    const store = order.cvs_store || '（未填，我們會與您確認）';

    const rows = [
        '| **訂購單號** | ' + order.order_number + ' |',
        '| **參考小計** | ' + sub + ' |',
    ];
    if (isCvs) {
        rows.push('| **交貨方式** | 7-11 超商取貨付款 |');
        rows.push('| **取貨門市** | ' + store + ' |');
    }

    const nextSteps = isCvs
        ? [
            '我們會盡快與您確認價格與庫存，確認後會再以 email 通知您應付金額。',
            '包裹寄出後會以簡訊通知您到門市取貨，取貨時把款項付給店員即可。',
            '包裹到店後請於 **7 天內取貨**，逾期會被退回。',
            '',
            '若其中有商品超過超商的尺寸限制，我們會與您聯絡改用宅配。',
        ]
        : [
            '我們會盡快與您確認價格與庫存，確認後會再以 email 通知您應付金額與匯款方式。',
            '**確認前不需要先付款。**',
        ];

    const body = [
        '### 我們已收到您的訂購單',
        '',
        '| | |',
        '|---|---|',
    ].concat(rows).concat([
        '',
        '**訂購品項**',
        '',
        lines.join('\n') || '（無品項）',
        '',
    ]).concat(nextSteps).concat([
        '',
        '[查看我的訂購單](' + url + ')',
    ]).join('\n');

    return { to, subject: '【訂購單已送出】' + order.order_number, body };
};
