import { test, expect } from '@playwright/test'
import {
  closeCart,
  availableRestaurants,
  fillRequired,
  goToCheckout,
  oneDishInCart,
  openCart,
  openMenu,
  quickAdd,
  requiredFields,
  rowAmount,
  escapeRegExp,
} from './helpers-fd-05'

test.describe('FD-06 · Checkout', { tag: '@FD-06' }, () => {
  test(
    'FD-06 · checkout shows address form, payment choice and matching order summary',
    {
      annotation: {
        type: 'spec',
        description: 'The checkout page (`/checkout`) has a **Delivery Address** form, a **Payment Method** choice and an **Order Summary** with the same lines as the cart.',
      },
    },
    async ({ page }) => {
      const [restaurant] = await availableRestaurants(page)
      const [first, second] = await openMenu(page, restaurant)
      await quickAdd(page, first.name)
      await quickAdd(page, second.name)
      const dialog = await openCart(page)
      const cart: Record<string, number> = {}
      for (const label of ['Subtotal', 'Delivery Fee', 'Service Fee', 'Total']) {
        cart[label] = await rowAmount(dialog, label)
      }
      await closeCart(page)
      await goToCheckout(page)

      await expect(page.getByRole('heading', { name: 'Delivery Address' })).toBeVisible()
      for (const field of [...requiredFields, 'Apt / Suite']) {
        await expect(page.getByRole('textbox', { name: field, exact: true })).toBeVisible()
      }
      await expect(page.getByRole('textbox', { name: /Delivery Instructions/ })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible()
      await expect(page.getByRole('radio')).toHaveCount(3)
      await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible()

      // The cart panel stays in the page behind checkout: read only the Order Summary block.
      const summary = page
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: 'Order Summary' }) })
        .filter({ hasText: 'Subtotal' })
        .last()
      // Each dish was added once: the summary line shows 1x the dish at the price its menu gave.
      for (const dish of [first, second]) {
        await expect(summary.getByText(new RegExp(`^1x ${escapeRegExp(dish.name)}$`))).toBeVisible()
        expect(await rowAmount(summary, `1x ${dish.name}`), dish.name).toBe(dish.cents)
      }
      for (const label of Object.keys(cart)) {
        expect(await rowAmount(summary, label), label).toBe(cart[label])
      }
    },
  )

  test(
    'FD-06 · payment methods offered with card selected by default',
    {
      annotation: {
        type: 'spec',
        description: 'Payment method is one of **Credit / Debit Card** (selected by default), **Cash on Delivery** or **Apple Pay**.',
      },
    },
    async ({ page }) => {
      await oneDishInCart(page)
      await goToCheckout(page)

      const card = page.getByRole('radio', { name: /Credit \/ Debit Card/ })
      const cash = page.getByRole('radio', { name: /Cash on Delivery/ })
      const apple = page.getByRole('radio', { name: /Apple Pay/ })
      await expect(page.getByRole('radio')).toHaveCount(3)
      await expect(card).toBeChecked()
      await expect(cash).not.toBeChecked()
      await expect(apple).not.toBeChecked()

      await cash.check()
      await expect(cash).toBeChecked()
      await expect(card).not.toBeChecked()
    },
  )

  test(
    'FD-06 · place order is refused while a required field is empty',
    {
      annotation: [
        {
          type: 'spec',
          description: '**Place Order** only places the order when every required field is filled in. Otherwise no order is placed, and each missing field shows a message saying what is needed.',
        },
        {
          type: 'bug',
          description: 'The app places the order with a required field empty (with Full Name empty, even with the whole form empty) and shows no message for the missing field.',
        },
      ],
    },
    async ({ browser }) => {
      test.setTimeout(150_000)
      for (const missing of requiredFields) {
        const context = await browser.newContext()
        const page = await context.newPage()
        await oneDishInCart(page)
        await goToCheckout(page)
        await fillRequired(page, missing)
        await page.getByRole('button', { name: 'Place Order' }).click()

        const field = escapeRegExp(missing)
        // A message that names the missing field and says it is needed.
        const message = page.getByText(
          new RegExp(`${field}.*(required|needed)|(enter|provide|need).*${field}`, 'i'),
        )
        const confirmed = page.getByRole('heading', { name: 'Order Confirmed!' })
        // Wait until the app has answered the click one way or the other.
        await expect(message.or(confirmed).first()).toBeVisible()
        await expect.soft(confirmed, `no order with ${missing} empty`).toHaveCount(0)
        await expect.soft(page, `still on checkout with ${missing} empty`).toHaveURL(/\/checkout$/)
        await expect.soft(message.first(), `message for ${missing}`).toBeVisible()
        await context.close()
      }
    },
  )

  test(
    'FD-06 · order places with optional fields blank',
    {
      annotation: {
        type: 'spec',
        description: '**Place Order** only places the order when every required field is filled in.',
      },
    },
    async ({ page }) => {
      await oneDishInCart(page)
      await goToCheckout(page)
      await fillRequired(page)
      await expect(page.getByRole('textbox', { name: 'Apt / Suite', exact: true })).toHaveValue('')
      await expect(page.getByRole('textbox', { name: /Delivery Instructions/ })).toHaveValue('')
      await page.getByRole('button', { name: 'Place Order' }).click()
      await expect(page.getByRole('heading', { name: 'Order Confirmed!', exact: true })).toBeVisible()
    },
  )

  test(
    'FD-06 · checkout with an empty cart shows an empty state',
    {
      annotation: {
        type: 'spec',
        description: 'Opening checkout with an empty cart shows an empty state with a way back to the restaurants — never a form that could place an empty order.',
      },
    },
    async ({ page }) => {
      await page.goto('/checkout', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/empty/i).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Place Order' })).toHaveCount(0)
      await expect(page.getByRole('textbox', { name: 'Full Name' })).toHaveCount(0)

      await page.getByRole('button', { name: /restaurants/i }).click()
      await expect(page.getByRole('heading', { name: 'Popular Restaurants' })).toBeVisible()
    },
  )
})
