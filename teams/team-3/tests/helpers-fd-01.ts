import { expect, type Locator, type Page } from '@playwright/test'

export const SEARCH_BOX = 'Search for restaurants or dishes...'
export const UNAVAILABLE_BADGE = 'Not available at your address'

export type Card = { name: string; cuisines: string[] }

/** Every restaurant card: a link that holds the restaurant's level-3 heading. */
export function restaurantCards(page: Page): Locator {
  return page.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) })
}

/** Opens the landing page and waits until the restaurant cards have loaded. */
export async function openLanding(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Popular Restaurants', level: 2 })).toBeVisible()
  // The cards come from the live backend after the page renders.
  await expect(restaurantCards(page).first()).toBeVisible({ timeout: 15_000 })
}

/** Name and cuisines of every card shown right now, in page order. */
export async function readCards(page: Page): Promise<Card[]> {
  const cards: Card[] = []
  for (const card of await restaurantCards(page).all()) {
    const name = (await card.getByRole('heading', { level: 3 }).innerText()).trim()
    const cuisines = (await card.getByRole('paragraph').first().innerText())
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
    cards.push({ name, cuisines })
  }
  return cards
}

export async function readNames(page: Page): Promise<string[]> {
  return (await readCards(page)).map(c => c.name)
}

export function searchBox(page: Page): Locator {
  return page.getByRole('textbox', { name: SEARCH_BOX })
}

export function chip(page: Page, cuisine: string): Locator {
  return page.getByRole('button', { name: cuisine, exact: true })
}
