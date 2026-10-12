#!/usr/bin/env node
// Område C: applicerar agenternas res-<N>.json (format i UPPDRAG-obekraftade.md) på
// scripts/curated-places.json. Kör: SCRATCH=<scratchpad> node scripts/import-tools/apply-obekraftade.mjs --dry
// Regler (rätt före fler):
// - Promotas bara om status bekraftad/delvis OCH (confidence high ELLER medium med annan källa än
//   aggregator/bokningsportal). Bara de tjänster agenten styrkt flyttas till bekräftade.
// - Hel grå plats (unverified) blir bekräftad bara om minst en tjänst (eller ställplats vid status
//   'bekraftad') styrkts. Annars lämnas den orörd.
// - Motsagd tjänst med high tas bort från services; medium rörs inte (loggas).
import fs from 'node:fs'
import path from 'node:path'
const S = process.env.SCRATCH || '/tmp'
const DRY = process.argv.includes('--dry')
const CUR = 'scripts/curated-places.json'
const raw = JSON.parse(fs.readFileSync(CUR, 'utf8'))
const reg = raw.places || raw
const AGG = /camping\.se|campio|gasthamnsguiden|naturkartan|husbil|park4night|campingkollen|stallplatskartan|campingse/
const CORE = ['gravatten', 'latrin', 'vatten']
const short = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '')
const uniq = (a) => [...new Set(a)]
const st = { promoted: 0, whole: 0, removed: 0, skipped: 0 }
const log = []
for (const f of fs.readdirSync(path.join(S, 'c')).filter((x) => /^res-\d+\.json$/.test(x))) {
  const res = JSON.parse(fs.readFileSync(path.join(S, 'c', f), 'utf8'))
  for (const r of res.places) {
    // Slå upp på permanent id (sedan 12 okt 2026) eller, för äldre urval där
    // r.id var radnumret, kräv att namnet stämmer – annars hamnar rättningen
    // på fel plats om registret ändrats mellan urval och körning.
    const p = reg.find((x) => x.id === r.id) ?? (typeof r.id === 'number' && reg[r.id]?.name === r.name ? reg[r.id] : null)
    if (!p) { st.skipped++; log.push(`HOPPAR ÖVER (hittar inte ${r.id} "${r.name}" – registret har ändrats)`); continue }
    const conf = r.confidence
    if (/Eremit/.test(p.name)) { st.skipped++; continue } // vatten = hämtning på gården, tvetydigt
    const trusted = conf === 'high' || (conf === 'medium' && !AGG.test(r.source || ''))
    // motsagd (high) – ta bort tjänsten
    if (conf === 'high') {
      for (const s of r.contradictedServices || []) {
        if ((p.services || []).includes(s)) {
          p.services = p.services.filter((x) => x !== s)
          p.unverifiedServices = (p.unverifiedServices || []).filter((x) => x !== s)
          st.removed++; log.push(`TA BORT ${s}: ${p.name}`)
        }
      }
    } else if ((r.contradictedServices || []).length) log.push(`MOTSAGD (medium, rörs ej): ${p.name} ${r.contradictedServices}`)
    if (!['bekraftad', 'delvis'].includes(r.status) || !trusted) { st.skipped++; continue }
    let conf2 = (r.confirmedServices || []).filter((s) => CORE.includes(s) || s === 'stallplats' || s === 'camping')
    const hasStall = (p.services || []).includes('stallplats')
    if (p.unverified && r.status === 'bekraftad' && hasStall && !conf2.includes('stallplats')) conf2.push('stallplats')
    const wasWhole = !!p.unverified
    if (p.unverified) {
      if (!conf2.length) { st.skipped++; continue }
      delete p.unverified
      st.whole++
    }
    const unv = p.unverifiedServices || []
    const newly = conf2.filter((s) => unv.includes(s) || !(p.services || []).includes(s))
    if (!newly.length && !wasWhole) { st.skipped++; continue }
    p.services = uniq([...(p.services || []), ...conf2])
    p.unverifiedServices = unv.filter((s) => !conf2.includes(s))
    if (!p.unverifiedServices.length) delete p.unverifiedServices
    if (r.fee && r.fee.length <= 70) p.fee = r.fee
    if (r.openingHours && r.openingHours.length <= 60 && !p.openingHours) p.openingHours = r.openingHours
    if (r.season && ['seasonal', 'year-round'].includes(r.season) && !p.season) p.season = r.season
    p.confidence = conf
    const cite = `Källa (${r.source}): "${short(r.evidence, 300)}" Verifierad okt 2026 (område C).`
    p.description = (/Obekräftad plats|Har du varit här/.test(p.description || '') ? '' : (p.description || '') + ' ') + cite
    if (!p.description.startsWith('Källa')) p.description = p.description.trim()
    st.promoted++; log.push(`PROMOTAD ${conf}: ${p.name} +${conf2}`)
  }
}
console.log(log.join('\n')); console.log(st)
if (!DRY) fs.writeFileSync(CUR, JSON.stringify(raw, null, 2) + '\n')
