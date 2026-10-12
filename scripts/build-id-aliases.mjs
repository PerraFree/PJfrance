#!/usr/bin/env node
// Bygger public/data/id-aliases.json: gamla register-id → nuvarande id.
// Bakgrund: fram till 12 okt 2026 byggdes registrets id av listpositionen, så
// id:n flyttade varje gång en post togs bort. Foton, betyg, bekräftelser och
// favoriter sparade under ett gammalt id mappas här till rätt plats.
// Användning: node scripts/build-id-aliases.mjs <mapp med gamla seed-JSON>
// Matchning (i ordning): samma namn → sammanslagningsnot i description
// ('Sammanslagen … med "X"') → entydig registerplats inom 100 m.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
if (!dir) { console.error('ange mapp med gamla seed-filer'); process.exit(1) }
const reg = JSON.parse(readFileSync(new URL('./curated-places.json', import.meta.url), 'utf8'))
const seed = JSON.parse(readFileSync(new URL('../public/data/stations-seed.json', import.meta.url), 'utf8')).stations
const OUT = new URL('../public/data/id-aliases.json', import.meta.url)
const current = new Set(reg.map((p) => p.id))
const byName = new Map(reg.map((p) => [p.name, p.id]))
const merged = new Map()
for (const p of reg) for (const m of String(p.description ?? '').matchAll(/[Ss]ammanslagen[^"]{0,60}"([^"]+)"/g)) merged.set(m[1], p.id)
const pos = seed.filter((s) => current.has(s.id))
const dist = (a, b) => { const r = Math.PI / 180; const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r); const y = (b.lat - a.lat) * r; return Math.sqrt(x * x + y * y) * 6371e3 }

const aliases = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const stats = { name: 0, merge: 0, near: 0, none: 0 }
const seen = new Set()
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  let st
  try { st = JSON.parse(readFileSync(path.join(dir, f), 'utf8')); st = st.stations ?? st } catch { continue }
  for (const s of st) {
    if (!s.id?.startsWith('curated-') || current.has(s.id) || aliases[s.id] || seen.has(s.id)) continue
    seen.add(s.id)
    let to = byName.get(s.name)
    if (to) stats.name++
    else if ((to = merged.get(s.name))) stats.merge++
    else {
      const near = pos.filter((c) => typeof s.lat === 'number' && dist(s, c) <= 100)
      if (near.length === 1) { to = near[0].id; stats.near++ } else { stats.none++; continue }
    }
    aliases[s.id] = to
  }
}
// Kedjor (a→b där b själv är ett gammalt id) löses upp, och aldrig mot ett id som inte finns.
for (const [k, v] of Object.entries(aliases)) { let t = v; for (let n = 0; aliases[t] && n < 10; n++) t = aliases[t]; if (current.has(t)) aliases[k] = t; else delete aliases[k] }
writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(aliases).sort()), null, 0) + '\n')
console.log('alias:', Object.keys(aliases).length, stats)
