#!/usr/bin/env node
// Ger nya registerposter ett permanent id (curated-<namn>) och lämnar befintliga
// orörda. Körs automatiskt av apply-skripten och kan köras för hand:
//   node scripts/assign-ids.mjs
// Ett id får ALDRIG ändras när det väl publicerats – foton, betyg, bekräftelser
// och favoriter hänger på det. Vid sammanslagning behåller man den kvarvarande
// postens id; den borttagnas id läggs i public/data/id-aliases.json.
import { readFileSync, writeFileSync } from 'node:fs'

const F = new URL('./curated-places.json', import.meta.url)
const slug = (t) => String(t).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const raw = readFileSync(F, 'utf8')
const reg = JSON.parse(raw)
const used = new Set(reg.map((p) => p.id).filter(Boolean))
let n = 0
const out = reg.map((p) => {
  if (p.id) return p
  let id = `curated-${slug(p.name)}`
  for (let k = 2; used.has(id); k++) id = `curated-${slug(p.name)}-${k}`
  used.add(id)
  n++
  const { name, ...rest } = p
  return { id, name, ...rest }
})
writeFileSync(F, JSON.stringify(out, null, 2) + (raw.endsWith('\n') ? '\n' : ''))
console.log(`assign-ids: ${n} nya id`)
