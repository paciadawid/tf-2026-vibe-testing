import { test, expect, type Page } from '@playwright/test'
import { chip, openLanding, readCards, readNames, restaurantCards, searchBox } from './helpers-fd-01'

const CHIPS = ['Pizza', 'Burgers', 'Sushi', 'Italian', 'Mediterranean']
const sorted = (names: string[]) => [...names].sort()

/** Names shown after typing `term` into the search box on a fresh landing page. */
async function namesFor(page: Page, term: string): Promise<string[]> {
  await openLanding(page)
  const all = await readNames(page)
  await searchBox(page).fill(term)
  await expect.poll(async () => sorted(await readNames(page))).not.toEqual(sorted(all))
  return readNames(page)
}

test.describe('FD-02 · Search and filter', { tag: '@FD-02' }, () => {
  test(
    'FD-02 · search finds restaurants by restaurant name and by dish name',
    {
      annotation: [
        {
          type: 'spec',
          description:
            'The search box finds restaurants by **restaurant name** or by **dish name**. *"Classic Beef"* finds the restaurant that serves the Classic Beef Burger.',
        },
        {
          type: 'bug',
          description:
            'Searching "Classic Beef" shows No restaurants found: search matches restaurant names and cuisines, not dish names.',
        },
      ],
    },
    async ({ page }) => {
      await openLanding(page)
      const cards = restaurantCards(page)
      const hrefs = await cards.evaluateAll(els => els.map(a => a.getAttribute('href')!))
      const names = await readNames(page)

      // By restaurant name: every restaurant is found by its own name.
      const byName = names[0]
      await searchBox(page).fill(byName)
      await expect.poll(async () => sorted(await readNames(page))).not.toEqual(sorted(names))
      expect(await readNames(page)).toContain(byName)

      // By dish name: find at run time the restaurant whose menu has the Classic Beef Burger.
      let server: string | undefined
      for (const [i, href] of hrefs.entries()) {
        await page.goto(href, { waitUntil: 'domcontentloaded' })
        // Wait for the menu (its category tabs), then look for the dish among its headings.
        await expect(page.getByRole('tab').first()).toBeVisible()
        await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible()
        if ((await page.getByRole('heading', { name: /Classic Beef Burger/i }).count()) > 0) {
          server = names[i]
          break
        }
      }
      expect(server, 'a restaurant on the list serves the Classic Beef Burger').toBeDefined()

      const found = await namesFor(page, 'Classic Beef')
      expect(found).toContain(server!)
    },
  )

  test(
    'FD-02 · search ignores upper and lower case',
    {
      annotation: {
        type: 'spec',
        description: 'Search ignores upper and lower case: *burger* and *BURGER* give the same result.',
      },
    },
    async ({ page }) => {
      const lower = await namesFor(page, 'burger')
      expect(lower.length).toBeGreaterThan(0)

      await searchBox(page).fill('BURGER')
      await expect.poll(async () => sorted(await readNames(page))).toEqual(sorted(lower))
    },
  )

  test(
    'FD-02 · results update while typing and the search button gives the same result',
    {
      annotation: {
        type: 'spec',
        description: 'Results update while the customer types; pressing **Search** gives the same result.',
      },
    },
    async ({ page }) => {
      await openLanding(page)
      const all = await readNames(page)

      // Typed key by key, never pressing Search: the list changes on its own.
      await searchBox(page).pressSequentially('burger')
      await expect.poll(async () => sorted(await readNames(page))).not.toEqual(sorted(all))
      const typed = await readNames(page)
      expect(typed.length).toBeGreaterThan(0)

      await page.getByRole('button', { name: 'Search', exact: true }).click()
      await expect.poll(async () => sorted(await readNames(page))).toEqual(sorted(typed))
    },
  )

  test(
    'FD-02 · a cuisine chip shows only restaurants serving that cuisine',
    {
      annotation: {
        type: 'spec',
        description:
          'The cuisine chips (**All**, **Pizza**, **Burgers**, **Sushi**, **Italian**, **Mediterranean**) show only restaurants serving that cuisine.',
      },
    },
    async ({ page }) => {
      await openLanding(page)
      const every = await readCards(page)

      for (const cuisine of CHIPS) {
        await chip(page, cuisine).click()
        const expected = every.filter(c => c.cuisines.includes(cuisine)).map(c => c.name)
        await expect
          .poll(async () => sorted(await readNames(page)), { message: `chip ${cuisine}` })
          .toEqual(sorted(expected))
        for (const shown of await readCards(page)) {
          expect(shown.cuisines, `${shown.name} under ${cuisine}`).toContain(cuisine)
        }
      }
    },
  )

  test(
    'FD-02 · the all chip shows every restaurant',
    { annotation: { type: 'spec', description: '**All** shows every restaurant.' } },
    async ({ page }) => {
      await openLanding(page)
      const every = await readNames(page)

      await chip(page, CHIPS[0]).click()
      await expect.poll(async () => sorted(await readNames(page))).not.toEqual(sorted(every))

      await chip(page, 'All').click()
      await expect.poll(async () => sorted(await readNames(page))).toEqual(sorted(every))
    },
  )

  test(
    'FD-02 · a search and a cuisine chip apply together',
    {
      annotation: [
        {
          type: 'spec',
          description:
            'A search and a selected cuisine chip apply **together**: with **Pizza** selected, searching *burger* shows only restaurants that match both.',
        },
        {
          type: 'bug',
          description:
            'With Pizza selected, searching "burger" drops the Pizza filter and shows the burger results; the last action wins (a chip even overwrites the typed search).',
        },
      ],
    },
    async ({ page }) => {
      const burger = await namesFor(page, 'burger')

      await openLanding(page)
      await chip(page, 'Pizza').click()
      const every = await readCards(page)
      const pizza = every.filter(c => c.cuisines.includes('Pizza')).map(c => c.name)
      await expect.poll(async () => sorted(await readNames(page))).toEqual(sorted(pizza))

      await searchBox(page).fill('burger')

      const both = pizza.filter(n => burger.includes(n))
      await expect.poll(async () => sorted(await readNames(page))).toEqual(sorted(both))
      if (both.length === 0) await expect(page.getByText('No restaurants found')).toBeVisible()
    },
  )

  test(
    'FD-02 · no match shows no restaurants found with a hint',
    {
      annotation: {
        type: 'spec',
        description:
          'When nothing matches, the page says so — *No restaurants found* — with a hint to try another search or filter.',
      },
    },
    async ({ page }) => {
      await openLanding(page)
      await searchBox(page).fill('zzqx-no-such-restaurant')

      await expect(page.getByText('No restaurants found', { exact: true })).toBeVisible()
      await expect(page.getByText(/try (another|a different) .*(search|filter)/i)).toBeVisible()
      await expect(restaurantCards(page)).toHaveCount(0)
    },
  )
})
