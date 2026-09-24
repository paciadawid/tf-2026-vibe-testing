import { test, expect } from '@playwright/test'
import { UNAVAILABLE_BADGE, chip, openLanding, readNames, restaurantCards } from './helpers-fd-01'

test.describe('FD-01 · Browse restaurants', { tag: '@FD-01' }, () => {
  test(
    'FD-01 · each restaurant card shows name, cuisines, rating, delivery time and fee',
    {
      annotation: {
        type: 'spec',
        description:
          'Each restaurant card shows the name, the cuisines, the rating, the delivery time range and the delivery fee (or **Free**).',
      },
    },
    async ({ page }) => {
      await openLanding(page)
      const cards = await restaurantCards(page).all()
      expect(cards.length).toBeGreaterThan(0)

      for (const card of cards) {
        await expect(card.getByRole('heading', { level: 3 })).toHaveText(/\S/)
        await expect(card.getByRole('paragraph').first()).toHaveText(/\p{L}/u) // cuisines
        // Each value is its own text on the card, so match it whole.
        await expect(card.getByText(/^\s*[0-5](\.\d)?\s*$/).first()).toBeVisible() // rating
        await expect(card.getByText(/^\s*\d+\s*[-–]\s*\d+\s*min\s*$/).first()).toBeVisible() // time range
        await expect(card.getByText(/^\s*(\$\d+\.\d{2}|Free)\s*$/).first()).toBeVisible() // fee or Free
      }
    },
  )

  test(
    'FD-01 · a card shows the restaurant\'s current promotion',
    {
      annotation: {
        type: 'spec',
        description:
          "A card shows the restaurant's current promotion when it has one — for example *20% OFF orders over $25*.",
      },
    },
    async ({ page }) => {
      // A promotion reads like the spec's example: "<n>% OFF …".
      const PROMO = /\d+% off\b.*/i
      await openLanding(page)
      // Reading: an unavailable card shows its badge instead; only cards that can be opened are compared.
      const cards = restaurantCards(page).filter({ hasNotText: UNAVAILABLE_BADGE })
      const targets: { name: string; href: string }[] = []
      for (const card of await cards.all()) {
        targets.push({
          name: (await card.getByRole('heading', { level: 3 }).innerText()).trim(),
          href: (await card.getAttribute('href'))!,
        })
      }
      expect(targets.length).toBeGreaterThan(0)

      let withPromotion = 0
      for (const { name, href } of targets) {
        await page.goto(href, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible()
        const onPage = page.getByText(PROMO)
        const promotion = (await onPage.count()) ? (await onPage.first().innerText()).trim() : null

        await openLanding(page)
        const card = restaurantCards(page).filter({ has: page.getByRole('heading', { name, level: 3, exact: true }) })
        if (promotion) {
          withPromotion++
          await expect(card, `${name} card shows its promotion`).toContainText(promotion)
        } else {
          await expect(card, `${name} card shows no promotion`).not.toContainText(PROMO)
        }
      }
      expect(withPromotion, 'at least one restaurant has a promotion').toBeGreaterThan(0)
    },
  )

  test(
    'FD-01 · selecting a card opens that restaurant\'s page',
    { annotation: { type: 'spec', description: "Selecting a card opens that restaurant's page." } },
    async ({ page }) => {
      await openLanding(page)
      const card = restaurantCards(page).filter({ hasNotText: UNAVAILABLE_BADGE }).first()
      const name = (await card.getByRole('heading', { level: 3 }).innerText()).trim()

      await card.click()

      await expect(page).toHaveURL(/\/restaurant\/[^/]+$/)
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible()
    },
  )

  test(
    'FD-01 · view all shows the full list of restaurants',
    { annotation: { type: 'spec', description: '**View All** shows the full list of restaurants.' } },
    async ({ page }) => {
      // The full list: FD-02 says **All** is the only view guaranteed to show every restaurant.
      await openLanding(page)
      await chip(page, 'All').click()
      const every = await readNames(page)

      await openLanding(page)
      await page.getByRole('button', { name: 'View All', exact: true }).click()

      await expect.poll(async () => (await readNames(page)).sort()).toEqual([...every].sort())
    },
  )

  test(
    'FD-01 · an undeliverable restaurant is greyed out, badged and counted in the subtitle',
    {
      annotation: {
        type: 'spec',
        description:
          "A restaurant that does not deliver to the current address is shown greyed out with a *Not available at your address* badge, and the subtitle counts them (*1 don't deliver there*).",
      },
    },
    async ({ page }) => {
      await openLanding(page)
      const subtitle = page.getByText(/\d+ don't deliver there/)
      await expect(subtitle).toBeVisible()
      const counted = Number((await subtitle.innerText()).match(/(\d+) don't deliver there/)![1])

      const badged = restaurantCards(page).filter({ hasText: UNAVAILABLE_BADGE })
      await expect(badged).toHaveCount(counted)
      expect(counted, 'the current address needs at least one restaurant that does not deliver').toBeGreaterThan(0)

      // Greyed out: the card or something inside it is desaturated or faded.
      for (const card of await badged.all()) {
        const greyed = await card.evaluate(el =>
          [el, ...el.querySelectorAll('*')].some(e => {
            const s = getComputedStyle(e)
            return /grayscale\((?!0)/.test(s.filter) || Number(s.opacity) < 1
          }),
        )
        expect(greyed, 'unavailable card is greyed out').toBe(true)
      }
    },
  )

  test(
    'FD-01 · an unavailable restaurant cannot be opened',
    {
      annotation: [
        {
          type: 'spec',
          description:
            'A restaurant that does not deliver to the current address is shown greyed out with a *Not available at your address* badge, and the subtitle counts them (*1 don\'t deliver there*). It cannot be opened.',
        },
        {
          type: 'bug',
          description:
            "The unavailable restaurant's card is a normal link: selecting it opens /restaurant/<id> with a full menu that can be added to the cart.",
        },
      ],
    },
    async ({ page }) => {
      await openLanding(page)
      const card = restaurantCards(page).filter({ hasText: UNAVAILABLE_BADGE }).first()
      await expect(card).toBeVisible()
      const name = (await card.getByRole('heading', { level: 3 }).innerText()).trim()

      await card.click({ force: true })

      const opened = await page
        .waitForURL(/\/restaurant\//, { timeout: 3000 })
        .then(() => true, () => false)
      expect(opened, 'selecting an unavailable card must not open its page').toBe(false)
      await expect(page.getByRole('heading', { name, level: 1, exact: true })).toHaveCount(0)
    },
  )
})
