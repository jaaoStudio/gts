module.exports = async function (data) {
    const t = data.$trigger || {};
    const payload = t.payload || {};
    const items = payload.items || [];

    // ⚠️ 客人填的自由文字最終會被算繪成 HTML 寄給老闆（notify_mail 的 type 是
    //    markdown，走 marked 且 gfm 開著）。四層缺一層，釣魚管道就還開著——
    //    2026-09-18 以 marked 18 逐條實測過：
    //      1. HTML 實體：擋 <img src=x onerror=1> 這種原始標籤
    //      2. inline 語法：擋 [字](網址) 的連結
    //      3. `:` 與 `.`：擋 gfm autolink。裸的 https:// 與 www. 都會被變成真的
    //         anchor。⚠️ **只做 1+2 不夠**：[字](https://evil.tw) 的中括號被跳脫
    //         之後，裡面那段裸網址仍然 autolink 成可點連結——等於只換掉字面，
    //         管道原封不動。第一版修補就是這樣漏的。
    //      4. 換行收成 <br>（或空白）：讓客人的值永遠站不到行首。否則 `=====`
    //         會變 h1、`- ` 會變清單，足以在連結周圍包出一整段像官方通知的版面。
    //    跳脫 `.` 與 `:` 不會讓正常文字長出反斜線：marked 會還原，實測
    //    「0912-345-678 / No.5 3F / 14:30」算繪後乾淨。
    const esc = (v) => {
        if (v === null || v === undefined) return '';
        return String(v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/([\\`*_[\]()!|~#:.])/g, '\\$1');
    };
    // 表格儲存格與清單項目：換行會把 `| 聯絡方式 | … |` 那列切斷、把清單撐開
    const escLine = (v) => esc(v).replace(/\s*[\r\n]+\s*/g, ' ');
    // 多行備註：換行改成 <br>，順帶讓多行備註在信裡真的分行（markdown 的單一
    // 換行本來會被併成一段）
    const escBlock = (v) => esc(v).replace(/\r?\n/g, '<br>');

    let subtotal = 0, hasQuote = false;
    const lines = [];
    for (const it of items) {
        const qty = it.quantity || 0;
        const name = escLine(it.product_name) + (it.spec_name ? ' / ' + escLine(it.spec_name) : '');
        if (it.unit_price === null || it.unit_price === undefined) {
            hasQuote = true;
            lines.push('- ' + name + ' × ' + qty + '　（詢價）');
        } else {
            subtotal += it.unit_price * qty;
            lines.push('- ' + name + ' × ' + qty + '　NT$' + (it.unit_price * qty));
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

    // ⚠️ order_number / subtotal / has_quote_items / customer 會被 apply2 寫回資料庫，
    //    一律保持原值不跳脫——跳脫過的字串進了 DB 就是髒資料。
    //    客戶名稱刻意不從這裡出：這支拿到的是「登入者」的 customer，老闆代客下單時
    //    那是老闆自己。信裡要顯示的那份由 pick_to 從訂單本身取（含跳脫）。
    return {
        order_number, subtotal, has_quote_items: hasQuote, customer,
        item_summary: lines.join('\n') || '（無品項）',
        contact: [escLine(payload.contact_name), escLine(payload.contact_phone)].filter(Boolean).join('　') || '—',
        note: escBlock(payload.note) || '—',
        subtotal_label: 'NT$' + subtotal + (hasQuote ? '（另有詢價品項）' : ''),
        admin_url: 'https://core.gtxin.com.tw/admin/content/orders/' + t.key,
    };
};
