export type OpenState = 'open' | 'closed' | 'unknown'

const DAYS: Record<string, string> = {
  Mo: 'mån',
  Tu: 'tis',
  We: 'ons',
  Th: 'tors',
  Fr: 'fre',
  Sa: 'lör',
  Su: 'sön',
  PH: 'helgdagar',
}
const MONTHS: Record<string, string> = {
  Jan: 'jan',
  Feb: 'feb',
  Mar: 'mar',
  Apr: 'apr',
  May: 'maj',
  Jun: 'jun',
  Jul: 'jul',
  Aug: 'aug',
  Sep: 'sep',
  Oct: 'okt',
  Nov: 'nov',
  Dec: 'dec',
}
const DAY = '(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)'
const MON = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
const TIME = '(?:[01]\\d|2[0-4]):[0-5]\\d'
// En månad med valfri dag ("May", "May 01"), ev. som intervall ("May 01-Oct 31").
const MONTH_ITEM = `${MON}(?: \\d{1,2})?(?:\\s*-\\s*${MON}(?: \\d{1,2})?)?`
const DAY_ITEM = `${DAY}(?:-${DAY})?`
const TIME_ITEM = `${TIME}\\s*-\\s*${TIME}`
const RULE_RE = new RegExp(
  `^(?:(${MONTH_ITEM}(?:\\s*,\\s*${MONTH_ITEM})*)\\s*:?\\s*)?` +
    `(?:(${DAY_ITEM}(?:\\s*,\\s*${DAY_ITEM})*)\\s*)?` +
    `(?:(${TIME_ITEM}(?:\\s*,\\s*${TIME_ITEM})*)\\s*)?` +
    `(off|closed|open)?$`,
)

function svMonthItem(item: string): string {
  return item
    .split(/\s*-\s*/)
    .map((part) => {
      const [m, d] = part.split(' ')
      return d ? `${Number(d)} ${MONTHS[m]}` : MONTHS[m]
    })
    .join('–')
}

function svTimeItem(item: string): string {
  const [a, b] = item.split(/\s*-\s*/)
  if (a === '00:00' && (b === '24:00' || b === '00:00')) return 'dygnet runt'
  return `${a}–${b}`
}

/**
 * Översätter OSM:s öppettider ("Mo-Fr 05:00-24:00; Sa-Su 08:00-24:00") till
 * svenska ("Mån–fre 05:00–24:00 · lör–sön 08:00–24:00"). Bara det vanliga
 * formatet (dagar, månader, klockslag, off/closed) översätts – allt annat
 * (veckonummer, "summer", fritext på svenska) returneras OFÖRÄNDRAT hellre än
 * att visas fel (rätt före fler).
 */
export function formatOpeningHours(value: string): string {
  const raw = value.trim()
  if (raw === '24/7') return 'Dygnet runt'
  // "Mo 07:00-19:00, Tu-Fr 07:00-16:00": komma efter ett klockslag/off följt
  // av en veckodag är en ny regel, inte en lista.
  const normalized = raw.replace(new RegExp(`(\\d|off|closed)\\s*,\\s*(?=${DAY}\\b)`, 'g'), '$1; ')
  const rules = normalized
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean)
  if (rules.length === 0) return value
  const out: string[] = []
  for (const rule of rules) {
    const m = RULE_RE.exec(rule)
    if (!m || !(m[1] || m[2] || m[3] || m[4])) return value
    const [, months, days, times, state] = m
    const parts: string[] = []
    if (months) parts.push(months.split(/\s*,\s*/).map(svMonthItem).join(', '))
    if (days) {
      parts.push(
        days
          .split(/\s*,\s*/)
          .map((d) => d.split('-').map((x) => DAYS[x]).join('–'))
          .join(', '),
      )
    }
    if (times) parts.push(times.split(/\s*,\s*/).map(svTimeItem).join(', '))
    if (state === 'off' || state === 'closed') parts.push('stängt')
    else if (state === 'open' && !times) parts.push('öppet')
    // Bara klockslag ("08:00-21:00") gäller alla dagar.
    if (!months && !days && times) parts.unshift('alla dagar')
    out.push(parts.join(' '))
  }
  const text = out.join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Bästa-möjliga bedömning av om en plats är öppen just nu utifrån OSM:s
 * opening_hours-sträng. opening_hours-biblioteket (~110 kB gzippat) lat-laddas
 * dynamiskt först när en popup med öppettider faktiskt öppnas – aldrig vid
 * appstart. Returnerar 'unknown' om strängen saknas/inte går att tolka.
 */
export async function openNow(value: string | undefined): Promise<OpenState> {
  if (!value) return 'unknown'
  if (value === '24/7') return 'open'
  try {
    const { default: OpeningHours } = await import('opening_hours')
    const oh = new OpeningHours(value, {
      lat: 62,
      lon: 15,
      address: { country_code: 'se', state: '' },
    })
    return oh.getState() ? 'open' : 'closed'
  } catch {
    return 'unknown'
  }
}
