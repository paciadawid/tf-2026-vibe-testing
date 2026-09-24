import { test, expect } from '@playwright/test'

// The planner runs this test to boot a browser before it explores the app.
// `npx playwright init-agents` normally generates an empty stub here; this one asserts the app
// is actually reachable, so a red seed means "check your network", not "the planner is broken".
//
// Keep it fast and keep it about the app loading — not about any feature. Features are the
// generator's job, and you are about to make it do that.
test('the demo app loads', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Foodora/)

  // Foodora is a single-page app: the HTML ships an empty <div id="root">.
  // A non-empty root is the proof that JavaScript ran and React mounted.
  await expect(page.locator('#root')).not.toBeEmpty()
})
