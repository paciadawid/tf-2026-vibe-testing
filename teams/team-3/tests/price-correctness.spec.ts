import { test, expect, type Page } from '@playwright/test'
import {
  BURGER_PALACE,
  CHICKEN_DELUXE,
  CLASSIC_BEEF,
  MARGHERITA,
  PIZZA_CORNER,
  SERVICE_FEE,
  cartButton,
  cartLine,
  cartPanel,
  cents,
  dishCard,
  fillCart,
  lineMinus,
  linePlus,
  lineRemove,
  money,
  openCart,
  quickAdd,
  summaryValue,
} from './helpers'

// Area 1 — price correctness, from dish to cart. A regression here over- or undercharges.

const addToCart = (page: Page) => page.getByRole('button', { name: /^Add to Cart/ })
const addToCartPrice = async (page: Page) => money(await addToCart(page).innerText())
// The add-ons are one group. They may be radios or checkboxes, and the spec wants them to combine.
const option = (page: Page, name: string) =>
  page.getByRole('radio', { name: new RegExp(`^${name}`) }).or(page.getByRole('checkbox', { name: new RegExp(`^${name}`) }))
// The Quantity stepper's + button has no accessible name in this build, so it is found by icon.
const quantityPlus = (page: Page) =>
  page.getByText('Quantity', { exact: true }).locator('xpath=..').locator('button:has(svg.lucide-plus)')

test.describe('FD-04 · dish price', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(CLASSIC_BEEF.path)
    await expect(addToCart(page)).toBeVisible()
  })

  test('FD-04 · Add to Cart shows the base price with nothing configured', async ({ page }) => {
    expect(await addToCartPrice(page)).toBe(CLASSIC_BEEF.price)
  })

  test('FD-04 · Add to Cart price follows the size', async ({ page }) => {
    await option(page, 'Large').click()
    await expect(addToCart(page)).toHaveText(/\$15\.95/) // 12.95 + Large 3.00
  })

  test('FD-04 · add-ons combine: Extra Cheese and Bacon together', async ({ page }) => {
    await option(page, 'Extra Cheese').click()
    await option(page, 'Bacon').click()
    await expect(option(page, 'Extra Cheese')).toBeChecked()
    await expect(option(page, 'Bacon')).toBeChecked()
    await expect(addToCart(page)).toHaveText(/\$16\.45/) // 12.95 + 1.50 + 2.00
  })

  test('FD-04 · Add to Cart price follows the quantity', async ({ page }) => {
    await quantityPlus(page).click()
    await expect(addToCart(page)).toHaveText(/\$25\.90/) // 2 × 12.95
  })

  test('FD-04 · the cart is reachable from the dish page', async ({ page }) => {
    await expect(cartButton(page)).toBeVisible()
  })
})

test.describe('FD-03 · quick-add', () => {
  test('FD-03 · quick-add raises the header cart count by one', async ({ page }) => {
    await page.goto(BURGER_PALACE.path)
    await quickAdd(page, CLASSIC_BEEF.name)
    await expect(cartButton(page)).toHaveAccessibleName(/^Cart\s*1$/)
    await quickAdd(page, CHICKEN_DELUXE.name)
    await expect(cartButton(page)).toHaveAccessibleName(/^Cart\s*2$/)
  })

  test('FD-03 · quick-add button has an accessible name', async ({ page }) => {
    await page.goto(BURGER_PALACE.path)
    await expect(dishCard(page, CLASSIC_BEEF.name).getByRole('button')).toHaveAccessibleName(/\S/)
  })
})

test.describe('FD-05 · cart money', () => {
  test('FD-05 · service fee is a flat $1.50', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name, CHICKEN_DELUXE.name])
    const cart = await openCart(page)
    expect(await summaryValue(cart, 'Service Fee')).toBe(SERVICE_FEE)
  })

  test('FD-05 · delivery fee equals the fee the restaurant advertises', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    const cart = await openCart(page)
    expect(await summaryValue(cart, 'Delivery Fee')).toBe(BURGER_PALACE.deliveryFee)
  })

  test('FD-05 · Free delivery counts as $0.00', async ({ page }) => {
    await fillCart(page, PIZZA_CORNER.path, [MARGHERITA.name])
    const cart = await openCart(page)
    expect(await summaryValue(cart, 'Delivery Fee')).toBe(0)
    expect(await summaryValue(cart, 'Total')).toBe(cents(MARGHERITA.price + SERVICE_FEE))
  })

  test('FD-05 · Total = Subtotal − discount + Delivery Fee + Service Fee', async ({ page }) => {
    // Under $25, so no promotion: the discount is 0.
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    const cart = await openCart(page)
    const subtotal = await summaryValue(cart, 'Subtotal')
    expect(subtotal).toBe(CLASSIC_BEEF.price)
    expect(await summaryValue(cart, 'Total')).toBe(cents(subtotal + BURGER_PALACE.deliveryFee + SERVICE_FEE))
  })

  test('FD-05 · 20% promotion applies once the subtotal passes $25, on its own line', async ({ page }) => {
    // Classic Beef 12.95 + Chicken Deluxe 14.99 = 27.94 → 20 % off = 5.59
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name, CHICKEN_DELUXE.name])
    const cart = await openCart(page)
    const subtotal = await summaryValue(cart, 'Subtotal')
    expect(subtotal).toBe(27.94)
    await expect(cart.getByText(/discount|20% off|promo/i).first()).toBeVisible()
    const expected = cents(subtotal - cents(subtotal * 0.2) + BURGER_PALACE.deliveryFee + SERVICE_FEE)
    expect(await summaryValue(cart, 'Total')).toBeCloseTo(expected, 1)
  })

  test('FD-05 · no promotion at or below $25', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    const cart = await openCart(page)
    await expect(cart.getByText(/discount/i)).toHaveCount(0)
  })
})

test.describe('FD-05 · cart lines', () => {
  test('FD-05 · each line shows dish, restaurant, price and a quantity stepper', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    await openCart(page)
    const line = cartLine(page, CLASSIC_BEEF.name)
    await expect(line).toContainText('Burger Palace')
    await expect(line).toContainText('$12.95')
    await expect(lineMinus(line)).toBeVisible()
    await expect(linePlus(line)).toBeVisible()
    await expect(lineRemove(line)).toBeVisible()
  })

  test('FD-05 · stepper + and − change the quantity and the subtotal', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    const cart = await openCart(page)
    const line = cartLine(page, CLASSIC_BEEF.name)
    await linePlus(line).click()
    await expect(line).toContainText('2')
    await expect.poll(() => summaryValue(cart, 'Subtotal')).toBe(25.9)
    await lineMinus(line).click()
    await expect.poll(() => summaryValue(cart, 'Subtotal')).toBe(CLASSIC_BEEF.price)
  })

  test('FD-05 · remove deletes the line', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name, CHICKEN_DELUXE.name])
    const cart = await openCart(page)
    await lineRemove(cartLine(page, CLASSIC_BEEF.name)).click()
    await expect(cart.getByRole('heading', { name: CLASSIC_BEEF.name })).toHaveCount(0)
    await expect(cart.getByRole('heading', { name: CHICKEN_DELUXE.name })).toBeVisible()
    await expect.poll(() => summaryValue(cart, 'Subtotal')).toBe(CHICKEN_DELUXE.price)
  })

  test('FD-05 · Clear Cart is not shown with a single dish', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    const cart = await openCart(page)
    await expect(cart.getByRole('button', { name: 'Clear Cart' })).toHaveCount(0)
  })

  test('FD-05 · Clear Cart with two dishes removes everything', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name, CHICKEN_DELUXE.name])
    const cart = await openCart(page)
    await cart.getByRole('button', { name: 'Clear Cart' }).click()
    await expect(cart.getByRole('heading', { level: 4 })).toHaveCount(0)
    await expect(cart.getByText(/empty/i).first()).toBeVisible()
  })

  test('FD-05 · the cart survives a page reload', async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    await page.reload()
    await openCart(page)
    await expect(cartPanel(page).getByRole('heading', { name: CLASSIC_BEEF.name })).toBeVisible()
  })

  test('FD-05 · an empty cart says so and offers no checkout', async ({ page }) => {
    await page.goto('/')
    const cart = await openCart(page)
    await expect(cart.getByText(/empty/i).first()).toBeVisible()
    await expect(cart.getByRole('button', { name: 'Proceed to Checkout' })).toHaveCount(0)
  })

  test('FD-05 · an empty cart offers a way back to the restaurants', async ({ page }) => {
    await page.goto('/')
    const cart = await openCart(page)
    await expect(cart.getByRole('button', { name: /restaurant|browse|shopping/i }).or(cart.getByRole('link', { name: /restaurant|browse|shopping/i })).first()).toBeVisible()
  })
})
