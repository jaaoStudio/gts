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
            // ⚠️ 超過 7-11 代收上限就不要寄這封。交貨便收不了這筆錢（上限 5,000／件，
            //    見 docs/adr/0006 規則 1），寄出去等於叫客人去櫃台付一筆付不掉的款。
            //    這張單得改宅配或拆單，那是老闆的判斷；程式只負責不要先把錯的數字寄走。
            //    ⚠️ 前台的 5,000 擋門比的是**小計**，而小計排除詢價品項，所以整車都是
            //    詢價品項的單進得來，這個判斷不是多餘的（why: docs/adr/0006 Consequences）。
            //    ⚠️ 5000 是 utils/orderTotals.js 的 CVS_IBON.maxCollectable 的第二份副本，
            //    沙箱 import 不到 repo，改上限要兩邊一起動。
            if (total > 5000) {
                throw new Error('skip: 超商單應付 ' + total + ' 超過代收上限 5000，請改宅配或拆單');
            }

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
        // 也不要寄一封寫著「取貨時應付 NT$0」的信出去。超過代收上限時同理只略過
        // 這一列而**不是整封不寄**（quoted 那邊是 throw）：貨都已經出了，門市、
        // 單號與 7 天期限是客人唯一一次拿得到的資訊，不能因為金額有問題就扣住。
        if (total !== null && total !== undefined && total <= 5000) {
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
