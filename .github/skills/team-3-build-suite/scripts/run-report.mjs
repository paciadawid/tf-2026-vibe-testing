#!/usr/bin/env node
// Runs the suite, then writes the requirements view of the result.
//
//   node run-report.mjs <suite-folder> --spec=spec,spec/battle --url=<address> [-- <playwright args>]
//
// - runs `npx playwright test --config=<suite> --project=chromium` with the args after `--`
//   (a file filter, --retries=0, --repeat-each=3 …), list output on screen;
// - sets the Status cell of every coverage.md row whose Test title ran: pass, fail — bug,
//   fail — triage (red without a bug annotation), flaky, skipped;
// - copies the failure screenshot of every red test to <suite>/specs/bugs/;
// - writes <suite>/specs/report.html: stories × rules, bugs with the spec line, outside-scope
//   findings, and a link to Playwright's own HTML report (<suite>/playwright-report/).
// Exits with Playwright's exit code, after the report is written.
import { spawnSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, copyFileSync } from 'node:fs'
import { join, resolve, relative, dirname } from 'node:path'

const argv = process.argv.slice(2)
const split = argv.indexOf('--')
const own = split === -1 ? argv : argv.slice(0, split)
const pwArgs = split === -1 ? [] : argv.slice(split + 1)
const suite = own.find(a => !a.startsWith('--'))
if (!suite) {
  console.error('usage: run-report.mjs <suite-folder> --spec=spec,spec/battle --url=<address> [-- <playwright args>]')
  process.exit(2)
}
const opt = name => (own.find(a => a.startsWith(`--${name}=`)) || '').split('=').slice(1).join('=')
const specDirs = (opt('spec') || 'spec').split(',').filter(Boolean)
const url = opt('url')

let root = process.cwd()
try { root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim() } catch {}
const suiteDir = resolve(suite)
const specsDir = join(suiteDir, 'specs')
const resultsFile = join(suiteDir, 'test-results', 'results.json')
const htmlDir = join(suiteDir, 'playwright-report')
mkdirSync(specsDir, { recursive: true })

// 1. Run.
const started = new Date()
const run = spawnSync(
  'npx',
  ['playwright', 'test', `--config=${suite}`, '--project=chromium', '--reporter=list,json,html', ...pwArgs],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: resultsFile, PLAYWRIGHT_HTML_OUTPUT_DIR: htmlDir, PLAYWRIGHT_HTML_OPEN: 'never' },
  },
)
if (!existsSync(resultsFile)) {
  console.error(`FAIL  Playwright wrote no results to ${resultsFile}`)
  process.exit(run.status || 1)
}
const json = JSON.parse(readFileSync(resultsFile, 'utf8'))

// 2. One entry per test title, across repeats and retries.
const strip = s => String(s || '').replace(/\u001b\[[0-9;]*m/g, '')
const tests = new Map()
const walk = s => {
  for (const spec of s.specs || []) {
    const t = tests.get(spec.title) || { title: spec.title, file: spec.file, line: spec.line, outcomes: [], annotations: [], error: '', screenshot: '' }
    for (const run of spec.tests || []) {
      t.outcomes.push(run.status) // expected | unexpected | flaky | skipped
      t.annotations = run.annotations || t.annotations
      for (const r of run.results || []) {
        if (r.status === 'failed' || r.status === 'timedOut') {
          t.error ||= strip(r.error && r.error.message).split('\n').slice(0, 8).join('\n')
          const shot = (r.attachments || []).find(a => a.name === 'screenshot' && a.path)
          if (shot) t.screenshot = shot.path
        }
      }
    }
    tests.set(spec.title, t)
  }
  for (const child of s.suites || []) walk(child)
}
for (const s of json.suites || []) walk(s)

const note = (t, type) => (t.annotations.find(a => a.type === type) || {}).description || ''
for (const t of tests.values()) {
  t.id = (t.title.match(/^([A-Z]+-\d+) · /) || [])[1] || '—'
  const o = new Set(t.outcomes)
  if (o.has('flaky') || (o.has('expected') && o.has('unexpected'))) t.status = 'flaky'
  else if (o.has('unexpected')) t.status = note(t, 'bug') ? 'fail — bug' : 'fail — triage'
  else if (o.has('expected')) t.status = 'pass'
  else t.status = 'skipped'
}

// 3. Evidence for red tests. Only the tests that ran: a filtered run keeps the others' evidence.
const bugsDir = join(specsDir, 'bugs')
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
for (const t of tests.values()) {
  const to = join(bugsDir, `${slug(t.title)}.png`)
  if (t.status.startsWith('fail') && t.screenshot && existsSync(t.screenshot)) {
    mkdirSync(bugsDir, { recursive: true })
    copyFileSync(t.screenshot, to)
    t.evidence = relative(specsDir, to)
  } else {
    rmSync(to, { force: true })
  }
}

// 4. coverage.md: update Status cells of the rows that ran.
const coverageFile = join(specsDir, 'coverage.md')
const rows = []
let outsideScope = []
if (existsSync(coverageFile)) {
  const clean = c => c.replace(/`/g, '').replace(/\*\*/g, '').trim()
  let inOutside = false
  const lines = readFileSync(coverageFile, 'utf8').split('\n').map(line => {
    if (/^#+\s/.test(line)) inOutside = /seen outside scope/i.test(line)
    else if (inOutside && line.trim()) outsideScope.push(line.replace(/^\s*[-*]\s*/, ''))
    const cells = line.split('|').slice(1, -1)
    if (cells.length < 4 || !/^\s*[A-Z]+-\d+\s*$/.test(cells[0])) return line
    const row = { id: clean(cells[0]), rule: clean(cells[1]), title: clean(cells[2]), status: clean(cells[3]) }
    const t = tests.get(row.title)
    if (t) { row.status = t.status; row.test = t; cells[3] = ` ${t.status} ` }
    rows.push(row)
    return `|${cells.join('|')}|`
  })
  writeFileSync(coverageFile, lines.join('\n'))
}
const inCoverage = new Set(rows.map(r => r.title))
for (const t of tests.values()) if (!inCoverage.has(t.title)) rows.push({ id: t.id, rule: '(not in coverage.md)', title: t.title, status: t.status, test: t })

// 5. Stories from the spec.
const stories = []
for (const dir of specDirs) {
  const abs = join(root, dir)
  if (!existsSync(abs)) continue
  for (const f of readdirSync(abs).filter(f => f.endsWith('.md')).sort()) {
    for (const m of readFileSync(join(abs, f), 'utf8').matchAll(/^##\s+([A-Z]+-\d+)\s+·\s+(.+)$/gm)) {
      if (!stories.some(s => s.id === m[1])) stories.push({ id: m[1], title: m[2].trim(), file: `${dir}/${f}` })
    }
  }
}
for (const r of rows) if (!stories.some(s => s.id === r.id)) stories.push({ id: r.id, title: '(not in the spec)', file: '' })

// 6. HTML.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
// Spec text carries Markdown: render **bold** and `code`, escape the rest.
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>')
const label = k => ({ fail: 'to triage', gap: 'not covered', todo: 'to do' })[k] || k
const kind = s => s === 'pass' ? 'pass' : s === 'fail — bug' ? 'bug' : s.startsWith('fail') ? 'fail' : s === 'flaky' ? 'flaky' : s.startsWith('not covered') ? 'gap' : s.startsWith('to do') || s === 'has test' ? 'todo' : 'skip'
const count = k => rows.filter(r => kind(r.status) === k).length
const bugs = rows.filter(r => r.test && r.test.status.startsWith('fail'))
const reportLink = existsSync(join(htmlDir, 'index.html')) ? relative(specsDir, join(htmlDir, 'index.html')) : ''

const storyHtml = stories.map(s => {
  const mine = rows.filter(r => r.id === s.id)
  const summary = mine.length ? ['pass', 'bug', 'fail', 'flaky', 'gap', 'todo'].map(k => {
    const n = mine.filter(r => kind(r.status) === k).length
    return n ? `<span class="pill ${k}">${n} ${label(k)}</span>` : ''
  }).join('') : '<span class="pill todo">not started</span>'
  const body = mine.map(r => `
      <tr>
        <td><span class="badge ${kind(r.status)}">${esc(r.status)}</span></td>
        <td>${md(r.rule)}${r.test && note(r.test, 'spec') ? `<div class="spec">Spec: ${md(note(r.test, 'spec'))}</div>` : ''}</td>
        <td class="title">${esc(r.title || '—')}${r.test ? `<div class="loc">${esc(r.test.file)}:${r.test.line}</div>` : ''}</td>
      </tr>`).join('')
  return `
  <section>
    <h2><span class="id">${esc(s.id)}</span> ${esc(s.title)} <span class="pills">${summary}</span></h2>
    ${mine.length ? `<table><thead><tr><th>Status</th><th>Rule</th><th>Test</th></tr></thead><tbody>${body}</tbody></table>` : ''}
  </section>`
}).join('')

const bugHtml = bugs.length ? bugs.map(r => `
  <article class="bug-card">
    <h3><span class="badge ${kind(r.status)}">${esc(r.status)}</span> ${esc(r.title)}</h3>
    <p><b>Spec says:</b> ${md(note(r.test, 'spec') || r.rule)}</p>
    ${note(r.test, 'bug') ? `<p><b>The app did:</b> ${md(note(r.test, 'bug'))}</p>` : '<p><b>Not triaged yet:</b> no bug annotation — a broken test or a new bug.</p>'}
    ${r.test.error ? `<pre>${esc(r.test.error)}</pre>` : ''}
    ${r.test.evidence ? `<a href="${esc(r.test.evidence)}"><img src="${esc(r.test.evidence)}" alt="Screenshot at the failure of ${esc(r.title)}"></a>` : ''}
  </article>`).join('') : '<p>Bugs: none.</p>'

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test suite report · ${esc(relative(root, suiteDir))}</title>
<style>
  :root { --pass:#1a7f37; --bug:#cf222e; --fail:#bc4c00; --flaky:#9a6700; --gap:#6e7781; --todo:#0969da; --skip:#8c959f; --line:#d0d7de; }
  * { box-sizing: border-box } body { font: 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; color: #1f2328; background: #f6f8fa }
  header { background: #fff; border-bottom: 1px solid var(--line); padding: 24px 32px } main { padding: 24px 32px; max-width: 1200px }
  h1 { margin: 0 0 4px; font-size: 22px } .meta { color: #59636e; font-size: 13px } .meta a { color: var(--todo) }
  .cards { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px }
  .card { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 10px 16px; min-width: 110px }
  .card b { display: block; font-size: 24px } .card span { font-size: 12px; color: #59636e; text-transform: uppercase; letter-spacing: .04em }
  .card.pass b { color: var(--pass) } .card.bug b { color: var(--bug) } .card.fail b { color: var(--fail) } .card.flaky b { color: var(--flaky) } .card.gap b { color: var(--gap) }
  section, .bug-card { background: #fff; border: 1px solid var(--line); border-radius: 8px; margin: 0 0 16px; padding: 12px 16px }
  h2 { font-size: 16px; margin: 4px 0 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap } h2 .id { font-family: ui-monospace, monospace; color: #59636e }
  .pills { margin-left: auto; display: flex; gap: 4px } .pill { font-size: 12px; padding: 1px 8px; border-radius: 10px; color: #fff }
  table { width: 100%; border-collapse: collapse } th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-top: 1px solid var(--line) }
  th { font-size: 12px; color: #59636e; font-weight: 600 } td:first-child { width: 120px } .title { width: 40% }
  .badge { display: inline-block; font-size: 12px; padding: 1px 8px; border-radius: 10px; color: #fff; white-space: nowrap }
  .pass { background: var(--pass) } .bug { background: var(--bug) } .fail { background: var(--fail) } .flaky { background: var(--flaky) } .gap { background: var(--gap) } .todo { background: var(--todo) } .skip { background: var(--skip) }
  .card.pass, .card.bug, .card.fail, .card.flaky, .card.gap { background: #fff }
  .spec, .loc { font-size: 12px; color: #59636e; margin-top: 2px } .loc { font-family: ui-monospace, monospace }
  .bug-card h3 { font-size: 15px; margin: 4px 0 } pre { background: #f6f8fa; padding: 8px; overflow-x: auto; font-size: 12px; border-radius: 6px }
  .bug-card img { max-width: 480px; width: 100%; border: 1px solid var(--line); border-radius: 6px }
  h2.part { font-size: 18px; margin: 28px 0 12px }
</style></head><body>
<header>
  <h1>Test suite report — ${esc(relative(root, suiteDir))}</h1>
  <div class="meta">${esc(started.toISOString().replace('T', ' ').slice(0, 16))} UTC${url ? ` · against <code>${esc(url)}</code>` : ''} · ${Math.round((json.stats?.duration || 0) / 1000)} s${pwArgs.length ? ` · <code>${esc(pwArgs.join(' '))}</code>` : ''}${reportLink ? ` · <a href="${esc(reportLink)}">Playwright report, traces</a>` : ''}</div>
  <div class="cards">
    <div class="card"><b>${stories.filter(s => rows.some(r => r.id === s.id)).length}/${stories.length}</b><span>stories</span></div>
    <div class="card"><b>${rows.length}</b><span>rules</span></div>
    <div class="card pass"><b>${count('pass')}</b><span>pass</span></div>
    <div class="card bug"><b>${count('bug')}</b><span>bugs</span></div>
    <div class="card fail"><b>${count('fail')}</b><span>to triage</span></div>
    <div class="card flaky"><b>${count('flaky')}</b><span>flaky</span></div>
    <div class="card gap"><b>${count('gap') + count('todo')}</b><span>not covered</span></div>
  </div>
</header>
<main>
  <h2 class="part">Bugs and red tests</h2>${bugHtml}
  <h2 class="part">Coverage by story</h2>${storyHtml}
  ${outsideScope.length ? `<h2 class="part">Seen outside scope</h2><section><ul>${outsideScope.map(l => `<li>${md(l)}</li>`).join('')}</ul></section>` : ''}
</main></body></html>`
writeFileSync(join(specsDir, 'report.html'), html)

// 7. The same in one line per story, for the chat.
for (const s of stories) {
  const mine = rows.filter(r => r.id === s.id)
  if (!mine.length) continue
  const parts = ['pass', 'bug', 'fail', 'flaky', 'gap', 'todo'].map(k => [k, mine.filter(r => kind(r.status) === k).length]).filter(([, n]) => n)
  console.log(`${s.id} · ${mine.length} rules · ${parts.map(([k, n]) => `${n} ${k === 'fail' ? 'to triage' : k === 'gap' || k === 'todo' ? 'not covered' : k}`).join(' · ')}`)
}
console.log(`report: ${relative(root, join(specsDir, 'report.html'))}${existsSync(coverageFile) ? ` · statuses updated in ${relative(root, coverageFile)}` : ''}`)
process.exit(run.status ?? 1)
