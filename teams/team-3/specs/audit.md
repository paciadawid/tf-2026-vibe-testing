# Audit — FD-01 … FD-07 assertions against `spec/foodora-spec.md`

Each `expect(…)` is checked against the `spec` annotation of its test. The readings accepted in
`coverage.md` hold: the header Cart button counts units, a cart line's price may be the unit
price, and "pick exactly one" size means at most one is checked at a time.

Verdicts: **SPEC**: the spec line states the value. **RELATION**: a relationship the spec states,
with values read at run time. **COPIED**: a literal taken from the app. **WEAKER**: checks less
than the spec line says. **WRONG**: contradicts the spec.

## Assertions

| File:line | Assertion | Verdict | Why |
| --- | --- | --- | --- |
| helpers-fd-01.ts:16-17 | `Popular Restaurants` h2 visible; first card visible (openLanding) | SPEC | Setup. The heading is named in FD-01. |
| helpers-fd-03.ts:24 | exactly one card has text `20% OFF orders over $25` | SPEC | Setup guard. The promotion text is the spec's own example. |
| helpers-fd-03.ts:33-34 | h1 = card name; tabpanel visible (openRestaurant) | RELATION | Setup. The page opened is the card's restaurant. |
| helpers-fd-03.ts:50-51 | h1 = dish name; `Add to Cart` button visible (openDish) | RELATION | Setup. The dish opened is the one selected; **Add to Cart** is named in FD-04. |
| helpers-fd-05.ts:24,29 | `Popular Restaurants` visible; first available card visible | SPEC | Setup (availableRestaurants). |
| helpers-fd-05.ts:58,60 | h1 = restaurant name; first dish link visible (openMenu) | RELATION | Setup. |
| helpers-fd-05.ts:91 | `poll(cartCount).toBe(before + 1)` after quick-add | RELATION | Works as an assertion: FD-03 says the header count goes up by one. |
| helpers-fd-05.ts:98 | cart `dialog` visible after the Cart button | SPEC | FD-05: "the cart opens as a panel from the Cart button". |
| helpers-fd-05.ts:179-180 | URL `/checkout`; `Place Order` visible (goToCheckout) | SPEC | Setup. Both are named in FD-05/FD-06. |
| helpers-fd-05.ts:197 | `Order Confirmed!` heading visible (placeOrder) | SPEC | Setup. The heading is named in FD-07. |
| fd-01:17 | `cards.length > 0` | SPEC | The landing page lists restaurants. |
| fd-01:20 | card h3 has text `/\S/` | SPEC | Name shown. The spec gives no names to compare against. |
| fd-01:21 | first paragraph has a letter | SPEC | Cuisines shown. The spec does not list the cuisines per card. |
| fd-01:23 | text `0-5(.d)` visible | SPEC | Rating. |
| fd-01:24 | text `N-N min` visible | SPEC | "delivery time range". |
| fd-01:25 | text `$d.dd` or `Free` visible | SPEC | "delivery fee (or **Free**)". |
| fd-01:43 | some card matches `/\d+% OFF orders over \$\d+/` | WEAKER — fixed | Only checks that some card shows text shaped like a promotion. It does not check that the text is that restaurant's current promotion, or that a restaurant with no promotion shows none. **Fixed:** each available card compared with the promotion on its own page; a card whose page has none must show none. |
| fd-01:57 | URL `/restaurant/<id>` | SPEC | Spec path. |
| fd-01:58 | h1 = the selected card's name | RELATION | "opens that restaurant's page". |
| fd-01:74 | View All names = All-chip names | RELATION | FD-02: **All** is the full list. |
| fd-01:90 | subtitle `N don't deliver there` visible | SPEC | Spec wording. |
| fd-01:94 | badged cards count = N from subtitle | RELATION | "the subtitle counts them". |
| fd-01:95 | `counted > 0` | SPEC | Guard. The spec example is 1. |
| fd-01:105 | unavailable card greyed (grayscale/opacity) | SPEC | "greyed out". |
| fd-01:129 | an unavailable card is visible | SPEC | Setup. |
| fd-01:137 | URL did not change to `/restaurant/` | SPEC | "It cannot be opened". A `bug` test, but it expects the spec. |
| fd-01:138 | no h1 with the restaurant's name | SPEC | Same rule. |
| fd-02:12 | (namesFor) list differs from the unfiltered list | RELATION | Results update while typing. |
| fd-02:42 | list changed after typing a restaurant name | RELATION | Search acts. |
| fd-02:43 | results contain that restaurant | RELATION | Finds by restaurant name. |
| fd-02:50-51 | tab / h3 visible on each restaurant page | SPEC | Setup (menu loaded). |
| fd-02:57 | a restaurant serving Classic Beef Burger exists | SPEC | The dish is named in the spec. |
| fd-02:60 | `Classic Beef` results contain that restaurant | SPEC | Spec example. A `bug` test, but it expects the spec. |
| fd-02:74 | `burger` has results | RELATION | Guard, so the equality below is not trivially true. |
| fd-02:77 | BURGER results = burger results | RELATION | Case-insensitive. |
| fd-02:95 | list changed while typing (no Search press) | RELATION | "update while the customer types". |
| fd-02:97 | typed results non-empty | RELATION | Guard. |
| fd-02:100 | after Search, same list | RELATION | "gives the same result". |
| fd-02:120-122 | chip list = default-list cards having that cuisine | RELATION | Chip shows exactly those serving the cuisine. The reference is the default landing list, not a list the spec guarantees is complete. |
| fd-02:124 | every shown card lists the cuisine | RELATION | "only restaurants serving that cuisine". |
| fd-02:138 | Pizza chip changes the list | RELATION | Guard. |
| fd-02:141 | All chip list = default landing list | RELATION | "All shows every restaurant". The reference is the default landing list, so a restaurant missing from both views would go unnoticed. |
| fd-02:168 | Pizza chip = Pizza cards | RELATION | Setup. |
| fd-02:173 | Pizza + burger = intersection | RELATION | "match both". A `bug` test, but it expects the spec. |
| fd-02:174 | if empty, `No restaurants found` | SPEC | Spec text. |
| fd-02:191 | `No restaurants found` visible | SPEC | Spec text. |
| fd-02:192 | hint `/try (another\|a different) … (search\|filter)/` | SPEC | "a hint to try another search or filter". |
| fd-02:193 | no cards | SPEC | Nothing matches. |
| fd-03:23 | card rating/time/fee parsed (`toBeTruthy`) | RELATION | Guard on values read from the app, which are then compared exactly. |
| fd-03:27 | h1 = card name | RELATION | Name. |
| fd-03:28 | card cuisines text visible | RELATION | Cuisines. |
| fd-03:29 | card rating visible | RELATION | Rating. |
| fd-03:30 | card time range visible | RELATION | Delivery time. |
| fd-03:31 | `Delivery Fee` label visible | SPEC | The spec's words for the field. |
| fd-03:32 | card fee visible | RELATION | Delivery fee. |
| fd-03:33 | `20% OFF orders over $25` visible | SPEC | Spec example promotion. |
| fd-03:50 | a tab each for Burgers, Sides, Drinks | SPEC | Categories named in the spec. |
| fd-03:52 | clicked tab `aria-selected` | SPEC | They are tabs. |
| fd-03:54-55 | tabpanel named after category visible, has a dish | SPEC | The menu is grouped by tab. |
| fd-03:71 | tabs > 0 | SPEC | Guard. |
| fd-03:75 | each tab has dishes | SPEC | Guard. |
| fd-03:77 | dish heading has text | SPEC | Name. |
| fd-03:78 | dish paragraph has text | SPEC | Short description. |
| fd-03:79 | dish contains `$d.dd` | SPEC | Price. |
| fd-03:80-81 | exactly one visible button in the dish card | SPEC | The quick-add button. Its use is proven at fd-03:107. |
| fd-03:106 | notification contains the dish name | RELATION | "confirms it". |
| fd-03:107 | cart count = before + 1 | RELATION | Spec rule. |
| fd-03:108 | URL unchanged | RELATION | Quick-add does not open the dish page. |
| fd-03:112 | the dish is a line in the cart | RELATION | "puts one of that dish into the cart". Quantity 1 follows from the fresh cart and +1. |
| fd-03:131 | URL `/product/<id>` | SPEC | Spec path. |
| fd-03:132 | h1 = dish name | RELATION | "its detail page". |
| fd-03:153 | first dish visible | SPEC | Setup. |
| fd-03:155 | buttons > 0 | SPEC | Guard. |
| fd-03:157 | every button `toHaveAccessibleName(/\S/)` | WEAKER — fixed | The spec wants a name "that says what it does". Any non-empty name passes, e.g. "button" or "icon". **Fixed:** quick-add buttons must also be named with what they do (`/add/i`); the non-empty check stays for every button. |
| fd-04:39 | URL `/product/<id>` | SPEC | Spec path. |
| fd-04:40 | img named after the dish | RELATION | Photo. |
| fd-04:41 | card description visible | RELATION | Description. |
| fd-04:42 | text `/\d\.\d.*reviews/` | COPIED — fixed | The spec asks for the rating. The word "reviews" beside it comes from the app's layout. **Fixed:** now `/\b[0-5]\.\d\b/` — the rating only. |
| fd-04:43 | `Prep(aration) Time N` | SPEC | Preparation time. |
| fd-04:44 | `Calories N` | SPEC | Calories. |
| fd-04:62-63 | Large checked, Regular not | SPEC | `Large +$3.00` is the spec's example; at most one checked (accepted reading). |
| fd-04:66-67 | Regular checked, Large not | SPEC | Same. |
| fd-04:93-94 | Extra Cheese, Bacon unchecked at start | SPEC | "including none". |
| fd-04:99-100 | both Extra Cheese and Bacon checked | SPEC | "Extra Cheese **and** Bacon". A `bug` test, but it expects the spec. |
| fd-04:109 | quantity `1` | SPEC | Minimum 1. |
| fd-04:110 | − disabled at 1 | SPEC | Cannot go below 1. |
| fd-04:113 | quantity `2` after + | SPEC | "or more". |
| fd-04:116-117 | back to `1`, − disabled | SPEC | Same. |
| fd-04:141 | price = base with Regular | RELATION | Button shows the configured price. |
| fd-04:144 | + Large surcharge | RELATION | Size change. The surcharge is read from the option. |
| fd-04:147 | + cheese surcharge | RELATION | Add-on change. |
| fd-04:150 | × 2 | RELATION | Quantity change. |
| fd-04:153 | back to Regular, × 2 | RELATION | Updates on every change. |
| fd-04:165 | tab `aria-selected` | SPEC | Tab names are in the spec. |
| fd-04:167-168 | named tabpanel visible, has text | SPEC | The tab shows content. |
| fd-04:190 | Cart button visible on the dish page | SPEC | "cart is reachable". A `bug` test, but it expects the spec. |
| fd-04:192 | dialog named `/Your Cart/` visible | COPIED — fixed | "Your Cart" is the app's panel title. The spec only says the cart opens as a panel. **Fixed:** now any `dialog` visible — the panel, not its title. |
| fd-05:46 | count 0 at start | SPEC | Empty cart. |
| fd-05:50 | Cart button `toHaveText(/1/)` | WEAKER — fixed | A substring match: `Cart 12` or `Cart 10` would pass. The exact +1 check lives in helpers-fd-05.ts:91. **Fixed:** now `expect.poll(() => cartCount(page)).toBe(1)`. |
| fd-05:52 | Cart button `toHaveText(/2/)` | WEAKER — fixed | Same. **Fixed:** now `.toBe(2)`. |
| fd-05:55 | Cart button `toHaveText(/3/)` | WEAKER — fixed | Same. **Fixed:** now `.toBe(3)`; the test also opens the panel from the button. |
| fd-05:72 | line h4 = dish | RELATION | Dish. |
| fd-05:73 | line shows the restaurant name | RELATION | Restaurant. |
| fd-05:75 | line shows the dish's menu price | RELATION | Price (unit price, accepted reading). |
| fd-05:76 | line quantity `1` | RELATION | One added. |
| fd-05:80 | `2` after + | RELATION | Stepper. |
| fd-05:82 | `1` after − | RELATION | Stepper. |
| fd-05:84 | line gone after trash | RELATION | "a way to remove it". |
| fd-05:104-105 | both lines gone after Clear Cart | SPEC | "removes everything". |
| fd-05:107 | count 0 | RELATION | Same. |
| fd-05:119 | the dish line visible | RELATION | Setup. |
| fd-05:120 | no Clear Cart | SPEC | "with a single dish it is not shown". |
| fd-05:140 | Subtotal/Delivery Fee/Service Fee/Total labels | SPEC | Labels named in the spec. |
| fd-05:143 | subtotal = sum of the two prices | RELATION | Subtotal. |
| fd-05:144 | total = sub − disc + del + svc | RELATION | Spec formula. |
| fd-05:162 | a restaurant advertises Free | SPEC | Guard; **Free** is in the spec. |
| fd-05:169 | cart delivery = advertised fee (Free → 0) | RELATION | Spec rule. A `bug` test, but it expects the spec. |
| fd-05:174 | count 0 after remove | RELATION | Setup between restaurants. |
| fd-05:187 | service fee = 150 | SPEC | $1.50. |
| fd-05:193 | subtotal = first + 2 × second | RELATION | Setup: the order grew. |
| fd-05:194 | service fee still 150 | SPEC | Flat per order. |
| fd-05:222 | low subtotal ≤ $25 | RELATION | Guard. |
| fd-05:223 | no discount line | SPEC | Not past $25. |
| fd-05:224 | total = sub + del + svc | RELATION | No discount. |
| fd-05:234 | subtotal > $25 | RELATION | Guard. |
| fd-05:235 | one discount line | SPEC | "shows as its own line". A `bug` test, but it expects the spec. |
| fd-05:237 | discount = 20 % of subtotal | RELATION | Spec rule. |
| fd-05:238 | total = sub − 20 % + del + svc | RELATION | Spec formula. |
| fd-05:250 | URL `/checkout` | SPEC | Spec path. |
| fd-05:251 | h1 `Checkout` | SPEC | The page the spec calls checkout. |
| fd-05:266 | text `/empty/i` in the panel | SPEC | "says so". |
| fd-05:267-268 | no checkout button/link | SPEC | "**no** way to check out". |
| fd-05:271 | dialog closed after Continue Shopping | SPEC | Way back. |
| fd-05:272 | `Popular Restaurants` visible | WEAKER — fixed | The cart was opened from `/`, so the landing page was already behind the panel. The test does not show the button leads back to the restaurants. **Fixed:** empty cart opened on a restaurant page; expects URL `/` and the list after the way back — red: bug annotated (Continue Shopping only closes the panel). |
| fd-05:287 | menu visible after reload | SPEC | Setup. |
| fd-05:288 | count 1 after reload | RELATION | Survives reload. A `bug` test, but it expects the spec. |
| fd-05:290 | dish line after reload | RELATION | Same. |
| fd-06:37 | `Delivery Address` heading | SPEC | Spec name. |
| fd-06:39 | Full Name, Street Address, City, Phone Number, Apt / Suite textboxes | SPEC | Spec field table. |
| fd-06:41 | Delivery Instructions textbox | SPEC | Spec field table. |
| fd-06:42 | `Payment Method` heading | SPEC | Spec name. |
| fd-06:43 | 3 radios | SPEC | Three methods. The names are checked in the next test. |
| fd-06:44 | `Order Summary` heading | SPEC | Spec name. |
| fd-06:52 | summary shows the first dish's name | WEAKER — fixed | "the same lines as the cart", but only the dish name is compared, not the line's quantity or price. **Fixed:** each summary line checked as `1x <dish>` at the price its menu gave. |
| fd-06:53 | summary shows the second dish's name | WEAKER — fixed | Same. **Fixed:** same. |
| fd-06:55 | summary amounts = cart amounts | RELATION | Same lines and totals. |
| fd-06:75 | 3 radios | SPEC | Three methods. |
| fd-06:76-78 | card checked; cash, Apple Pay not | SPEC | Card is the default. |
| fd-06:81-82 | cash checked, card not | SPEC | "one of". |
| fd-06:111 | soft: `Order Confirmed!` count 0 | WEAKER — fixed | `toHaveCount(0)` passes the moment it is checked. If the app renders the confirmation after a delay, a placed order goes unseen. **Fixed:** waits for the message or the confirmation first, then no confirmation and URL still `/checkout`. |
| fd-06:114 | soft: any text `/required\|please (enter\|provide)\|is needed/` | WEAKER — fixed | Takes the first such text anywhere on the page. It is not tied to the missing field and need not say which field is needed. **Fixed:** message must name the missing field and say it is needed. |
| fd-06:133-134 | Apt / Suite, Delivery Instructions empty | SPEC | Optional fields. |
| fd-06:136 | `Order Confirmed!` | SPEC | The order places. |
| fd-06:150 | text `/empty/i` on `/checkout` | SPEC | Empty state. |
| fd-06:151-152 | no Place Order, no Full Name box | SPEC | "never a form". |
| fd-06:155 | `Popular Restaurants` after the way-back button | SPEC | "a way back to the restaurants". |
| fd-07:9 | URL `/order/<number>` (openTracking) | SPEC | Spec path. |
| fd-07:10 | `total paid` visible (openTracking) | SPEC | Setup. |
| fd-07:26 | `Order Confirmed!` | SPEC | Spec text. |
| fd-07:27 | `/order has been placed\|order was placed/` | SPEC | "a line saying the order was placed". |
| fd-07:28-29 | `estimated delivery` visible with a digit | SPEC | Estimated delivery time. The spec gives no value. |
| fd-07:30 | text `/Order #\S+/` visible | COPIED — fixed | "Order #" is the app's label, and any token after it passes. The spec's form of the number is `FDR-` plus six characters. **Fixed:** now `/FDR-[A-Z0-9]{6}/`. |
| fd-07:31 | total text = checkout total | RELATION | The total. |
| fd-07:45 | `/^FDR-[A-Z0-9]{6}$/` | SPEC | Spec format. |
| fd-07:58 | second number ≠ first | RELATION | "every order gets a new one". |
| fd-07:68 | tracking shows the number | RELATION | Tracking page for that order. |
| fd-07:78-79 | URL `/`, `Popular Restaurants` | SPEC | Landing page. |
| fd-07:91 | ETA parsed (`toBeTruthy`) | RELATION | Guard on a value used exactly at :97. |
| fd-07:94 | number shown | RELATION | Order number. |
| fd-07:95 | total paid = checkout total | RELATION | Total paid. |
| fd-07:96 | `estimated delivery` visible | SPEC | Label. |
| fd-07:97 | same ETA as confirmation | RELATION | Estimated delivery. |
| fd-07:113 | each of the five stages visible | SPEC | Stage names. |
| fd-07:119 | all found in the last list | SPEC | Guard for the order check. |
| fd-07:120 | positions ascending | SPEC | "in order". |
| fd-07:140 | some h1/h2 visible on `/order/FDR-000000` | SPEC | Setup (the page rendered). |
| fd-07:141 | no `total paid` | SPEC | No tracking page. A `bug` test, but it expects the spec. |
| fd-07:143 | no stages 2–5 | SPEC | Same. |
| fd-07:165 | total paid = checkout total | RELATION | Total paid. |
| fd-07:170 | `total paid` visible | SPEC | Setup. |
| fd-07:171 | `?total=0.01` → still the checkout total | RELATION | "cannot be changed". A `bug` test, but it expects the spec. |
| fd-07:174 | `total paid` visible | SPEC | Setup. |
| fd-07:175 | no query → still the checkout total | RELATION | Same. |

No `bug`-annotated test accepts the app's behaviour: every one expects what the spec says. So no
row is WRONG.

## Rules quoted in a `spec` annotation that no `expect` checks

- **fd-01:36**: "A card shows the restaurant's current promotion **when it has one**". No
  expect checks that the promotion is the one the restaurant has, or that a restaurant without a
  promotion shows none.
- **fd-05:40**: "The cart opens as a panel from the **Cart** button in the header". This test
  has no expect for it. It is checked only in setup, by `openCart`
  (helpers-fd-05.ts:98) in other tests.
- **fd-03:147**: "an accessible name **that says what it does**". Only a non-empty name is
  checked (see fd-03:157).
- **fd-06:92**: "each missing field shows a message **saying what is needed**". The message is
  not tied to the missing field (see fd-06:114).
- **fd-06:21**: "an **Order Summary** with the same lines as the cart". Line quantities and
  prices are not compared (see fd-06:52-53).
- **fd-05:260**: "offers a way back to the restaurants". Not really shown, because the test starts
  on the landing page (see fd-05:272).

## Counts

| Verdict | Rows |
| --- | --- |
| SPEC | 99 |
| RELATION | 71 |
| COPIED | 3 (all fixed, 0 open) |
| WEAKER | 10 (all fixed, 0 open) |
| WRONG | 0 |
| **Total** | **183** |

Rows that group several `expect`s on adjacent lines (for example `fd-04:62-63`) count once. The
counts are by row.


## Fixes

Every COPIED and WEAKER row above is marked `fixed`, and the rules listed as unchecked are now
checked by those fixes (fd-01 promotion, fd-03 names, fd-05 panel and way back, fd-06 lines and
messages). The changed files were run again with `run-report --retries=0`. One fix turned a test
red, and that is a finding: FD-05 · empty cart says so and offers no checkout (bug annotated).
COPIED, WEAKER and WRONG open: 0.
