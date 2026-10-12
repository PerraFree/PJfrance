#!/usr/bin/env node
// Kontrollerar att de speglade OSM-listorna är identiska i synkskriptet och
// appens live-hämtning: EXCLUDED_OSM_ELEMENTS, OSM_FACILITY_OVERRIDES och
// OSM_SEASON_OVERRIDES, OSM_UNVERIFIED_OVERRIDES. De måste ändras i BÅDA filerna (CLAUDE.md), annars
// visar live-hämtningen något annat än seeden. Körs i deploy.yml före bygget
// och stoppar deployen vid avvikelse. Kör lokalt: node scripts/check-mirrors.mjs
import { readFileSync } from 'node:fs'

const FILES = {
  synk: new URL('./sync-stations.mjs', import.meta.url),
  app: new URL('../src/lib/overpass.ts', import.meta.url),
}
const LISTS = ['EXCLUDED_OSM_ELEMENTS', 'OSM_FACILITY_OVERRIDES', 'OSM_SEASON_OVERRIDES', 'OSM_UNVERIFIED_OVERRIDES']

/** Plockar ut texten mellan "const NAMN = new Set([|new Map(...[" och det avslutande "])". */
function block(src, name) {
  const start = src.indexOf(`const ${name} = `)
  if (start < 0) throw new Error(`${name} saknas`)
  const open = src.indexOf('([', start)
  if (open < 0) throw new Error(`${name}: hittar inte "(["`)
  let depth = 0
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i]
    if (c === '[' || c === '{' || c === '(') depth++
    else if (c === ']' || c === '}' || c === ')') {
      if (depth === 0) return src.slice(open + 2, i)
      depth--
    }
  }
  throw new Error(`${name}: oavslutad lista`)
}

/** Tar bort kommentarer och normaliserar citattecken/blanksteg så att TS och JS jämförs lika. */
function normalize(s) {
  return s
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"/g, "'")
    .replace(/\s+/g, '')
    .replace(/,(?=[\]}])/g, '')
}

/** Delar upp ett normaliserat listblock i poster: nyckel → värdetext. */
function entries(norm, isMap) {
  const out = new Map()
  if (!isMap) {
    for (const m of norm.matchAll(/'((?:node|way|relation)\/\d+)'/g)) out.set(m[1], '')
    return out
  }
  for (const m of norm.matchAll(/\['((?:node|way|relation)\/\d+)',(\[[^\]]*\]|\{[^}]*\})\]/g)) out.set(m[1], m[2])
  return out
}

const src = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, readFileSync(f, 'utf8')]))
const problems = []
for (const name of LISTS) {
  const isMap = name !== 'EXCLUDED_OSM_ELEMENTS'
  const a = entries(normalize(block(src.synk, name)), isMap)
  const b = entries(normalize(block(src.app, name)), isMap)
  for (const [k, v] of a) {
    if (!b.has(k)) problems.push(`${name}: ${k} finns bara i sync-stations.mjs`)
    else if (b.get(k) !== v) problems.push(`${name}: ${k} skiljer sig (synk ${v} / app ${b.get(k)})`)
  }
  for (const k of b.keys()) if (!a.has(k)) problems.push(`${name}: ${k} finns bara i overpass.ts`)
  if (a.size === 0) problems.push(`${name}: tom lista i sync-stations.mjs?`)
  console.log(`${name}: ${a.size} poster i synk, ${b.size} i app`)
}
if (problems.length) {
  console.error('\nSpeglade listor skiljer sig – ändra ALLTID båda filerna (CLAUDE.md):')
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log('OK: listorna är identiska i scripts/sync-stations.mjs och src/lib/overpass.ts')
