import { expect, type Locator, type Page } from '@playwright/test'

// The promotion FD-01 gives as its example; the restaurant that advertises it is the one opened.
export const PROMOTION = '20% OFF orders over $25'

/** '$12.95' → 1295 cents; the first amount in the text. */
export function cents(text: string | null): number {
  const m = /\$(\d+)\.(\d{2})/.exec(text ?? '')
  if (!m) throw new Error(`no amount in: ${text}`)
  return Number(m[1]) * 100 + Number(m[2])
}

/** The cart count the header button shows, 0 when it shows none. */
export async function cartCount(page: Page): Promise<number> {
  const name = (await page.getByRole('button', { name: /^Cart\b/ }).textContent()) ?? ''
  const m = /(\d+)/.exec(name)
  return m ? Number(m[1]) : 0
}

/** The landing card of the restaurant with the promotion. */
export async function promotedCard(page: Page): Promise<Locator> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const card = page.getByRole('link').filter({ hasText: PROMOTION })
  // The cards come from the live backend after the page renders.
  await expect(card, `no restaurant card advertises "${PROMOTION}"`).toHaveCount(1, { timeout: 15_000 })
  return card
}

/** Opens the promoted restaurant from its landing card and waits for its menu. */
export async function openRestaurant(page: Page): Promise<string> {
  const card = await promotedCard(page)
  const name = (await card.getByRole('heading').textContent())!.trim()
  await card.click()
  // The restaurant and its menu come from the live backend after the page renders.
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('tabpanel')).toBeVisible({ timeout: 15_000 })
  return name
}

/** The dish cards in the visible menu tab: links to a product page. */
export function dishCards(page: Page): Locator {
  return page.getByRole('tabpanel').getByRole('link')
}

/** Opens the first dish of the promoted restaurant's first tab; returns its card's name and description. */
export async function openDish(page: Page): Promise<{ name: string; description: string }> {
  await openRestaurant(page)
  const card = dishCards(page).first()
  const name = (await card.getByRole('heading').textContent())!.trim()
  const description = (await card.getByRole('paragraph').first().textContent())!.trim()
  await card.getByRole('heading').click()
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /^Add to Cart/ })).toBeVisible()
  return { name, description }
}
