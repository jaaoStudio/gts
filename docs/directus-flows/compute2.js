module.exports = async function (data) {
    const t = data.$trigger || {};
    const payload = t.payload || {};
    const items = payload.items || [];

    // ⚠️ 客人填的自由文字最終會被算繪成 HTML 寄給老闆（notify_mail 的 type 是
    //    markdown）。HTML 與 markdown 兩層都要擋：只擋 HTML 的話，備註欄一個
    //    [看起來正常的字](https://釣魚站) 仍會變成從本站網域寄出、通過 SPF/DKIM
    //    的釣魚信。凡是進得了信件 body 的 payload 欄位都必須經過這裡。
    //    刻意不escape `-` `.` `+`：它們只影響版面不產生連結，跳脫了反而讓
    //    電話與地址長出一堆反斜線。
    const esc = (v) => {
        if (v === null || v === undefined) return '';
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/([\\`*_[\]()!|~#])/g, '\\$1');
    };
    // 表格儲存格用：換行會把 `| 聯絡方式 | … |` 那一列切斷，整張表跟著垮
    const escCell = (v) => esc(v).replace(/\s*[\r\n]+\s*/g, ' ');

    let subtotal = 0, hasQuote = false;
    const lines = [];
    for (const it of items) {
        const qty = it.quantity || 0;
        if (it.unit_price === null || it.unit_price === undefined) {
            hasQuote = true;
            lines.push('- ' + esc(it.product_name) + (it.spec_name ? ' / ' + esc(it.spec_name) : '') +
                       ' × ' + qty + '　（詢價）');
        } else {
            subtotal += it.unit_price * qty;
            lines.push('- ' + esc(it.product_name) + (it.spec_name ? ' / ' + esc(it.spec_name) : '') +
                       ' × ' + qty + '　NT$' + (it.unit_price * qty));
        }
    }

    const tw = new Date(Date.now() + 8 * 3600 * 1000);
    const yy = String(tw.getUTCFullYear()).slice(-2);
    const mm = String(tw.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(tw.getUTCDate()).padStart(2, '0');
    const order_number = 'GTS-' + yy + mm + dd + '-' + String(t.key).padStart(4, '0');

    // 客戶端已無法寫入 customer，改由此處依登入帳號補上。
    // 查不到就沿用 payload（後台手動建單的情況）。
    const rows = data.my_customer;
    const found = Array.isArray(rows) ? rows[0] : rows;
    // payload 有帶 customer 就尊重它：客戶端根本無權寫這個欄位（送了會 403），
    // 所以能出現在 payload 裡的一定是管理員／店務在後台代客人建單時指定的。
    // 客戶自己送單時 payload 沒有這個欄位，才依登入帳號反查補上。
    const customer = payload.customer || (found && found.id) || null;
    const customer_label = (found && (found.company_name || found.user_name)) || '（未知客戶）';

    // ⚠️ order_number / subtotal / has_quote_items / customer 會被 apply2 寫回資料庫，
    //    一律保持原值不跳脫——跳脫過的字串進了 DB 就是髒資料。
    return {
        order_number, subtotal, has_quote_items: hasQuote, customer,
        customer_label,
        item_summary: lines.join('\n') || '（無品項）',
        contact: [escCell(payload.contact_name), escCell(payload.contact_phone)].filter(Boolean).join('　') || '—',
        note: esc(payload.note) || '—',
        subtotal_label: 'NT$' + subtotal + (hasQuote ? '（另有詢價品項）' : ''),
        admin_url: 'https://core.gtxin.com.tw/admin/content/orders/' + t.key,
    };
};
