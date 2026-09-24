import { test, expect } from '@playwright/test'
import { money, placeOrder } from './helpers'

// Area 3 — order confirmation and tracking integrity. The customer's proof the order exists,
// and the amount it says was paid.

const STAGES = ['Order Confirmed', 'Preparing', 'Ready for Pickup', 'On the Way', 'Delivered']

test.describe('FD-07 · confirmation', () => {
  test('FD-07 · confirmation shows heading, placed line, delivery time, number and total', async ({ page }) => {
    await placeOrder(page)
    await expect(page.getByRole('heading', { name: 'Order Confirmed!' })).toBeVisible()
    await expect(page.getByText(/order has been placed/i)).toBeVisible()
    await expect(page.getByText(/Estimated delivery/i)).toBeVisible()
    await expect(page.getByText(/Order #/)).toBeVisible()
    await expect(page.getByText(/^Total:\s*\$\d+\.\d{2}/)).toBeVisible()
  })

  test('FD-07 · order number is FDR- followed by six upper-case letters or digits', async ({ page }) => {
    const { orderNumber } = await placeOrder(page)
    expect(orderNumber).toMatch(/^FDR-[A-Z0-9]{6}$/)
  })

  test('FD-07 · every order gets a new number', async ({ page }) => {
    const first = await placeOrder(page)
    const second = await placeOrder(page)
    expect(second.orderNumber).not.toBe(first.orderNumber)
  })

  test('FD-07 · confirmed total equals the checkout total', async ({ page }) => {
    const { checkoutTotal, confirmedTotal } = await placeOrder(page)
    expect(confirmedTotal).toBe(checkoutTotal)
  })

  test('FD-07 · Track My Order opens /order/<order number>', async ({ page }) => {
    const { orderNumber } = await placeOrder(page)
    await page.getByRole('button', { name: 'Track My Order' }).or(page.getByRole('link', { name: 'Track My Order' })).click()
    await expect(page).toHaveURL(new RegExp(`/order/${orderNumber}(\\?.*)?$`))
  })

  test('FD-07 · Back to Home returns to the landing page', async ({ page }) => {
    await placeOrder(page)
    await page.getByRole('button', { name: 'Back to Home' }).or(page.getByRole('link', { name: 'Back to Home' })).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { name: 'Popular Restaurants' })).toBeVisible()
  })
})

test.describe('FD-07 · tracking', () => {
  test('FD-07 · tracking shows the order number, total paid and estimated delivery', async ({ page }) => {
    const { orderNumber, confirmedTotal } = await placeOrder(page)
    await page.getByRole('button', { name: 'Track My Order' }).click()
    await expect(page.getByText(`#${orderNumber}`).first()).toBeVisible()
    const paid = page.getByText('Total Paid', { exact: true }).locator('xpath=following-sibling::*[1]')
    expect(money(await paid.innerText())).toBe(confirmedTotal)
    await expect(page.getByText('Estimated Delivery', { exact: true })).toBeVisible()
  })

  test('FD-07 · tracking lists the five stages in order', async ({ page }) => {
    await placeOrder(page)
    await page.getByRole('button', { name: 'Track My Order' }).click()
    const progress = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: 'Delivery Progress' }) })
      .filter({ hasText: 'Delivered' })
      .last()
    const text = await progress.innerText()
    const positions = STAGES.map((s) => text.indexOf(s))
    expect(positions.every((p) => p >= 0), `stages missing in: ${text}`).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  test('FD-07 · an order number that was never placed shows no tracking page', async ({ page }) => {
    await page.goto('/order/FDR-NOPE00')
    await expect(page.getByRole('heading', { name: 'Order Tracking' })).toHaveCount(0)
    await expect(page.getByText('Total Paid', { exact: true })).toHaveCount(0)
  })

  test('FD-07 · total paid cannot be changed by editing the browser address', async ({ page }) => {
    const { orderNumber, confirmedTotal } = await placeOrder(page)
    await page.getByRole('button', { name: 'Track My Order' }).click()
    await expect(page).toHaveURL(new RegExp(`/order/${orderNumber}`))

    const tampered = new URL(page.url())
    tampered.searchParams.set('total', '0.01')
    await page.goto(tampered.pathname + tampered.search)

    const paid = page.getByText('Total Paid', { exact: true }).locator('xpath=following-sibling::*[1]')
    expect(money(await paid.innerText())).toBe(confirmedTotal)
  })
})
