import { test, expect, type Page } from '@playwright/test'
import { cents, openDish } from './helpers-fd-03'

const addToCart = (page: Page) => page.getByRole('button', { name: /^Add to Cart/ })
const price = async (page: Page) => cents(await addToCart(page).textContent())

/** The Quantity row: the innermost block holding the "Quantity" label and its buttons. */
function quantityRow(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.getByText('Quantity', { exact: true }) })
    .filter({ has: page.getByRole('button') })
    .last()
}
// The − and + buttons have no accessible name; only their icons tell them apart.
const minus = (page: Page) =>
  quantityRow(page)
    .getByRole('button')
    .filter({ has: page.locator('svg.lucide-minus') })
const plus = (page: Page) =>
  quantityRow(page)
    .getByRole('button')
    .filter({ has: page.locator('svg.lucide-plus') })
const quantity = (page: Page) => quantityRow(page).getByText(/^\d+$/)

test.describe('FD-04 · Customise a dish', { tag: '@FD-04' }, () => {
  test(
    'FD-04 · dish page shows photo, description, rating, preparation time and calories',
    {
      annotation: {
        type: 'spec',
        description:
          'The dish page (`/product/<id>`) shows the photo, description, rating, preparation time and calories.',
      },
    },
    async ({ page }) => {
      const { name, description } = await openDish(page)

      await expect(page).toHaveURL(/\/product\/[^/]+$/)
      await expect(page.getByRole('img', { name, exact: true })).toBeVisible()
      await expect(page.getByText(description, { exact: true })).toBeVisible()
      await expect(page.getByText(/\b[0-5]\.\d\b/).first()).toBeVisible()
      await expect(page.getByText(/Prep(aration)? Time:?\s*\d/i)).toBeVisible()
      await expect(page.getByText(/Calories:?\s*\d/i).first()).toBeVisible()
    },
  )

  test(
    'FD-04 · exactly one size can be picked',
    {
      annotation: {
        type: 'spec',
        description: '**Size** — pick exactly one (for example *Regular* or *Large +$3.00*).',
      },
    },
    async ({ page }) => {
      await openDish(page)
      const regular = page.getByRole('radio', { name: 'Regular', exact: true })
      const large = page.getByRole('radio', { name: 'Large +$3.00', exact: true })

      await large.click()
      await expect(large).toBeChecked()
      await expect(regular).not.toBeChecked()

      await regular.click()
      await expect(regular).toBeChecked()
      await expect(large).not.toBeChecked()
    },
  )

  test(
    'FD-04 · several add-ons can be picked together',
    {
      annotation: [
        {
          type: 'spec',
          description:
            '**Add-ons** — pick **any combination**, including none (for example *Extra Cheese* **and** *Bacon*).',
        },
        {
          type: 'bug',
          description:
            'Add-ons are radio buttons: picking Bacon unchecks Extra Cheese, so only one add-on can be chosen.',
        },
      ],  
    },
    async ({ page }) => {
      await openDish(page)
      const cheese = page.getByRole('radio', { name: /^Extra Cheese/ })
      const bacon = page.getByRole('radio', { name: /^Bacon/ })

      // None is a valid choice: nothing is forced on.
      await expect(cheese).not.toBeChecked()
      await expect(bacon).not.toBeChecked()

      await cheese.click()
      await bacon.click()

      await expect(cheese).toBeChecked()
      await expect(bacon).toBeChecked()
    },
  )

  test(
    'FD-04 · quantity is 1 or more',
    { annotation: { type: 'spec', description: '**Quantity** — 1 or more.' } },
    async ({ page }) => {
      await openDish(page)
      await expect(quantity(page)).toHaveText('1')
      await expect(minus(page)).toBeDisabled()

      await plus(page).click()
      await expect(quantity(page)).toHaveText('2')

      await minus(page).click()
      await expect(quantity(page)).toHaveText('1')
      await expect(minus(page)).toBeDisabled()
    },
  )

  test(
    'FD-04 · add to cart button shows the configured price and follows every change',
    {
      annotation: {
        type: 'spec',
        description:
          'The **Add to Cart** button shows the price of what is configured, and updates as the customer changes size, add-ons or quantity.',
      },
    },
    async ({ page }) => {
      await openDish(page)
      const regular = page.getByRole('radio', { name: 'Regular', exact: true })
      const large = page.getByRole('radio', { name: 'Large +$3.00', exact: true })
      const cheese = page.getByRole('radio', { name: /^Extra Cheese/ })
      const base = await price(page)
      // The surcharges as the options' accessible names state them (`radio "Extra Cheese +$1.50"`).
      const largeExtra = cents(await large.ariaSnapshot())
      const cheeseExtra = cents(await cheese.ariaSnapshot())

      await regular.click()
      await expect.poll(() => price(page)).toBe(base)

      await large.click()
      await expect.poll(() => price(page)).toBe(base + largeExtra)

      await cheese.click()
      await expect.poll(() => price(page)).toBe(base + largeExtra + cheeseExtra)

      await plus(page).click()
      await expect.poll(() => price(page)).toBe(2 * (base + largeExtra + cheeseExtra))

      await regular.click()
      await expect.poll(() => price(page)).toBe(2 * (base + cheeseExtra))
    },
  )

  test(
    'FD-04 · tabs show ingredients, reviews and nutrition',
    { annotation: { type: 'spec', description: 'Tabs show *Ingredients*, *Reviews* and *Nutrition*.' } },
    async ({ page }) => {
      await openDish(page)
      for (const name of ['Ingredients', 'Reviews', 'Nutrition']) {
        const tab = page.getByRole('tab', { name, exact: true })
        await tab.click()
        await expect(tab).toHaveAttribute('aria-selected', 'true')
        const panel = page.getByRole('tabpanel', { name })
        await expect(panel).toBeVisible()
        await expect(panel).toHaveText(/\S/)
      }
    },
  )

  test(
    'FD-04 · cart is reachable from the dish page',
    {
      annotation: [
        {
          type: 'spec',
          description: 'The cart is reachable from this page, the same as from every other page in the order flow.',
        },
        {
          type: 'bug',
          description: 'The dish page has no header and no Cart button; the cart cannot be opened from it.',
        },
      ],
    },
    async ({ page }) => {
      await openDish(page)
      const cart = page.getByRole('button', { name: /^Cart\b/ })
      await expect(cart).toBeVisible()
      await cart.click()
      // The cart opens as a panel (FD-05).
      await expect(page.getByRole('dialog')).toBeVisible()
    },
  )
})
