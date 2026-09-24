import { expect, type Locator, type Page } from '@playwright/test'

// Shared setup for the three business-critical areas: prices, the checkout gate, and order integrity.
// Expected values come from spec/foodora-spec.md, never from what the build happens to show.

export const SERVICE_FEE = 1.5

// Known menu data, read off the restaurant pages (FD-01 / FD-03).
export const BURGER_PALACE = { path: '/restaurant/1', deliveryFee: 2.99 } // "20% OFF orders over $25"
export const PIZZA_CORNER = { path: '/restaurant/2', deliveryFee: 0 } // delivery "Free"
export const CLASSIC_BEEF = { name: 'Classic Beef Burger', price: 12.95, path: '/product/bp-1' }
export const CHICKEN_DELUXE = { name: 'Chicken Deluxe', price: 14.99 }
export const MARGHERITA = { name: 'Margherita', price: 13.99 }

export const CUSTOMER = {
  'Full Name': 'Jane Tester',
  'Street Address': '12 Test Street',
  City: 'New York',
  'Phone Number': '+1 555 010 0000',
}
export const REQUIRED_FIELDS = Object.keys(CUSTOMER) as (keyof typeof CUSTOMER)[]

/** "$12.95" → 12.95, "Free" → 0. */
export function money(text: string): number {
  if (/free/i.test(text)) return 0
  const m = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/)
  if (!m) throw new Error(`No amount in "${text}"`)
  return Number(m[1])
}

export const cents = (n: number) => Math.round(n * 100) / 100

export const cartButton = (page: Page) =>
  page.getByRole('navigation').getByRole('button', { name: /^Cart/ })

export const cartPanel = (page: Page) => page.getByRole('dialog')

/** The dish card on a restaurant page. Its quick-add button is the only button inside it. */
export const dishCard = (page: Page, dish: string) =>
  page.getByRole('link', { name: new RegExp(`^${dish}`) })

/** Quick-add from the restaurant page (FD-03). Waits for the confirmation toast. */
export async function quickAdd(page: Page, dish: string) {
  await dishCard(page, dish).getByRole('button').click()
  await expect(page.getByText(`${dish} has been added to your cart.`).last()).toBeVisible()
}

/**
 * Starts from a fresh page load and puts the dishes in the cart. The cart is filled in-app
 * afterwards, with no further page loads, so it does not depend on FD-05's reload rule.
 */
export async function fillCart(page: Page, restaurantPath: string, dishes: string[]) {
  await page.goto(restaurantPath)
  for (const dish of dishes) await quickAdd(page, dish)
}

export async function openCart(page: Page) {
  await cartButton(page).click()
  await expect(cartPanel(page)).toBeVisible()
  return cartPanel(page)
}

/** The amount shown next to a summary label (Subtotal, Delivery Fee, Service Fee, Total). */
export async function summaryValue(scope: Locator | Page, label: string) {
  const value = scope.getByText(label, { exact: true }).first().locator('xpath=following-sibling::*[1]')
  return money(await value.innerText())
}

/** One line in the cart panel: the innermost block holding the dish heading and its buttons. */
export const cartLine = (page: Page, dish: string) =>
  cartPanel(page)
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: dish, exact: true }) })
    .filter({ has: page.locator('button svg.lucide-trash2') })
    .last()

// The stepper and remove buttons have no accessible name in this build, so they are found by icon.
export const lineMinus = (line: Locator) => line.locator('button:has(svg.lucide-minus)')
export const linePlus = (line: Locator) => line.locator('button:has(svg.lucide-plus)')
export const lineRemove = (line: Locator) => line.locator('button:has(svg.lucide-trash2)')

/** From a filled cart, in-app: open the panel and press Proceed to Checkout. */
export async function goToCheckout(page: Page) {
  const cart = await openCart(page)
  await cart.getByRole('button', { name: 'Proceed to Checkout' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
}

export async function fillCheckout(page: Page, skip: string[] = []) {
  for (const field of REQUIRED_FIELDS) {
    if (!skip.includes(field)) await page.getByLabel(field, { exact: true }).fill(CUSTOMER[field])
  }
}

export const orderSummary = (page: Page) =>
  page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Order Summary' }) })
    .filter({ hasText: 'Service Fee' })
    .last()

export const placeOrderButton = (page: Page) => page.getByRole('button', { name: 'Place Order' })

/** Places a complete, valid order for one Classic Beef Burger. Returns number and totals. */
export async function placeOrder(page: Page) {
  await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
  await goToCheckout(page)
  await fillCheckout(page)
  const checkoutTotal = await summaryValue(orderSummary(page), 'Total')
  await placeOrderButton(page).click()
  await expect(page.getByRole('heading', { name: 'Order Confirmed!' })).toBeVisible()
  const numberText = await page.getByText(/Order #/).first().innerText()
  const orderNumber = numberText.replace(/.*Order #\s*/, '').trim()
  const confirmedTotal = money(await page.getByText(/^Total:/).first().innerText())
  return { orderNumber, checkoutTotal, confirmedTotal }
}
