#!/usr/bin/env node
// Explores the app in a browser of its own, so several agents can explore at the same time
// (the Playwright MCP browser is one browser shared by every agent of a session).
//
//   node explore.mjs <address> <<'STEPS'
//   goto /
//   fill textbox "Search" burger
//   click button "Pizza" exact
//   wait "No restaurants found"
//   STEPS
//
// Every call starts from a fresh browser context — clean storage, like a test — and replays the
// steps in order. After the last step (and at every `snapshot` step) it prints the URL and the
// page's accessibility snapshot, the same tree `getByRole` reads. A step that fails prints the
// error and the snapshot of the page as it was, and exits 1.
//
// Steps, one per line (`#` starts a comment). <target> is a role and a quoted accessible name,
// `button "Place Order"`, a bare role for an unnamed region (`dialog`, `main`), or `text "…"`,
// `label "…"`, `placeholder "…"`; add `exact` after the name to match it whole.
//   goto <path>                      relative to the address
//   click <target>                   check <target>          hover <target>
//   fill <target> <text>             select <target> <option>
//   press <key>                      Enter, Tab, Escape …
//   wait "<text>"                    until the text is visible
//   back | reload
//   snapshot [<target>]              print the page, or only that region
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'

const [address, file] = process.argv.slice(2)
if (!address) {
  console.error('usage: node explore.mjs <address> [steps-file]   (steps on stdin when no file)')
  process.exit(2)
}
const lines = readFileSync(file ?? 0, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'))

const TARGET = /^(\w+)(?:\s+"([^"]*)")?(?:\s+(exact))?\s*(.*)$/

function locate(page, spec) {
  const m = TARGET.exec(spec)
  if (!m) throw new Error(`expected <role> "<name>", got: ${spec}`)
  if (m[2] === undefined && !/^[a-z]+$/.test(m[1])) throw new Error(`expected a role, got: ${m[1]}`)
  const [, kind, name, exact, rest] = m
  const opts = { exact: Boolean(exact) }
  const loc =
    kind === 'text' ? page.getByText(name, opts)
    : kind === 'label' ? page.getByLabel(name, opts)
    : kind === 'placeholder' ? page.getByPlaceholder(name, opts)
    : name === undefined ? page.getByRole(kind)
    : page.getByRole(kind, { name, ...opts })
  return [loc, rest]
}

async function show(page, header, region) {
  const tree = await (region ?? page.locator('body')).ariaSnapshot()
  console.log(`--- ${header}\nurl: ${page.url()}\n${tree}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ baseURL: address.replace(/\/+$/, '') })
page.setDefaultTimeout(5_000)

let failed = false
let shown = false
for (const [i, line] of lines.entries()) {
  const [verb, ...more] = line.split(/\s+/)
  const arg = line.slice(verb.length).trim()
  shown = false
  try {
    if (verb === 'goto') await page.goto(arg || '/')
    else if (verb === 'press') await page.keyboard.press(more[0])
    else if (verb === 'wait') await page.getByText(arg.replace(/^"|"$/g, '')).first().waitFor()
    else if (verb === 'back') await page.goBack()
    else if (verb === 'reload') await page.reload()
    else if (verb === 'snapshot') {
      await show(page, `after step ${i + 1}: ${line}`, arg ? locate(page, arg)[0] : undefined)
      shown = true
    } else {
      const [loc, rest] = locate(page, arg)
      if (verb === 'click') await loc.click()
      else if (verb === 'check') await loc.check()
      else if (verb === 'hover') await loc.hover()
      else if (verb === 'fill') await loc.fill(rest)
      else if (verb === 'select') await loc.selectOption(rest)
      else throw new Error(`unknown step: ${verb}`)
    }
  } catch (e) {
    console.log(`FAIL  step ${i + 1}: ${line}`)
    console.log(String(e.message).split('\n').slice(0, 12).join('\n'))
    failed = true
    break
  }
}
if (!shown) {
  await show(page, failed ? 'page when it failed' : 'after the last step').catch(e => console.log(`(no snapshot: ${e.message})`))
}
await browser.close()
process.exit(failed ? 1 : 0)
