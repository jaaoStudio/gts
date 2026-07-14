# GTS Hardware Storefront

The customer-facing storefront for GTS Hardware (五金/工具電商). A Vue 3 SPA backed by a Directus CMS/API, with Google SSO for sign-in. This glossary fixes the ubiquitous language so code, UI copy, and docs agree on one word per concept.

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
