module.exports = async function (data) {
    const one = (x) => (Array.isArray(x) ? x[0] : x);

    // 收件人：item-read 讀單例可能回物件或陣列，樣板無法分支，在這裡正規化
    const settings = one(data.notify_to);
    const to = settings && settings.order_notify_email;
    if (!to) throw new Error('skip: 尚未設定訂單通知信箱');

    // 客戶名稱要取「這張單實際的客戶」。compute2 的 my_customer 是登入者的
    // customer，後台代客人建單時那是老闆自己，信裡會顯示錯的人。
    const order = one(data.read_saved);
    const c = order && order.customer;
    const customer_label = (c && (c.company_name || c.user_name)) || '（未知客戶）';

    // ⚠️ `company_name` / `user_name` 是客人自己改得動的（customerService 的白名單），
    //    所以進信件 body 的那份必須跳脫，理由與 compute2 的 esc 相同。
    //    主旨用未跳脫的原值：它不經 markdown 算繪，跳脫只會讓收件匣看到反斜線；
    //    換行由 nodemailer 編碼，不構成標頭注入。
    //    ⚠️ 兩支腳本各有一份 esc（沙箱裡 import 不到彼此），改一邊要改兩邊。
    const customer_label_md = customer_label
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/([\\`*_[\]()!|~#])/g, '\\$1')
        .replace(/\s*[\r\n]+\s*/g, ' ');

    return { to, customer_label, customer_label_md };
};
