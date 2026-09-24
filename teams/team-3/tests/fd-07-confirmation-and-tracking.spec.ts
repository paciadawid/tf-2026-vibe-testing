import { test, expect, type Page } from '@playwright/test'
import { escapeRegExp, formatMoney, placeOrder, rowAmount, shownOrderNumber } from './helpers-fd-05'

const STAGES = ['Order Confirmed', 'Preparing', 'Ready for Pickup', 'On the Way', 'Delivered']

async function openTracking(page: Page): Promise<string> {
  const number = await shownOrderNumber(page)
  await page.getByRole('button', { name: 'Track My Order' }).click()
  await expect(page).toHaveURL(new RegExp(`/order/${escapeRegExp(number)}`))
  await expect(page.getByText(/total paid/i)).toBeVisible()
  return number
}

test.describe('FD-07 · Confirmation and tracking', { tag: '@FD-07' }, () => {
  // Every test walks landing → menu → cart → checkout → confirmation on the live app first.
  test.slow()

  test(
    'FD-07 · confirmation shows heading, message, delivery time, number and total',
    {
      annotation: {
        type: 'spec',
        description: 'The customer sees **Order Confirmed!**, a line saying the order was placed, the estimated delivery time, the order number and the total.',
      },
    },
    async ({ page }) => {
      const { totalCents } = await placeOrder(page)

      await expect(page.getByRole('heading', { name: 'Order Confirmed!', exact: true })).toBeVisible()
      await expect(page.getByText(/order has been placed|order was placed/i)).toBeVisible()
      await expect(page.getByText(/estimated delivery/i)).toBeVisible()
      await expect(page.getByText(/estimated delivery/i)).toContainText(/\d/)
      await expect(page.getByText(/FDR-[A-Z0-9]{6}/).first()).toBeVisible()
      await expect(page.getByText(/total/i).filter({ hasText: formatMoney(totalCents) })).toBeVisible()
    },
  )

  test(
    'FD-07 · order number is FDR- followed by six characters',
    {
      annotation: {
        type: 'spec',
        description: 'Order numbers look like `FDR-` followed by six upper-case letters or digits',
      },
    },
    async ({ page }) => {
      await placeOrder(page)
      expect(await shownOrderNumber(page)).toMatch(/^FDR-[A-Z0-9]{6}$/)
    },
  )

  test(
    'FD-07 · every order gets a new order number',
    { annotation: { type: 'spec', description: 'every order gets a new one.' } },
    async ({ page }) => {
      test.setTimeout(90_000)
      await placeOrder(page)
      const first = await shownOrderNumber(page)
      await placeOrder(page)
      const second = await shownOrderNumber(page)
      expect(second).not.toBe(first)
    },
  )

  test(
    'FD-07 · track my order opens the tracking page',
    { annotation: { type: 'spec', description: '**Track My Order** opens the tracking page' } },
    async ({ page }) => {
      await placeOrder(page)
      const number = await openTracking(page)
      await expect(page.getByText(new RegExp(escapeRegExp(number))).first()).toBeVisible()
    },
  )

  test(
    'FD-07 · back to home returns to the landing page',
    { annotation: { type: 'spec', description: '**Back to Home** returns to the landing page.' } },
    async ({ page }) => {
      await placeOrder(page)
      await page.getByRole('button', { name: 'Back to Home' }).click()
      await expect(page).toHaveURL(/\/$/)
      await expect(page.getByRole('heading', { name: 'Popular Restaurants' })).toBeVisible()
    },
  )

  test(
    'FD-07 · tracking page shows number, total paid and estimated delivery',
    {
      annotation: { type: 'spec', description: 'the order number, the **total paid** and the estimated delivery;' },
    },
    async ({ page }) => {
      const { totalCents } = await placeOrder(page)
      const eta = (await page.getByText(/estimated delivery/i).innerText()).match(/\d+\s*-\s*\d+\s*min/)?.[0]
      expect(eta, 'estimated delivery on the confirmation').toBeTruthy()
      const number = await openTracking(page)

      await expect(page.getByText(new RegExp(escapeRegExp(number))).first()).toBeVisible()
      expect(await rowAmount(page.locator('body'), /^total paid$/i)).toBe(totalCents)
      await expect(page.getByText(/estimated delivery/i)).toBeVisible()
      await expect(page.getByText(eta as string, { exact: true })).toBeVisible()
    },
  )

  test(
    'FD-07 · tracking shows the five stages in order',
    {
      annotation: {
        type: 'spec',
        description: 'five stages in order: *Order Confirmed → Preparing → Ready for Pickup → On the Way → Delivered*.',
      },
    },
    async ({ page }) => {
      await placeOrder(page)
      await openTracking(page)
      for (const stage of STAGES) {
        await expect(page.getByText(stage, { exact: true }).last()).toBeVisible()
      }
      // The rule is about order: the stage list reads top to bottom in the spec's order.
      const text = await page.locator('body').innerText()
      const lastList = text.slice(text.lastIndexOf('Order Confirmed'))
      const positions = STAGES.map((stage) => lastList.indexOf(stage))
      expect(positions.every((p) => p >= 0), `all stages in the list: ${positions}`).toBe(true)
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    },
  )

  test(
    'FD-07 · unknown order number shows no tracking page',
    {
      annotation: [
        {
          type: 'spec',
          description: 'Tracking works only for real orders. An order number that was never placed does not show a tracking page.',
        },
        {
          type: 'bug',
          description: 'A never-placed order number (/order/FDR-000000) shows a full tracking page with all five stages and Total Paid $0.00.',
        },
      ],
    },
    async ({ page }) => {
      await page.goto('/order/FDR-000000', { waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('heading', { level: 2 })).first()).toBeVisible()
      await expect(page.getByText(/total paid/i)).toHaveCount(0)
      for (const stage of STAGES.slice(1)) {
        await expect(page.getByText(stage, { exact: true })).toHaveCount(0)
      }
    },
  )

  test(
    'FD-07 · total paid cannot be changed through the address',
    {
      annotation: [
        {
          type: 'spec',
          description: '**Total paid** is the amount of the placed order. It cannot be changed by editing the address in the browser.',
        },
        {
          type: 'bug',
          description: 'Total Paid is read from the ?total= query: editing it to 0.01 shows $0.01, removing it shows $0.00. Nothing is kept in localStorage.',
        },
      ],
    },
    async ({ page }) => {
      const { totalCents } = await placeOrder(page)
      const number = await openTracking(page)
      expect(await rowAmount(page.locator('body'), /^total paid$/i)).toBe(totalCents)

      const edited = new URL(page.url())
      edited.searchParams.set('total', '0.01')
      await page.goto(edited.pathname + edited.search, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/total paid/i)).toBeVisible()
      await expect.poll(() => rowAmount(page.locator('body'), /^total paid$/i), 'with ?total=0.01').toBe(totalCents)

      await page.goto(`/order/${number}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/total paid/i)).toBeVisible()
      await expect.poll(() => rowAmount(page.locator('body'), /^total paid$/i), 'without the query').toBe(totalCents)
    },
  )
})
