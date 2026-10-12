#!/usr/bin/env node
// Källkontroll av registret – körs av verifiera-kallor.yml på en GitHub-runner
// (sandboxen är nätblockerad). För varje post i scripts/curated-places.json:
//   1. Hämtar webbadressen (website/url) och noterar om den svarar.
//   2. Letar efter de citat som sveparna skrivit in i description
//      ("Kontroll okt 2026 (<url>): "…"", "Källa (<url>): "…"", "Säsong …")
//      i sidans text. Hittas inte citatet längre kan sidan ha ändrats –
//      en kandidat för nästa område D-kontroll.
// Skriver en JSON-rapport (REPORT, standard kallkontroll.json) och en kort
// markdown-sammanfattning (SUMMARY) som workflowen lägger i ett GitHub-ärende.
// Stoppar aldrig bygget (exit 0) – det är en rapport, inte en vakt.
//
// Avsiktligt försiktig med larm: bara 404/410 och DNS-fel räknas som "död länk";
// 403/429/503, certifikat- och tidsfel rapporteras separat (bot-skydd m.m.).
// Citat jämförs normaliserat (gemener, ett blanksteg) på ett 40–60 teckens
// utdrag ur citatet, så att små redigeringar på sidan inte ger falsklarm.
import { readFileSync, writeFileSync } from 'node:fs'

const REG = new URL('./curated-places.json', import.meta.url)
const REPORT = process.env.REPORT ?? 'kallkontroll.json'
const SUMMARY = process.env.SUMMARY ?? 'kallkontroll.md'
const LIMIT = Number(process.env.LIMIT ?? 0) // 0 = alla; sätt t.ex. 50 för test
const CONCURRENCY = 6
const TIMEOUT_MS = 20000
const UA = 'Mozilla/5.0 (compatible; Tomningskartan-kallkontroll/1.0; +https://tomningskartan.se/om/)'

const reg = JSON.parse(readFileSync(REG, 'utf8'))

/** Normaliserar text för jämförelse: gemener, utan HTML-entiteter, ett blanksteg. */
export function norm(s) {
  return String(s ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** HTML → text (grovt men tillräckligt för substring-sök). */
export function htmlToText(html) {
  return norm(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
}

/**
 * Plockar ut de citat sveparna skrivit in: `Prefix (url): "citat"`. Inuti
 * citatet står ofta agentens egen inledning ("svenljunga.se (Tömningsplats): …")
 * följt av det ordagranna i enkla citattecken – vi föredrar det längsta
 * enkelciterade avsnittet, annars de första 60 tecknen efter ett ev. kolon.
 */
export function quotesOf(description) {
  const out = []
  const re = /(?:Kontroll|Säsong|Källa|Komplettering)[^()"]{0,40}\((https?:\/\/[^)\s]+)\):\s*"((?:[^"\\]|\\.){20,}?)"/g
  for (const m of String(description ?? '').matchAll(re)) {
    const url = m[1].split(' ')[0].replace(/[;,.]+$/, '')
    const raw = m[2]
    const inner = [...raw.matchAll(/'([^']{25,})'/g)].map((x) => x[1]).sort((a, b) => b.length - a.length)[0]
    if (!inner) continue // bara ordagranna citat ('…') går att kontrollera; parafraser ger falsklarm
    let probe = inner
    probe = probe.replace(/\[\.\.\.\]|\(\.\.\.\)|…|\.\.\./g, ' ').replace(/^[\s:;,.'"-]+/, '').trim()
    // 40–60 tecken räcker och tål redigeringar runt omkring
    const n = norm(probe)
    if (n.length < 25) continue
    out.push({ url, probe: n.slice(0, 60) })
  }
  return out
}

/**
 * Citatet hittat? Först hela utdraget, annars andelen 4-ordsfönster som finns i
 * sidtexten (≥ 40 %). Tål att agenten parafraserat eller att sidan redigerats.
 */
export function quoteFound(text, probe) {
  if (text.includes(probe)) return true
  const words = probe.split(' ').filter(Boolean)
  if (words.length < 5) return text.includes(probe)
  const shingles = []
  for (let i = 0; i + 4 <= words.length; i++) shingles.push(words.slice(i, i + 4).join(' '))
  const hits = shingles.filter((sh) => text.includes(sh)).length
  return hits / shingles.length >= 0.4
}

/** Första http(s)-adressen i ett fält som kan innehålla flera ("a ; b", "a (kommentar)"). */
export function firstUrl(v) {
  const m = /https?:\/\/[^\s;,()'"]+/i.exec(String(v ?? ''))
  return m ? m[0].replace(/[.,]+$/, '') : null
}

async function fetchText(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,*/*' } })
    const ct = res.headers.get('content-type') ?? ''
    const body = /pdf|octet-stream|image\//i.test(ct) ? '' : await res.text()
    return { status: res.status, text: /html|text|xml/i.test(ct) ? htmlToText(body) : norm(body), final: res.url }
  } catch (e) {
    const code = e?.cause?.code ?? e?.name ?? 'error'
    return { status: 0, error: code === 'AbortError' ? 'timeout' : String(code), text: '' }
  } finally {
    clearTimeout(t)
  }
}

async function main() {
  const jobs = []
  for (const p of reg) {
    const site = [p.website, p.url].map(firstUrl).find(Boolean)
    const quotes = quotesOf(p.description)
    if (!site && !quotes.length) continue
    jobs.push({ name: p.name, site, quotes })
  }
  const list = LIMIT ? jobs.slice(0, LIMIT) : jobs
  const cache = new Map()
  const get = async (url) => {
    if (!cache.has(url)) cache.set(url, fetchText(url))
    return cache.get(url)
  }
  const results = []
  let i = 0
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < list.length) {
      const job = list[i++]
      const r = { name: job.name, site: job.site, siteStatus: null, quotes: [] }
      if (job.site) {
        const f = await get(job.site)
        r.siteStatus = f.status || f.error
      }
      for (const q of job.quotes) {
        const f = await get(q.url)
        const readable = f.status === 200 && f.text.length > 1500 // kortare = troligen JS-skal utan innehåll
        r.quotes.push({ url: q.url, status: f.status || f.error, found: readable ? quoteFound(f.text, q.probe) : null, probe: q.probe })
      }
      results.push(r)
      if (results.length % 100 === 0) console.log(`${results.length}/${list.length}`)
    }
  }))

  const dead = results.filter((r) => r.site && (r.siteStatus === 404 || r.siteStatus === 410 || /ENOTFOUND|EAI_AGAIN|ECONNREFUSED/i.test(String(r.siteStatus))))
  const blocked = results.filter((r) => r.site && ([403, 429, 503, 406].includes(r.siteStatus) || /CERT|TLS|timeout|TIMEOUT/i.test(String(r.siteStatus))))
  const missing = results.flatMap((r) => r.quotes.filter((q) => q.found === false).map((q) => ({ name: r.name, url: q.url, probe: q.probe })))
  const okSites = results.filter((r) => r.site && r.siteStatus === 200).length
  const okQuotes = results.flatMap((r) => r.quotes).filter((q) => q.found === true).length
  const report = { date: new Date().toISOString(), checked: results.length, okSites, dead: dead.map((r) => ({ name: r.name, url: r.site, status: r.siteStatus })), blocked: blocked.map((r) => ({ name: r.name, url: r.site, status: r.siteStatus })), quotesChecked: results.flatMap((r) => r.quotes).filter((q) => q.found !== null).length, okQuotes, missingQuotes: missing }
  writeFileSync(REPORT, JSON.stringify(report, null, 1))

  // All text i ärendet kommer från registret eller främmande sajter – gör
  // @namn, #nr, länkar och markdown ofarligt (granskning 12 okt 2026).
  const safe = (t) => String(t ?? '').replace(/[@#[\]()<>`*_|!~]/g, ' ').replace(/\s+/g, ' ').trim()
  const safeUrl = (u) => '`' + String(u ?? '').replace(/`/g, '') + '`'
  const line = (x) => `- ${safe(x.name)} – ${safeUrl(x.url)} (${safe(x.status)})`
  const md = [
    `Källkontroll ${report.date.slice(0, 10)}: ${results.length} poster, ${okSites} webbadresser svarar 200, ${report.quotesChecked} citat kontrollerade varav ${okQuotes} hittade på sidan.`,
    '',
    `## Döda länkar (${dead.length}) – 404/410/DNS/timeout`,
    ...report.dead.slice(0, 80).map(line),
    dead.length > 80 ? `… och ${dead.length - 80} till (se artefakten)` : '',
    '',
    `## Citat som inte längre hittas på sidan (${missing.length}) – sidan kan ha ändrats, kandidater för område D`,
    ...missing.slice(0, 80).map((m) => `- ${safe(m.name)} – ${safeUrl(m.url)} (sökte "${safe(m.probe.slice(0, 50))}…")`),
    missing.length > 80 ? `… och ${missing.length - 80} till (se artefakten)` : '',
    '',
    `## Bot-skydd, certifikat- eller tidsfel (${blocked.length}) – fungerar ofta i webbläsare, bara info`,
    ...report.blocked.slice(0, 30).map(line),
  ].filter((l) => l !== undefined).join('\n')
  writeFileSync(SUMMARY, md)
  console.log(md.split('\n').slice(0, 12).join('\n'))
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => { console.error(e); process.exit(0) })
}
