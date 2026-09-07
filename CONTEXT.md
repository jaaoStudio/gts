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
_Avoid_: member (as a distinct code entity), client, buyer.

**Admin**:
A User whose Directus role has `admin_access` — not a separate kind of person. Admins are routed to the back-office; everyone else to their Customer account.
_Avoid_: staff, manager, superuser.

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
over the snapshot the Customer saw. The **Amount due** (應付金額) is
`Σ 確認單價 × 數量 − 折扣 + 運費`, recalculated on every save.
_Avoid_: 售價 (that is the catalogue price), 總價 when quote-only items are present.

**Order status** (狀態):
One of 待確認 → 待付款 → 已付款 → 已出貨, plus 已取消. 已出貨 is the normal terminal
state; there is deliberately no 已完成 because nothing confirms receipt.
_Avoid_: inventing intermediate states — each one must correspond to something the
Customer actually sees change.

**External channel** (外部通路):
iOPEN Mall / 蝦皮 links stored on a Product. A Product may offer both an external channel
and the Order form; the shopper chooses. Those platforms provide no order-creation API, so
this is one-way outbound linking only.
_Avoid_: implying stock or price sync — there is none.
