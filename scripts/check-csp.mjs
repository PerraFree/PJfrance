#!/usr/bin/env node
// Vakt (deploy.yml): varje https-värd som nämns i src/ måste antingen finnas i
// CSP:n i vite.config.ts eller stå nedan som "bara länk" (öppnas i ny flik,
// hämtas aldrig av appen). Annars skulle en ny tjänst blockeras tyst av CSP:n
// i produktion men fungera i dev. (Granskning 12 okt 2026.)
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const LINK_ONLY = new Set([
  'www.openstreetmap.org', 'www.google.com', 'www.windy.com', 'github.com',
  'supabase.com', 'schema.org', 'tomningskartan.se', 'www.w3.org',
  'data.trafikverket.se', 'opendata.smhi.se',
  'api.trafikinfo.trafikverket.se', // src/lib/trafikverket.ts anropas inte från appen (bara CI)
])

const cfg = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
const allowed = [...cfg.matchAll(/'https:\/\/([^'\s]+)'/g)].map((m) => m[1])
const ok = (host) => LINK_ONLY.has(host) || allowed.some((a) => a === host || (a.startsWith('*.') && host.endsWith(a.slice(1))))

const files = []
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && files.push(p) } }
walk(new URL('../src', import.meta.url).pathname)

const bad = []
for (const f of files) {
  for (const m of readFileSync(f, 'utf8').matchAll(/https:\/\/([a-z0-9{}.-]+\.[a-z]{2,})/gi)) {
    const host = m[1].replace(/^\{s\}\./, 'a.').toLowerCase()
    if (!ok(host)) bad.push(`${f.split('/src/')[1]}: ${m[1]}`)
  }
}
if (!/http-equiv': 'Content-Security-Policy'/.test(cfg)) bad.push('vite.config.ts saknar CSP-meta')
if (bad.length) {
  console.error('Värdar som varken finns i CSP:n (vite.config.ts) eller i LINK_ONLY (scripts/check-csp.mjs):')
  for (const b of [...new Set(bad)]) console.error('  - ' + b)
  process.exit(1)
}
console.log(`OK: alla externa värdar i src/ täcks av CSP:n (${allowed.length} tillåtna)`)
