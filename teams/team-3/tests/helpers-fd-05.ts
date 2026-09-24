import { expect, type Locator, type Page } from '@playwright/test'

/** '$12.95' → 1295 cents; 'Free' → 0. */
export function toCents(text: string): number {
  if (/free/i.test(text)) return 0
  const match = text.match(/\$\s*(\d+)\.(\d{2})/)
  if (!match) throw new Error(`No money amount in "${text}"`)
  return Number(match[1]) * 100 + Number(match[2])
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type RestaurantCard = { name: string; href: string; feeText: string; promo: string }

/** Every restaurant card on the landing page that can be opened (not greyed out). */
export async function availableRestaurants(page: Page): Promise<RestaurantCard[]> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Popular Restaurants' })).toBeVisible()
  const cards = page
    .getByRole('link')
    .filter({ has: page.getByRole('heading', { level: 3 }) })
    .filter({ hasNotText: 'Not available at your address' })
  // The cards come from the live backend after the page renders.
  await expect(cards.first()).toBeVisible({ timeout: 15_000 })
  const result: RestaurantCard[] = []
  for (const card of await cards.all()) {
    const name = (await card.getByRole('heading', { level: 3 }).innerText()).trim()
    const href = (await card.getAttribute('href')) ?? ''
    const feeText = (await card.getByText(/^(Free|\$\d+\.\d{2})$/).innerText()).trim()
    const text = await card.innerText()
    const promo = /20% OFF orders over \$25/.test(text) ? '20% OFF orders over $25' : ''
    result.push({ name, href, feeText, promo })
  }
  if (result.length === 0) throw new Error('No available restaurant on the landing page')
  return result
}

export async function findRestaurant(
  page: Page,
  predicate: (card: RestaurantCard) => boolean,
  what: string,
): Promise<RestaurantCard> {
  const found = (await availableRestaurants(page)).find(predicate)
  if (!found) throw new Error(`No available restaurant that ${what}`)
  return found
}

export type Dish = { name: string; cents: number }

/** Opens a restaurant page and reads the dishes of the visible menu tab. */
export async function openMenu(page: Page, restaurant: RestaurantCard): Promise<Dish[]> {
  await page.goto(restaurant.href, { waitUntil: 'domcontentloaded' })
  // The restaurant and its menu come from the live backend after the page renders.
  await expect(page.getByRole('heading', { name: restaurant.name, level: 1 })).toBeVisible({ timeout: 15_000 })
  const dishLinks = page.getByRole('tabpanel').getByRole('link')
  await expect(dishLinks.first()).toBeVisible({ timeout: 15_000 })
  const dishes: Dish[] = []
  for (const link of await dishLinks.all()) {
    const name = (await link.getByRole('heading', { level: 3 }).innerText()).trim()
    const cents = toCents(await link.getByText(/^\$\d+\.\d{2}$/).innerText())
    dishes.push({ name, cents })
  }
  return dishes
}

export function cartButton(page: Page): Locator {
  return page.getByRole('navigation').getByRole('button', { name: /^Cart\b/ })
}

/** The number the header Cart button shows (0 when it shows none). */
export async function cartCount(page: Page): Promise<number> {
  const name = (await cartButton(page).innerText()).replace(/\s+/g, ' ')
  const match = name.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

/** Quick-add one of a dish from the open restaurant page and wait for the count to go up. */
export async function quickAdd(page: Page, dishName: string, times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    const before = await cartCount(page)
    // The quick-add button has no accessible name (FD-03); it is the only button in the dish card.
    await page
      .getByRole('tabpanel')
      .getByRole('link', { name: new RegExp(`^${escapeRegExp(dishName)}`) })
      .getByRole('button')
      .click()
    await expect.poll(() => cartCount(page)).toBe(before + 1)
  }
}

export async function openCart(page: Page): Promise<Locator> {
  await cartButton(page).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

export async function closeCart(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

/** The smallest element in the cart dialog that holds one dish line. */
export function cartLine(dialog: Locator, dishName: string): Locator {
  return dialog
    .locator('div')
    .filter({ has: dialog.page().getByRole('heading', { name: dishName, level: 4, exact: true }) })
    .filter({ has: dialog.page().getByRole('button') })
    .last()
}

/** The amount shown on the summary row whose label is exactly `label` (in the given scope). */
export async function rowAmount(scope: Locator, label: string | RegExp): Promise<number> {
  const row = scope
    .locator('div')
    .filter({ has: scope.page().getByText(label, { exact: typeof label === "string" }) })
    .filter({ hasText: /\$\d/ })
    .last()
  const text = await row.innerText()
  const amounts = text.match(/\$\s*\d+\.\d{2}/g)
  if (!amounts) throw new Error(`No amount on the "${label}" row: "${text}"`)
  return toCents(amounts[amounts.length - 1])
}

/** The discount row of a summary, if any. */
export function discountRow(scope: Locator): Locator {
  return scope.getByText(/discount|promo|% off/i).filter({ hasNotText: /orders over/i })
}

/** Items (subset sum) with the largest subtotal ≤ limit and the smallest above it. */
export function combosAround(dishes: Dish[], limit: number): { below: Dish[]; above: Dish[] } {
  let below: Dish[] | undefined
  let above: Dish[] | undefined
  const sum = (items: Dish[]) => items.reduce((s, d) => s + d.cents, 0)
  const walk = (index: number, picked: Dish[]) => {
    const total = sum(picked)
    if (total > limit) {
      if (!above || total < sum(above)) above = [...picked]
      return
    }
    if (picked.length > 0 && (!below || total > sum(below))) below = [...picked]
    if (index >= dishes.length || picked.length >= 6) return
    for (let qty = 0; qty <= 3; qty++) {
      const next = [...picked, ...Array(qty).fill(dishes[index])]
      walk(index + 1, next)
      if (sum(next) > limit) break
    }
  }
  walk(0, [])
  if (!below || !above) throw new Error(`Cannot build subtotals around ${formatMoney(limit)} from this menu`)
  return { below, above }
}

/** Puts a list of dishes (with repeats) into the cart from the open restaurant page. */
export async function addDishes(page: Page, items: Dish[]): Promise<void> {
  for (const item of items) await quickAdd(page, item.name)
}

/** First available restaurant, one of its first dish in the cart. Returns what was added. */
export async function oneDishInCart(page: Page): Promise<{ restaurant: RestaurantCard; dish: Dish }> {
  const [restaurant] = await availableRestaurants(page)
  const [dish] = await openMenu(page, restaurant)
  await quickAdd(page, dish.name)
  return { restaurant, dish }
}

export const requiredFields = ['Full Name', 'Street Address', 'City', 'Phone Number'] as const

export const validAddress: Record<(typeof requiredFields)[number], string> = {
  'Full Name': 'Jane Tester',
  'Street Address': '1 Test Street',
  City: 'New York',
  'Phone Number': '+1 555 000 0000',
}

/** From a filled cart: opens checkout through the cart. */
export async function goToCheckout(page: Page): Promise<void> {
  const dialog = await openCart(page)
  await dialog.getByRole('button', { name: 'Proceed to Checkout' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('button', { name: 'Place Order' })).toBeVisible()
}

export async function fillRequired(page: Page, skip?: string): Promise<void> {
  for (const field of requiredFields) {
    if (field === skip) continue
    await page.getByRole('textbox', { name: field, exact: true }).fill(validAddress[field])
  }
}

/** Places an order for one dish; returns the checkout total in cents. */
export async function placeOrder(page: Page): Promise<{ totalCents: number }> {
  await oneDishInCart(page)
  await goToCheckout(page)
  const totalCents = await rowAmount(page.locator('body'), 'Total')
  await fillRequired(page)
  await page.getByRole('button', { name: 'Place Order' }).click()
  await expect(page.getByRole('heading', { name: 'Order Confirmed!', exact: true })).toBeVisible()
  return { totalCents }
}

/** The order number on the confirmation (or tracking) page, as shown. */
export async function shownOrderNumber(page: Page): Promise<string> {
  const text = await page.getByText(/Order #\S+/).first().innerText()
  const match = text.match(/Order #(\S+)/)
  if (!match) throw new Error(`No order number in "${text}"`)
  return match[1]
}
