import { test, expect } from '@playwright/test'
import { PROMOTION, cartCount, dishCards, openRestaurant, promotedCard } from './helpers-fd-03'

test.describe('FD-03 · Restaurant menu', { tag: '@FD-03' }, () => {
  test(
    'FD-03 · restaurant page shows name, cuisines, rating, delivery time, fee and promotion',
    {
      annotation: {
        type: 'spec',
        description: "the restaurant's name, cuisines, rating, delivery time, delivery fee and promotion;",
      },
    },
    async ({ page }) => {
      // The values the landing card shows are the ones the restaurant page must show.
      const card = await promotedCard(page)
      const name = (await card.getByRole('heading').textContent())!.trim()
      const cuisines = (await card.getByRole('paragraph').first().textContent())!.trim()
      // innerText keeps the card's pieces on separate lines.
      const cardText = await card.innerText()
      const rating = /^\d\.\d$/m.exec(cardText)?.[0]
      const time = /^\d+\s*-\s*\d+ min$/m.exec(cardText)?.[0]
      const fee = /^(\$\d+\.\d{2}|Free)$/m.exec(cardText)?.[0]
      expect(rating && time && fee, `card text: ${cardText}`).toBeTruthy()

      await card.click()

      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
      await expect(page.getByText(cuisines, { exact: true })).toBeVisible()
      await expect(page.getByText(new RegExp(`^${rating!.replace('.', '\\.')}\\b`))).toBeVisible()
      await expect(page.getByText(time!, { exact: true })).toBeVisible()
      await expect(page.getByText('Delivery Fee', { exact: true })).toBeVisible()
      await expect(page.getByText(fee!, { exact: true })).toBeVisible()
      await expect(page.getByText(PROMOTION, { exact: true })).toBeVisible()
    },
  )

  test(
    'FD-03 · menu is grouped into category tabs',
    {
      annotation: {
        type: 'spec',
        description: 'the menu, grouped into category tabs (for example *Burgers*, *Sides*, *Drinks*);',
      },
    },
    async ({ page }) => {
      await openRestaurant(page)
      const tabs = page.getByRole('tablist').getByRole('tab')
      for (const category of ['Burgers', 'Sides', 'Drinks']) {
        const tab = tabs.filter({ hasText: category })
        await expect(tab).toHaveCount(1)
        await tab.click()
        await expect(tab).toHaveAttribute('aria-selected', 'true')
        const panel = page.getByRole('tabpanel', { name: category })
        await expect(panel).toBeVisible()
        await expect(panel.getByRole('link').first()).toBeVisible()
      }
    },
  )

  test(
    'FD-03 · each dish shows name, description, price and a quick-add button',
    {
      annotation: {
        type: 'spec',
        description: 'for each dish: name, short description and price, and a quick-add **+** button.',
      },
    },
    async ({ page }) => {
      await openRestaurant(page)
      const tabs = await page.getByRole('tablist').getByRole('tab').all()
      expect(tabs.length).toBeGreaterThan(0)
      for (const tab of tabs) {
        await tab.click()
        const dishes = await dishCards(page).all()
        expect(dishes.length, `no dishes in tab ${await tab.textContent()}`).toBeGreaterThan(0)
        for (const dish of dishes) {
          await expect(dish.getByRole('heading')).toHaveText(/\S/)
          await expect(dish.getByRole('paragraph').first()).toHaveText(/\S/)
          await expect(dish).toContainText(/\$\d+\.\d{2}/)
          await expect(dish.getByRole('button')).toHaveCount(1)
          await expect(dish.getByRole('button')).toBeVisible()
        }
      }
    },
  )

  test(
    'FD-03 · quick-add puts one dish in the cart, confirms it and raises the cart count by one',
    {
      annotation: {
        type: 'spec',
        description:
          'Quick-add puts one of that dish into the cart and confirms it. The cart count in the header goes up by one.',
      },
    },
    async ({ page }) => {
      await openRestaurant(page)
      const dish = dishCards(page).first()
      const name = (await dish.getByRole('heading').textContent())!.trim()
      const before = await cartCount(page)
      const url = page.url()

      // The quick-add button has no accessible name; it is the only button in the dish card.
      await dish.getByRole('button').click()

      await expect(page.getByRole('region', { name: /Notifications/ }).first()).toContainText(name)
      await expect.poll(() => cartCount(page)).toBe(before + 1)
      expect(page.url()).toBe(url)

      await page.getByRole('button', { name: /^Cart\b/ }).click()
      const cart = page.getByRole('dialog')
      await expect(cart.getByRole('heading', { name, exact: true })).toHaveCount(1)
    },
  )

  test(
    'FD-03 · selecting a dish opens its detail page',
    {
      annotation: {
        type: 'spec',
        description: 'Selecting the dish itself opens its detail page (FD-04).',
      },
    },
    async ({ page }) => {
      await openRestaurant(page)
      const dish = dishCards(page).first()
      const name = (await dish.getByRole('heading').textContent())!.trim()

      await dish.getByRole('heading').click()

      await expect(page).toHaveURL(/\/product\/[^/]+$/)
      await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
    },
  )

  test(
    'FD-03 · every button on the restaurant page has an accessible name',
    {
      annotation: [
        {
          type: 'bug',
          description: 'Every quick-add button on the restaurant page is an icon-only button with no accessible name.',
        },
        {
          type: 'spec',
          description:
            'Every button can be used with a screen reader: each one has an accessible name that says what it does, including icon-only buttons such as quick-add.',
        },
      ],
    },
    async ({ page }) => {
      await openRestaurant(page)
      await expect(dishCards(page).first()).toBeVisible()
      const buttons = await page.getByRole('button').all()
      expect(buttons.length).toBeGreaterThan(0)
      for (const button of buttons) {
        await expect.soft(button).toHaveAccessibleName(/\S/)
      }
      // Quick-add says what it does: its name says it adds.
      for (const card of await dishCards(page).all()) {
        await expect.soft(card.getByRole('button'), 'quick-add names its action').toHaveAccessibleName(/add/i)
      }
    },
  )
})
