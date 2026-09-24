import { test, expect } from '@playwright/test'
import {
  BURGER_PALACE,
  CHICKEN_DELUXE,
  CLASSIC_BEEF,
  REQUIRED_FIELDS,
  fillCart,
  fillCheckout,
  goToCheckout,
  openCart,
  orderSummary,
  placeOrderButton,
  summaryValue,
} from './helpers'

// Area 2 — the checkout gate. A regression here loses valid orders or lets incomplete ones through.

const confirmed = (page: import('@playwright/test').Page) =>
  page.getByRole('heading', { name: 'Order Confirmed!' })

test.describe('FD-06 · checkout with a filled cart', () => {
  test.beforeEach(async ({ page }) => {
    await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name])
    await goToCheckout(page)
  })

  for (const field of REQUIRED_FIELDS) {
    test(`FD-06 · missing ${field} blocks the order and says what is needed`, async ({ page }) => {
      await fillCheckout(page, [field])
      await placeOrderButton(page).click()

      await expect(confirmed(page)).toHaveCount(0)
      await expect(page).toHaveURL(/\/checkout$/)
      // A visible message, or at least the browser's own required-field message on that input.
      const input = page.getByLabel(field, { exact: true })
      const shown = page.getByText(new RegExp(`${field}.*(required|enter|needed)|(required|enter|provide).*${field}`, 'i'))
      const nativeMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage)
      expect(nativeMessage !== '' || (await shown.count()) > 0, `no message for missing ${field}`).toBe(true)
    })
  }

  test('FD-06 · blank form places no order', async ({ page }) => {
    await placeOrderButton(page).click()
    await expect(confirmed(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/checkout$/)
  })

  test('FD-06 · optional fields left blank still place the order', async ({ page }) => {
    await fillCheckout(page)
    await expect(page.getByLabel('Apt / Suite')).toHaveValue('')
    await expect(page.getByLabel(/Delivery Instructions/)).toHaveValue('')
    await placeOrderButton(page).click()
    await expect(confirmed(page)).toBeVisible()
  })

  test('FD-06 · Credit / Debit Card is the default payment method', async ({ page }) => {
    await expect(page.getByRole('radio', { name: /^Credit \/ Debit Card/ })).toBeChecked()
  })

  test('FD-06 · Cash on Delivery and Apple Pay can be chosen', async ({ page }) => {
    for (const method of [/^Cash on Delivery/, /^Apple Pay/]) {
      await page.getByRole('radio', { name: method }).click()
      await expect(page.getByRole('radio', { name: method })).toBeChecked()
    }
    await expect(page.getByRole('radio', { name: /^Credit \/ Debit Card/ })).not.toBeChecked()
  })
})

test('FD-06 · order summary has the same lines as the cart', async ({ page }) => {
  await fillCart(page, BURGER_PALACE.path, [CLASSIC_BEEF.name, CHICKEN_DELUXE.name])
  const cart = await openCart(page)
  const labels = ['Subtotal', 'Delivery Fee', 'Service Fee', 'Total']
  const inCart = await Promise.all(labels.map((l) => summaryValue(cart, l)))
  await cart.getByRole('button', { name: 'Proceed to Checkout' }).click()
  await expect(page).toHaveURL(/\/checkout$/)

  const summary = orderSummary(page)
  await expect(summary).toContainText(CLASSIC_BEEF.name)
  await expect(summary).toContainText(CHICKEN_DELUXE.name)
  const atCheckout = await Promise.all(labels.map((l) => summaryValue(summary, l)))
  expect(atCheckout).toEqual(inCart)
})

test('FD-06 · checkout with an empty cart shows an empty state, not a form', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByText(/empty/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /restaurant|browse/i }).or(page.getByRole('link', { name: /restaurant|browse/i })).first()).toBeVisible()
  await expect(placeOrderButton(page)).toHaveCount(0)
  await expect(page.getByLabel('Full Name', { exact: true })).toHaveCount(0)
})
