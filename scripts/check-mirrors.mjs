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

/**
 * Plockar ut texten mellan "const NAMN = new Set([" / "new Map<…>([" och det
 * avslutande "])". Hoppar över strängar och kommentarer när hakparenteser
 * räknas, så att t.ex. "(" i en öppettidstext inte bryter av blocket.
 */
function block(src, name) {
  const start = src.indexOf(`const ${name} = `)
  if (start < 0) throw new Error(`${name} saknas`)
  const open = src.indexOf('([', start)
  if (open < 0) throw new Error(`${name}: hittar inte "(["`)
  let depth = 0
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++
      continue
    }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue }
    if (c === '[' || c === '{' || c === '(') depth++
    else if (c === ']' || c === '}' || c === ')') {
      depth--
      if (depth === 0) return src.slice(open + 1, i + 1)
    }
  }
  throw new Error(`${name}: oavslutad lista`)
}

/**
 * Tolkar blocket som riktiga värden (inte textjämförelse – den släppte igenom
 * ändrade blanksteg inne i texter och klippte vid "//" i URL:er, granskning
 * 12 okt 2026). Listorna får bara innehålla literaler; en variabel eller en
 * typkonvertering ger fel här i stället för att tyst hoppas över.
 */
function entries(text, name) {
  let arr
  try {
    arr = new Function(`"use strict"; return ${text}`)()
  } catch (e) {
    throw new Error(`${name}: kunde inte tolkas som literaler (${e.message})`)
  }
  if (!Array.isArray(arr)) throw new Error(`${name}: inte en lista`)
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x))
  const out = new Map()
  for (const item of arr) {
    const key = Array.isArray(item) ? item[0] : item
    if (typeof key !== 'string' || !/^(node|way|relation)\/\d+$/.test(key)) throw new Error(`${name}: ogiltig nyckel ${JSON.stringify(key)}`)
    if (out.has(key)) throw new Error(`${name}: ${key} finns två gånger`)
    out.set(key, Array.isArray(item) ? canon(item.slice(1)) : '')
  }
  return out
}

const src = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, readFileSync(f, 'utf8')]))
const problems = []
for (const name of LISTS) {
  let a, b
  try {
    a = entries(block(src.synk, name), name + ' (synk)')
    b = entries(block(src.app, name), name + ' (app)')
  } catch (e) {
    problems.push(e.message)
    continue
  }
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
