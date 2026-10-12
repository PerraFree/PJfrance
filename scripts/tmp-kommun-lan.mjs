// TILLFÄLLIGT (tas bort efter körning): län för varje kommun via Nominatim reverse
// (kommunens mittpunkt i scripts/kommuner.json). Skriver JSON-raderna till loggen.
import { readFileSync } from 'node:fs'
const k = JSON.parse(readFileSync(new URL('./kommuner.json', import.meta.url), 'utf8')).kommuner
const UA = 'Tomningskartan-lan/1.0 (+https://tomningskartan.se/om/)'
const out = {}
for (const x of k) {
  const [lon, lat] = x.center
  let lan = null
  for (let i = 0; i < 2 && !lan; i++) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=8&lat=${lat}&lon=${lon}&accept-language=sv`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
      const j = await r.json()
      lan = (j.address?.county && /län/.test(j.address.county) ? j.address.county : null) ?? j.address?.state ?? null
      if (!lan) console.log("ADR", JSON.stringify(j.address))
    } catch {}
    await new Promise((res) => setTimeout(res, 1200))
  }
  out[x.name] = lan
  console.log('RAD', JSON.stringify([x.name, lan]))
}
console.log('RESULTAT ' + JSON.stringify(out))
