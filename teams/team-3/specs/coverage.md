# Coverage

Scope of this run: FD-01 … FD-07 (FD-08 covered in the previous run). Rules are split from
`spec/foodora-spec.md` (one bullet = one rule). Exploration notes: `specs/fd-0N.md`.

| ID | Rule (spec words, shortened) | Test title | Status |
| --- | --- | --- | --- |
| FD-01 | Card shows name, cuisines, rating, delivery time range, delivery fee (or Free) | FD-01 · each restaurant card shows name, cuisines, rating, delivery time and fee | pass |
| FD-01 | Card shows the current promotion when it has one | FD-01 · a card shows the restaurant's current promotion | pass |
| FD-01 | Selecting a card opens that restaurant's page | FD-01 · selecting a card opens that restaurant's page | pass |
| FD-01 | View All shows the full list of restaurants | FD-01 · view all shows the full list of restaurants | pass |
| FD-01 | Undeliverable restaurant greyed out with Not available badge; subtitle counts them | FD-01 · an undeliverable restaurant is greyed out, badged and counted in the subtitle | pass |
| FD-01 | An unavailable restaurant cannot be opened | FD-01 · an unavailable restaurant cannot be opened | fail — bug |
| FD-02 | Search finds by restaurant name or dish name ("Classic Beef") | FD-02 · search finds restaurants by restaurant name and by dish name | fail — bug |
| FD-02 | Search ignores case (burger = BURGER) | FD-02 · search ignores upper and lower case | pass |
| FD-02 | Results update while typing; Search button gives the same result | FD-02 · results update while typing and the search button gives the same result | pass |
| FD-02 | Cuisine chips show only restaurants serving that cuisine | FD-02 · a cuisine chip shows only restaurants serving that cuisine | pass |
| FD-02 | All shows every restaurant | FD-02 · the all chip shows every restaurant | pass |
| FD-02 | Search and chip apply together (Pizza + "burger") | FD-02 · a search and a cuisine chip apply together | fail — bug |
| FD-02 | Nothing matches → No restaurants found with a hint | FD-02 · no match shows no restaurants found with a hint | pass |
| FD-03 | Restaurant page shows name, cuisines, rating, delivery time, delivery fee and promotion | FD-03 · restaurant page shows name, cuisines, rating, delivery time, fee and promotion | pass |
| FD-03 | Menu is grouped into category tabs (Burgers, Sides, Drinks) | FD-03 · menu is grouped into category tabs | pass |
| FD-03 | Each dish shows name, short description, price and a quick-add + button | FD-03 · each dish shows name, description, price and a quick-add button | pass |
| FD-03 | Quick-add puts one of that dish in the cart, confirms it, header cart count goes up by one | FD-03 · quick-add puts one dish in the cart, confirms it and raises the cart count by one | pass |
| FD-03 | Selecting the dish opens its detail page | FD-03 · selecting a dish opens its detail page | pass |
| FD-03 | Every button has an accessible name saying what it does, including icon-only quick-add | FD-03 · every button on the restaurant page has an accessible name | fail — bug |
| FD-04 | Dish page shows photo, description, rating, preparation time and calories | FD-04 · dish page shows photo, description, rating, preparation time and calories | pass |
| FD-04 | Size: pick exactly one (Regular or Large +$3.00) | FD-04 · exactly one size can be picked | pass |
| FD-04 | Add-ons: any combination, including none (Extra Cheese and Bacon) | FD-04 · several add-ons can be picked together | fail — bug |
| FD-04 | Quantity: 1 or more | FD-04 · quantity is 1 or more | pass |
| FD-04 | Add to Cart button shows the configured price and updates with size, add-ons and quantity | FD-04 · add to cart button shows the configured price and follows every change | pass |
| FD-04 | Tabs show Ingredients, Reviews and Nutrition | FD-04 · tabs show ingredients, reviews and nutrition | pass |
| FD-04 | Cart is reachable from the dish page | FD-04 · cart is reachable from the dish page | fail — bug |
| FD-05 | Cart button in the header shows how many items are in the cart | FD-05 · cart button shows the number of items in the cart | pass |
| FD-05 | Each line shows dish, restaurant, price, − / + stepper and a way to remove it | FD-05 · each cart line shows dish, restaurant, price, stepper and remove | pass |
| FD-05 | With two or more different dishes, Clear Cart appears and removes everything | FD-05 · clear cart appears with two dishes and empties the cart | pass |
| FD-05 | With a single dish, Clear Cart is not shown | FD-05 · clear cart is hidden with a single dish | pass |
| FD-05 | Summary shows Subtotal, Delivery Fee, Service Fee, Total; Total = Subtotal − discount + Delivery + Service | FD-05 · summary shows all lines and the total adds up | pass |
| FD-05 | Delivery Fee is the fee the restaurant advertises; Free means $0.00 | FD-05 · delivery fee matches the restaurant and free is zero | fail — bug |
| FD-05 | Service Fee is a flat $1.50 per order | FD-05 · service fee is a flat amount per order | pass |
| FD-05 | 20% OFF orders over $25 takes 20 % off once subtotal passes $25, shown as its own line | FD-05 · promotion takes 20% off above $25 and not below | fail — bug |
| FD-05 | Proceed to Checkout takes the customer to checkout | FD-05 · proceed to checkout opens checkout | pass |
| FD-05 | Empty cart says so, offers a way back, and no way to check out | FD-05 · empty cart says so and offers no checkout | fail — bug |
| FD-05 | The cart survives a page reload | FD-05 · cart survives a page reload | fail — bug |
| FD-06 | Checkout has Delivery Address form, Payment Method choice and Order Summary with the cart's lines | FD-06 · checkout shows address form, payment choice and matching order summary | pass |
| FD-06 | Payment method is Credit / Debit Card (default), Cash on Delivery or Apple Pay | FD-06 · payment methods offered with card selected by default | pass |
| FD-06 | Place Order only places the order when every required field is filled; each missing field shows a message | FD-06 · place order is refused while a required field is empty | fail — bug |
| FD-06 | Apt / Suite and Delivery Instructions are optional | FD-06 · order places with optional fields blank | pass |
| FD-06 | Checkout opened with an empty cart shows an empty state with a way back | FD-06 · checkout with an empty cart shows an empty state | pass |
| FD-07 | Confirmation shows Order Confirmed!, placed line, estimated delivery, order number and total | FD-07 · confirmation shows heading, message, delivery time, number and total | pass |
| FD-07 | Order numbers look like FDR- plus six upper-case letters or digits | FD-07 · order number is FDR- followed by six characters | pass |
| FD-07 | Every order gets a new order number | FD-07 · every order gets a new order number | pass |
| FD-07 | Track My Order opens the tracking page | FD-07 · track my order opens the tracking page | pass |
| FD-07 | Back to Home returns to the landing page | FD-07 · back to home returns to the landing page | pass |
| FD-07 | Tracking page shows order number, total paid and estimated delivery | FD-07 · tracking page shows number, total paid and estimated delivery | pass |
| FD-07 | Five stages in order: Order Confirmed → Preparing → Ready for Pickup → On the Way → Delivered | FD-07 · tracking shows the five stages in order | pass |
| FD-07 | An order number that was never placed does not show a tracking page | FD-07 · unknown order number shows no tracking page | fail — bug |
| FD-07 | Total paid is the placed amount and cannot be changed by editing the address | FD-07 · total paid cannot be changed through the address | fail — bug |
| FD-08 | Any address that is not a Foodora page shows **404 — Page not found** and a **Return to Home** link | FD-08 · any address that is not a Foodora page shows 404 — Page not found and a Return to Home link | pass |

Readings taken (the other reading offered at the checkpoint where it matters):

- FD-05 "shows how many items": the header counts units (`Cart 3` for Classic Beef ×3); the
  panel heading counts lines (`Your Cart (1)`). Tested: the header counts units.
- FD-05 "the price" on a cart line: the unit price is accepted.
- FD-04 "pick exactly one": at most one size can be checked at a time.
- FD-01 "when it has one": only cards that can be opened are compared with their restaurant page;
  the unavailable Koliba u Jána card shows its badge instead of the page's *20% off your first order*.

## Seen outside scope

- FD-08 (not in scope): `/restaurant/<unknown id>` and `/product/<unknown id>` show their own
  "Not Found" screens without **Return to Home**; `/product/<unknown id>` has no header, so there is
  no way back.
- FD-01 / FD-07 (a reading): checkout, confirmation and tracking show "Estimated delivery: 25-35
  min" for every restaurant, while the cards advertise other ranges (Sushi Masters 20-30 min,
  Mediterranean Delight 35-45 min).
