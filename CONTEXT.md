# GTS Hardware Storefront

The customer-facing storefront for GTS Hardware (五金/工具電商). A Vue 3 SPA backed by a Directus CMS/API, with Google SSO for sign-in. This glossary fixes the ubiquitous language so code, UI copy, and docs agree on one word per concept.

> **型錄 + 訂購單，仍然不是線上結帳站。**
> 客人可以把品項送成一張 **Order form**（訂購單），但**站上不收款**：老闆確認金額後，
> 客人依信中的匯款資訊轉帳，或在超商取貨時付給店員（見 **Delivery method**）。
> 沒有線上刷卡、沒有即時庫存扣減、沒有物流串接。
> 部分商品另有外部通路連結（iOPEN Mall / 蝦皮），那是導流出去、不在本站成交。

## Language

### People

**User**:
The sign-in identity, backed by Directus `directus_users`. Carries the email, avatar, and role — the layer that decides "can this person sign in, and are they an Admin?".
_Avoid_: account, member (when referring to the auth identity).

**Customer**:
The business profile of a shopper (Directus `customers` collection), holding company name, tax id, phone, shipping/billing address, and level. Exactly one Customer belongs to one User. "**會員**" is the Chinese UI label for this same concept — not a separate entity.
Every User has one — the profile-creation flow builds a row for *every* signed-in account, Admins included. So a signed-in User with no Customer is never a normal state; it is always a fault, and the code must say which fault (see **Customer profile status**).
_Avoid_: member (as a distinct code entity), client, buyer.

**Customer profile status** (`authStore.customerStatus`):
Which of the mutually exclusive facts about the current User's Customer holds. `customer === null` alone cannot express this, and collapsing the last two is the bug it exists to prevent.
- `idle` — nobody is signed in; the question does not apply.
- `loading` — the read is in flight.
- `ready` — the profile is loaded.
- `missing` — the read succeeded and found no row. Per the invariant above this means the creation flow broke; signing in again will not fix it, so the shopper is told to contact us.
- `error` — the read itself failed (network / session). Retrying usually fixes it, so retrying is what we offer.
_Avoid_: treating a null Customer as "this shopper has no profile"; "not found" as a synonym for `error`.

**Admin**:
Whoever runs the shop from Directus's own admin app — confirms prices, sets 運費, moves an Order form along. Not a separate kind of person: an Admin signs into the storefront exactly like any other User, and sees exactly what any other User sees. **The storefront has no notion of who is an Admin** and no back-office of its own; everyone lands on their Customer account.
_Avoid_: staff, manager, superuser; implying the storefront routes Admins anywhere different.

### Catalog

**Product** (商品):
A catalogue item (Directus `products`). A Product is the thing shoppers browse and open; it does not itself hold a price or stock.
_Avoid_: 產品, item, 貨品.

**Variant** (規格):
A purchasable specification under a Product (Directus `product_variants`), where price and stock actually live. A Product has one or more Variants.
_Avoid_: SKU (a field on a Variant, not its name), 款式.

**配件** (Accessory, `product_variants.is_accessory`):
一個只服務於本 Product、但**不與其他選項互斥**的品項：專用替刃、專用螺絲組。客人買
「一支 270mm 鋸子」的同時會買「兩包替刃」與「一組螺絲」，三者一起成立。相對地，
真正的 **Variant** 之間是**三選一**：買了 240mm 就不會再買 270mm。
判準只有一句：**這一筆跟同商品其他筆是「三選一」還是「可以一起買」？**
配件與規格仍同存於 `product_variants`，靠這個旗標分辨。預設 `false`（＝視為規格），
所以未經人工判斷的資料維持現狀，而不是被猜成配件。
⚠️ **儲存端已分，呈現端還沒**：規格選擇器目前仍用一組單選鈕服務兩者，客人要加購得在
同一組按鈕裡來回點。標記是人工逐件進行中（issue #34）。
_Avoid_: 把配件叫成規格／款式；把「同一頁賣的東西」當成「同一個東西的不同樣態」；
未標記就當成「已確認是規格」——那只是還沒有人看過。

**規格圖** (Variant image, `product_variants.variant_image`):
只拍某一個 Variant、不拍別的那張照片。一個 Variant 最多一張。
_Avoid_: 主圖 (那是 Product 的)、縮圖 (那是尺寸不是用途)。

**共用圖** (`products.gallery`):
**不屬於任何單一 Variant** 的商品照片：使用情境、尺寸對照表、材質特寫、整組總覽。
判準只有一句：**這張圖能不能只配給其中一個 Variant？能，它就該是規格圖，不該放這裡。**
放錯的代價很具體——客人切到 A 規格，卻在下方看到 B 規格的照片，而站上唯一能告訴他
「你現在要買的是哪一個」的，就只剩價格旁邊那行字。
⚠️ **既有資料尚未符合這條規則**：匯入時把規格照一併倒進了 gallery，所以前台是分段標示
而非保證，資料清到哪畫面就乾淨到哪。
注意前台的「**商品其他照片**」那一段**不等於共用圖**，它是「主圖 ＋ 共用圖」的顯示分組。
面向客人時不講「共用圖」這個詞 (那是我們描述資料的說法，不是逛街的人的說法)。
_Avoid_: 相簿、附圖 (聽起來像「多放幾張沒差」)；把 `gallery` 當成放「主圖以外的全部」
的地方。

**CVS-shippable** (超商可寄, `product_variants.can_ship_cvs`):
Whether a Variant is judged to fit 7-11's parcel limits. A judgement the Admin makes from
experience, **not a measurement** — the catalogue records no weight or dimensions, and the
real check happens at the counter anyway. Defaults to `false`, so an unreviewed Variant
costs the shopper an option rather than a returned parcel.
_Avoid_: implying the flag is derived from stored dimensions; 材積 (nothing records it).

**Display price** (顯示價):
The price shown for a Product, defined as the lowest price among its Variants (the "起" / from-price). A Product with no priced Variant is shown as 詢價 instead of a number.
_Avoid_: implying a Product owns a single price.

**詢價** (Quote-on-request):
The state of a Product that has no priced Variant, surfaced to shoppers as "詢價" in place of a Display price. Signals "contact us for a price" rather than "free" or "unavailable".
_Avoid_: inquiry, ask price, N/A.

**Category** (分類):
A node in the browse tree (Directus `categories`), linked to a parent to form the hierarchy and addressed by slug. Drives the nav menu, sidebar, and breadcrumb.
_Avoid_: department, collection.

**Tag** (標籤):
A coloured label attached to Products (Directus `tags`, name + colour), many-to-many. On a card, one Tag is rendered as a small coloured chip.
_Avoid_: label, flag, badge (the chip is a rendering of a Tag, not a concept of its own).

**Featured** (精選):
A Product carrying the Tag named "精選"; the home page "本月精選" section is exactly this set. It is a convention over the Tag *name* string, not a dedicated flag.
_Avoid_: promoted, highlighted, spotlight.

### Ordering

**Order form** (訂購單):
A submitted request to buy (Directus `orders`), created by a signed-in Customer from their
cart. It is **not** a completed transaction — the Display prices on it are 參考價 and the
amount only becomes binding once the Admin confirms it. Addressed by an **Order number**.
_Avoid_: 訂單 alone when the distinction matters, cart (that is the pre-submission state),
詢價單 (詢價 already means something else — see above).

**Order number** (訂購單號):
The customer-facing identifier, format `GTS-YYMMDD-####`, derived from the row's
auto-increment id. Short enough to read aloud on the phone.
_Avoid_: order id (that is the internal integer).

**Delivery method** (交貨方式):
How an Order form gets to the Customer **and how it gets paid for** — one choice, not
two (`orders.delivery_method`: `cvs_cod` / `home_delivery` / `pickup`). The pairings are
locked: 超商取貨付款 is always cash-at-the-counter, 宅配 is always 匯款, 自取 is always
cash in the shop. Naming the two halves separately would invent
combinations the shop does not offer, and each one would have to be blocked again in the
form, the emails, and the status copy (why: `docs/adr/0006`).
_Avoid_: 配送方式 / 付款方式 as separate concepts; shipping method (the old field of that
name is gone).

**代收金額** (Amount collected):
What the 7-11 counter takes from the Customer on a 超商取貨付款 order — the same figure
as the **Amount due**, seen from the courier's side. It is what the 交貨便 fee tier is
keyed on, and because the fee is itself part of it, the tier has to be resolved by
iteration rather than read straight off the subtotal.
_Avoid_: 貨款, 總價; treating it as a separate amount from 應付金額.

**棄件** (Unclaimed):
A 超商取貨付款 parcel the Customer never collects within the hold period, sent back to
the shop's own store. Not a cancellation the Customer makes — nothing is clicked, the
order simply stops. The outbound freight is still charged and the invoice still has to be
voided or credited, so it costs the shop money and time even though no sale happened.
_Avoid_: 退貨 (that is a Customer returning goods they already took), 取消.

**Confirmed price** (確認單價):
The per-item price the Admin sets after checking stock and current cost. Takes precedence
over the snapshot the Customer saw.
_Avoid_: 售價 (that is the catalogue price), 總價 when quote-only items are present.

**Reference subtotal** (參考小計):
The priced-item total captured **at submission** (`orders.subtotal`) — a record of what
the Customer saw, nothing more. Once the Admin adjusts any 確認單價 it stops describing
the money owed, so it **takes no part in the Amount due calculation**.
_Avoid_: listing it in the same column as the figures that do add up — a Customer will
try to total it against 運費 and 折扣, and land short by exactly the price adjustment.

**Confirmed subtotal** (確認後小計):
`Σ 確認單價 × 數量` — the base the Amount due is built from. Derived, not stored: it is
computed from the order's items whenever it is shown.
_Avoid_: 小計 unqualified (it collides with 參考小計 — always say which one).

**Amount due** (應付金額):
`確認後小計 − 折扣 + 運費`, recalculated on every save. Binding only once the Admin has
confirmed; before that the Order form has no Amount due at all.
_Avoid_: 總價, 應付 (as a bare noun).

**Estimated shipping** (預估運費):
What the cart shows a shopper before submitting, derived from the shipping rule (a flat
per-box fee, waived above a threshold — both held in site settings). It assumes **one
box**, because nothing in the catalogue records weight or volume. It is a forecast and
**takes no part in the Amount due** — the 運費 there is the real figure the Admin enters
after looking at what actually has to be packed. Withheld entirely when the priced items
alone cannot settle the question: below the threshold with 詢價 items present, the
subtotal is not the order's real value, so no number is shown.
Everything above describes the 宅配 rule only. 超商取貨付款 has its own — a tier read off
7-11's published table, with **no free-shipping threshold at all**, because that threshold
is the shop subsidising its own courier bill and 7-11's fee is deducted from the 代收金額
before the shop ever sees it (why: `docs/adr/0006`).
_Avoid_: 運費 unqualified on the cart side (it reads as a commitment); presenting it as
the amount the shopper will pay; speaking of "the" shipping rule as though there were one.

**Order status** (狀態):
One of 待確認 → 待付款 → 已付款 → 已出貨, plus 已取消. 已出貨 is the normal terminal
state; there is deliberately no 已完成 because nothing confirms receipt.
The stored keys are `pending` / `quoted` / `paid` / `shipped` / `cancelled`. Note that
`quoted` is the 待付款 state: the key names it from the Admin's side (已報價), the UI
label from the Customer's (該付錢了). Same state, two viewpoints — grep for both.
超商取貨付款 orders run `pending → quoted → shipped` and **never reach `paid`**: the money
waits for the Customer to collect and then for the courier's weekly payout, so nothing has
arrived at the moment of shipping. `quoted` therefore carries a third viewpoint — 已確認、
等出貨 — on the same stored key, with only the UI copy branching on **Delivery method**
(why: `docs/adr/0006`).
_Avoid_: inventing intermediate states — each one must correspond to something the
Customer actually sees change.

**Conversion** (轉換):
In analytics, the moment an Order form is successfully created — **not** payment, and not
the Admin's price confirmation. Those two happen in Directus with no browser present, so
the storefront can never observe them. Reported to GA4 as `generate_lead`, deliberately
carrying no monetary value (why: `docs/adr/0005`).
_Avoid_: treating GA4's `purchase` event or any revenue figure as meaningful here — the
real money is settled in Directus and never reaches the browser.

**External channel** (外部通路):
iOPEN Mall / 蝦皮 links stored on a Product. A Product may offer both an external channel
and the Order form; the shopper chooses. Those platforms provide no order-creation API, so
this is one-way outbound linking only.
_Avoid_: implying stock or price sync — there is none.
