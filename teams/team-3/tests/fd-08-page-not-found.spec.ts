import { test, expect } from '@playwright/test'

test.describe('FD-08 · Page not found', { tag: '@FD-08' }, () => {
  test(
    'FD-08 · any address that is not a Foodora page shows 404 — Page not found and a Return to Home link',
    {
      annotation: {
        type: 'spec',
        description: 'Any address that is not a Foodora page shows **404 — Page not found** and a **Return to Home** link.',
      },
    },
    async ({ page }) => {
      await page.goto('/this-page-does-not-exist', { waitUntil: 'domcontentloaded' })

      await expect(page.getByRole('heading', { name: '404 — Page not found', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Return to Home', exact: true })).toBeVisible()
    },
  )
})
