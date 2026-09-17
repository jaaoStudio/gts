module.exports = async function (data) {
    const one = (x) => (Array.isArray(x) ? x[0] : x);

    // 只在這次更新真的動到 status 才寄。少了這道判斷，老闆每存一次檔
    // 客人就收一封信。Directus 後台只送有異動的欄位，故此判斷夠準。
    const payload = (data.$trigger && data.$trigger.payload) || {};
    if (!Object.prototype.hasOwnProperty.call(payload, 'status')) {
        throw new Error('skip: 這次更新沒有變更狀態');
    }

    const order = one(data.read_final);
    if (!order) throw new Error('skip: 讀不到訂單');

    const status = order.status;
    if (status !== 'quoted' && status !== 'shipped') {
        throw new Error('skip: 此狀態不通知客人（' + status + '）');
    }

    const to = order.customer && order.customer.user_id && order.customer.user_id.email;
    if (!to) throw new Error('skip: 客戶沒有 email');

    const url = 'https://gtxin.com.tw/account/orders/' + order.id;
    const no = order.order_number;

    // 超商取貨付款單走 pending → quoted → shipped，永遠不會到 paid（錢在取貨時才收、
    // 隔週才入帳）。quoted 對它是「已確認、等出貨」而不是「該匯款了」，shipped 則要
    // 帶取貨門市、應付金額與 7 天期限——那三件事是客人唯一一次在掏錢前讀到的資訊，
    // 而逾期退回的運費是老闆自己吃。見 docs/adr/0006。
    const isCvs = order.delivery_method === 'cvs_cod';
    const store = order.cvs_store || '（請見訂購單頁面）';
    let subject, body;

    if (status === 'quoted') {
        const total = order.confirmed_total;
        // 金額還沒算出來就不要寄，否則客人會收到「應付 NT$0」
        if (total === null || total === undefined) {
            throw new Error('skip: 應付金額尚未計算');
        }

        if (isCvs) {
            subject = '【已確認】' + no + '　取貨時應付 NT$' + total;
            body = [
                '### 您的訂購單金額已確認',
                '',
                '| | |',
                '|---|---|',
                '| **訂購單號** | ' + no + ' |',
                '| **取貨門市** | ' + store + ' |',
                '| **取貨時應付** | **NT$' + total + '**（含運費） |',
                '',
                '我們會盡快為您寄出，包裹到門市後會以簡訊通知您，取貨時把款項付給店員即可。',
                '',
                '[前往訂購單](' + url + ')',
            ].join('\n');
        } else {
            const s = one(data.read_settings) || {};
            const hasBank = s.bank_name && s.bank_account && s.bank_account_name;
            const bank = hasBank
                ? ['| **銀行** | ' + s.bank_name + ' |',
                   '| **帳號** | ' + s.bank_account + ' |',
                   '| **戶名** | ' + s.bank_account_name + ' |'].join('\n')
                : '| | 匯款資訊尚未設定，請直接與我們聯絡 |';

            subject = '【待付款】' + no + '　應付 NT$' + total;
            body = [
                '### 您的訂購單金額已確認',
                '',
                '| | |',
                '|---|---|',
                '| **訂購單號** | ' + no + ' |',
                '| **應付金額** | **NT$' + total + '** |',
                '',
                '**匯款資訊**',
                '',
                '| | |',
                '|---|---|',
                bank,
                '',
                '匯款備註可填單號 ' + no + ' 或您的姓名。',
                '匯款後請至訂購單頁面回報帳號末五碼，我們核對後會更新狀態。',
                '',
                '[前往訂購單](' + url + ')',
            ].join('\n');
        }
    } else if (isCvs) {
        const track = order.tracking_number || '（未提供）';
        const total = order.confirmed_total;
        const rows = [
            '| **訂購單號** | ' + no + ' |',
            '| **取貨門市** | ' + store + ' |',
            '| **物流單號** | ' + track + ' |',
        ];
        // 老闆沒按「確認報價」就直接出貨時 confirmed_total 是空的。寧可不講金額，
        // 也不要寄一封寫著「取貨時應付 NT$0」的信出去。
        if (total !== null && total !== undefined) {
            rows.push('| **取貨時應付** | **NT$' + total + '**（含運費） |');
        }

        subject = '【已出貨】' + no + '　請至門市取貨';
        body = [
            '### 您的包裹已寄出',
            '',
            '| | |',
            '|---|---|',
        ].concat(rows).concat([
            '',
            '包裹送達門市後，7-11 會以**簡訊**通知您。',
            '**請於到店後 7 天內取貨並付款**，逾期包裹會被退回。',
            '',
            '[查看訂購單](' + url + ')',
        ]).join('\n');
    } else {
        const track = order.tracking_number || '（未提供）';
        subject = '【已出貨】' + no;
        body = [
            '### 您的訂單已出貨',
            '',
            '| | |',
            '|---|---|',
            '| **訂購單號** | ' + no + ' |',
            '| **貨運單號** | ' + track + ' |',
            '',
            '可憑貨運單號向物流業者查詢配送進度。',
            '',
            '[查看訂購單](' + url + ')',
        ].join('\n');
    }

    return { to, subject, body };
};
