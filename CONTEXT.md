# GTS Hardware Storefront

The customer-facing storefront for GTS Hardware (五金/工具電商). A Vue 3 SPA backed by a Directus CMS/API, with Google SSO for sign-in. This glossary fixes the ubiquitous language so code, UI copy, and docs agree on one word per concept.

> **型錄 + 訂購單，仍然不是線上結帳站。**
> 客人可以把品項送成一張 **Order form**（訂購單），但**站上不收款**：老闆確認金額後，
> 客人依信中的匯款資訊轉帳。沒有線上刷卡、沒有即時庫存扣減、沒有物流串接。
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
A purchasable specification under a Product (Directus `variants`), where price and stock actually live. A Product has one or more Variants.
_Avoid_: SKU (a field on a Variant, not its name), 款式.

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

**Order status** (狀態):
One of 待確認 → 待付款 → 已付款 → 已出貨, plus 已取消. 已出貨 is the normal terminal
state; there is deliberately no 已完成 because nothing confirms receipt.
The stored keys are `pending` / `quoted` / `paid` / `shipped` / `cancelled`. Note that
`quoted` is the 待付款 state: the key names it from the Admin's side (已報價), the UI
label from the Customer's (該付錢了). Same state, two viewpoints — grep for both.
_Avoid_: inventing intermediate states — each one must correspond to something the
Customer actually sees change.

**External channel** (外部通路):
iOPEN Mall / 蝦皮 links stored on a Product. A Product may offer both an external channel
and the Order form; the shopper chooses. Those platforms provide no order-creation API, so
this is one-way outbound linking only.
_Avoid_: implying stock or price sync — there is none.
