/**
 * Enkel säsongstolkning av OSM:s opening_hours.
 * Många svenska stationer stänger vintertid och taggas t.ex.
 * "May-Sep 08:00-20:00" eller "Apr 15-Oct 15". Vi letar efter månadsintervall
 * och avgör om stationen verkar vara stängd just nu. Heuristiken är medvetet
 * försiktig: hittas inget månadsintervall antas stationen vara öppen.
 */

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]

/** Returnerar true om opening_hours tydligt säger att platsen är säsongsstängd nu. */
export function isSeasonClosed(openingHours: string | undefined, now = new Date()): boolean {
  if (!openingHours) return false
  const text = openingHours.toLowerCase()
  if (text.includes('off') && !text.includes('-')) return false
  // Matcha månadsintervall som "may-sep" eller "apr 15-oct 15"
  const re = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+\d{1,2})?\s*-\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:\s+\d{1,2})?\b/g
  let match: RegExpExecArray | null
  let foundRange = false
  const month = now.getMonth() // 0-indexerad
  while ((match = re.exec(text)) !== null) {
    foundRange = true
    const start = MONTHS.indexOf(match[1])
    const end = MONTHS.indexOf(match[2])
    const inRange =
      start <= end
        ? month >= start && month <= end
        : month >= start || month <= end // intervall över årsskiftet, t.ex. Nov-Mar
    if (inRange) return false // minst ett intervall täcker nuvarande månad → öppet
  }
  return foundRange // intervall fanns men inget täcker nu → säsongsstängd
}
