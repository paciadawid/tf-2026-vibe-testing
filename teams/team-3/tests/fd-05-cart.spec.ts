import { test, expect, type Page } from '@playwright/test'
import {
  closeCart,
  addDishes,
  availableRestaurants,
  cartButton,
  cartCount,
  cartLine,
  combosAround,
  discountRow,
  findRestaurant,
  formatMoney,
  oneDishInCart,
  openCart,
  openMenu,
  quickAdd,
  rowAmount,
  toCents,
} from './helpers-fd-05'

const SERVICE_FEE = 150

async function summary(page: Page) {
  const dialog = page.getByRole('dialog')
  const discountCount = await discountRow(dialog).count()
  return {
    subtotal: await rowAmount(dialog, 'Subtotal'),
    delivery: await rowAmount(dialog, 'Delivery Fee'),
    service: await rowAmount(dialog, 'Service Fee'),
    total: await rowAmount(dialog, 'Total'),
    discount: discountCount > 0 ? await rowAmount(dialog, /discount|promo|% off/i) : 0,
  }
}

test.describe('FD-05 · Cart', { tag: '@FD-05' }, () => {
  test(
    'FD-05 · cart button shows the number of items in the cart',
    {
      annotation: {
        type: 'spec',
        description: 'The cart opens as a panel from the **Cart** button in the header. The button shows how many items are in the cart.',
      },
    },
    async ({ page }) => {
      const [restaurant] = await availableRestaurants(page)
      const [first, second] = await openMenu(page, restaurant)
      expect(await cartCount(page)).toBe(0)

      // quickAdd waits for the header count to go up by one after each add.
      await quickAdd(page, first.name)
      await expect.poll(() => cartCount(page)).toBe(1)
      await quickAdd(page, second.name)
      await expect.poll(() => cartCount(page)).toBe(2)
      // Reading: items are units, so a second of the same dish counts too.
      await quickAdd(page, first.name)
      await expect.poll(() => cartCount(page)).toBe(3)

      await cartButton(page).click()
      await expect(page.getByRole('dialog')).toBeVisible()
    },
  )

  test(
    'FD-05 · each cart line shows dish, restaurant, price, stepper and remove',
    {
      annotation: {
        type: 'spec',
        description: 'Each line shows the dish, the restaurant, the price and a quantity stepper (**−** / **+**), and a way to remove it.',
      },
    },
    async ({ page }) => {
      const { restaurant, dish } = await oneDishInCart(page)
      const dialog = await openCart(page)
      const line = cartLine(dialog, dish.name)

      await expect(line.getByRole('heading', { name: dish.name, level: 4 })).toBeVisible()
      await expect(line.getByText(restaurant.name, { exact: true })).toBeVisible()
      // Reading: the price on the line may be the unit price.
      await expect(line.getByText(formatMoney(dish.cents), { exact: true })).toBeVisible()
      await expect(line.getByText('1', { exact: true })).toBeVisible()

      // The stepper and remove buttons have no accessible name (FD-03); only their icons tell them apart.
      await line.locator('button:has(svg.lucide-plus)').click()
      await expect(line.getByText('2', { exact: true })).toBeVisible()
      await line.locator('button:has(svg.lucide-minus)').click()
      await expect(line.getByText('1', { exact: true })).toBeVisible()
      await line.locator('button:has(svg.lucide-trash2)').click()
      await expect(dialog.getByRole('heading', { name: dish.name, level: 4 })).toHaveCount(0)
    },
  )

  test(
    'FD-05 · clear cart appears with two dishes and empties the cart',
    {
      annotation: {
        type: 'spec',
        description: 'With two or more different dishes in the cart, **Clear Cart** appears and removes everything',
      },
    },
    async ({ page }) => {
      const [restaurant] = await availableRestaurants(page)
      const [first, second] = await openMenu(page, restaurant)
      await quickAdd(page, first.name)
      await quickAdd(page, second.name)
      const dialog = await openCart(page)

      await dialog.getByRole('button', { name: 'Clear Cart' }).click()
      await expect(dialog.getByRole('heading', { name: first.name, level: 4 })).toHaveCount(0)
      await expect(dialog.getByRole('heading', { name: second.name, level: 4 })).toHaveCount(0)
      await closeCart(page)
      await expect.poll(() => cartCount(page)).toBe(0)
    },
  )

  test(
    'FD-05 · clear cart is hidden with a single dish',
    {
      annotation: { type: 'spec', description: 'with a single dish it is not shown.' },
    },
    async ({ page }) => {
      const { dish } = await oneDishInCart(page)
      const dialog = await openCart(page)
      await expect(dialog.getByRole('heading', { name: dish.name, level: 4 })).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Clear Cart' })).toHaveCount(0)
    },
  )

  test(
    'FD-05 · summary shows all lines and the total adds up',
    {
      annotation: {
        type: 'spec',
        description: 'The summary shows **Subtotal**, **Delivery Fee**, **Service Fee** and **Total**, and Total = Subtotal − discount + Delivery Fee + Service Fee.',
      },
    },
    async ({ page }) => {
      const [restaurant] = await availableRestaurants(page)
      const [first, second] = await openMenu(page, restaurant)
      await quickAdd(page, first.name)
      await quickAdd(page, second.name)
      const dialog = await openCart(page)

      for (const label of ['Subtotal', 'Delivery Fee', 'Service Fee', 'Total']) {
        await expect(dialog.getByText(label, { exact: true })).toBeVisible()
      }
      const s = await summary(page)
      expect(s.subtotal).toBe(first.cents + second.cents)
      expect(s.total).toBe(s.subtotal - s.discount + s.delivery + s.service)
    },
  )

  test(
    'FD-05 · delivery fee matches the restaurant and free is zero',
    {
      annotation: [
        { type: 'spec', description: 'The **Delivery Fee** is the fee the restaurant advertises — **Free** means $0.00.' },
        {
          type: 'bug',
          description: 'The cart charges $2.99 delivery for every restaurant: Pizza Corner advertises Free, Sushi Masters $1.99, Mediterranean Delight $3.49.',
        },
      ],
    },
    async ({ page }) => {
      test.setTimeout(120_000)
      const restaurants = await availableRestaurants(page)
      expect(restaurants.some((r) => /free/i.test(r.feeText)), 'a restaurant advertising Free').toBe(true)

      for (const restaurant of restaurants) {
        const [dish] = await openMenu(page, restaurant)
        await quickAdd(page, dish.name)
        const dialog = await openCart(page)
        const shown = await rowAmount(dialog, 'Delivery Fee')
        expect.soft(shown, `${restaurant.name} advertises ${restaurant.feeText}`).toBe(toCents(restaurant.feeText))
        await dialog.getByRole('heading', { name: dish.name, level: 4 }).waitFor()
        // The remove button has no accessible name (FD-03); only its icon tells it apart.
        await cartLine(dialog, dish.name).locator('button:has(svg.lucide-trash2)').click()
        await closeCart(page)
        await expect.poll(() => cartCount(page)).toBe(0)
      }
    },
  )

  test(
    'FD-05 · service fee is a flat amount per order',
    { annotation: { type: 'spec', description: 'The **Service Fee** is a flat $1.50 per order.' } },
    async ({ page }) => {
      const [restaurant] = await availableRestaurants(page)
      const [first, second] = await openMenu(page, restaurant)
      await quickAdd(page, first.name)
      let dialog = await openCart(page)
      expect(await rowAmount(dialog, 'Service Fee')).toBe(SERVICE_FEE)
      await closeCart(page)

      await quickAdd(page, second.name)
      await quickAdd(page, second.name)
      dialog = await openCart(page)
      expect(await rowAmount(dialog, 'Subtotal')).toBe(first.cents + 2 * second.cents)
      expect(await rowAmount(dialog, 'Service Fee')).toBe(SERVICE_FEE)
    },
  )

  test(
    'FD-05 · promotion takes 20% off above $25 and not below',
    {
      annotation: [
        {
          type: 'spec',
          description: '*20% OFF orders over $25* takes 20 % off the subtotal once it passes $25, and the discount shows as its own line.',
        },
        {
          type: 'bug',
          description: 'Burger Palace (20% OFF orders over $25) never gets a discount: subtotals $25.90, $36.93 and $40.93 show no discount line and the full total.',
        },
      ],
    },
    async ({ page, browser }) => {
      test.setTimeout(90_000)
      const restaurant = await findRestaurant(page, (r) => r.promo !== '', 'advertises 20% OFF orders over $25')
      const dishes = await openMenu(page, restaurant)
      const { below, above } = combosAround(dishes, 2500)

      // Just below $25: no discount.
      await addDishes(page, below)
      await openCart(page)
      const low = await summary(page)
      expect(low.subtotal).toBeLessThanOrEqual(2500)
      await expect(discountRow(page.getByRole('dialog'))).toHaveCount(0)
      expect(low.total).toBe(low.subtotal + low.delivery + low.service)

      // Just above $25, in a fresh browser: 20 % off, on its own line.
      const context = await browser.newContext()
      const fresh = await context.newPage()
      await openMenu(fresh, restaurant)
      await addDishes(fresh, above)
      await openCart(fresh)
      const dialog = fresh.getByRole('dialog')
      const subtotal = await rowAmount(dialog, 'Subtotal')
      expect(subtotal).toBeGreaterThan(2500)
      await expect(discountRow(dialog)).toHaveCount(1)
      const high = await summary(fresh)
      expect(high.discount).toBe(Math.round(subtotal * 0.2))
      expect(high.total).toBe(subtotal - Math.round(subtotal * 0.2) + high.delivery + high.service)
      await context.close()
    },
  )

  test(
    'FD-05 · proceed to checkout opens checkout',
    { annotation: { type: 'spec', description: '**Proceed to Checkout** takes the customer to checkout.' } },
    async ({ page }) => {
      await oneDishInCart(page)
      const dialog = await openCart(page)
      await dialog.getByRole('button', { name: 'Proceed to Checkout' }).click()
      await expect(page).toHaveURL(/\/checkout$/)
      await expect(page.getByRole('heading', { name: 'Checkout', level: 1 })).toBeVisible()
    },
  )

  test(
    'FD-05 · empty cart says so and offers no checkout',
    {
      annotation: [
        {
          type: 'spec',
          description: 'An empty cart says so, offers a way back to the restaurants, and offers **no** way to check out.',
        },
        {
          type: 'bug',
          description:
            'Opened on a restaurant page, the empty cart\'s Continue Shopping only closes the panel: the customer stays on /restaurant/<id> and is not taken back to the restaurant list.',
        },
      ],
    },
    async ({ page }) => {
      // Opened on a restaurant page, so the way back has to lead somewhere.
      const [restaurant] = await availableRestaurants(page)
      await openMenu(page, restaurant)
      const dialog = await openCart(page)
      await expect(dialog.getByText(/empty/i).first()).toBeVisible()
      await expect(dialog.getByRole('button', { name: /checkout/i })).toHaveCount(0)
      await expect(dialog.getByRole('link', { name: /checkout/i })).toHaveCount(0)

      await dialog.getByRole('button', { name: 'Continue Shopping' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('heading', { name: 'Popular Restaurants' })).toBeVisible()
    },
  )

  test(
    'FD-05 · cart survives a page reload',
    {
      annotation: [
        { type: 'spec', description: 'The cart survives a page reload: refreshing the browser does not lose the order.' },
        { type: 'bug', description: 'Reloading the page empties the cart; nothing is kept in localStorage or sessionStorage.' },
      ],
    },
    async ({ page }) => {
      const { dish } = await oneDishInCart(page)
      await page.reload()
      await expect(page.getByRole('tabpanel').getByRole('link').first()).toBeVisible()
      await expect.poll(() => cartCount(page)).toBe(1)
      const dialog = await openCart(page)
      await expect(dialog.getByRole('heading', { name: dish.name, level: 4 })).toBeVisible()
    },
  )
})
