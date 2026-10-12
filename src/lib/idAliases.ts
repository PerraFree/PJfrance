/**
 * Gamla register-id → nuvarande id (public/data/id-aliases.json).
 *
 * Fram till 12 okt 2026 byggdes registrets id av listpositionen, så id:t
 * flyttade varje gång en post togs bort. Foton, betyg, bekräftelser och
 * favoriter som sparats under ett gammalt id översätts här till rätt plats.
 * Filen hämtas bara när det finns register-id att översätta, och bara en gång.
 */
let pending: Promise<Record<string, string>> | null = null

export function loadAliases(): Promise<Record<string, string>> {
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/id-aliases.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => (j && typeof j === 'object' ? (j as Record<string, string>) : {}))
      .catch(() => ({}))
  }
  return pending
}

/** Nuvarande id för ett (möjligen gammalt) id. */
export async function resolveId(id: string): Promise<string> {
  if (!id.startsWith('curated-')) return id
  const a = await loadAliases()
  return a[id] ?? id
}

/**
 * Översätter nycklarna i en karta. Finns flera gamla id som pekar på samma
 * plats slås värdena ihop med `merge` (t.ex. summera betyg, välj senaste datum).
 */
export async function remapKeys<T>(map: Map<string, T>, merge: (a: T, b: T) => T): Promise<Map<string, T>> {
  if (![...map.keys()].some((k) => k.startsWith('curated-'))) return map
  const a = await loadAliases()
  const out = new Map<string, T>()
  for (const [k, v] of map) {
    const id = a[k] ?? k
    const prev = out.get(id)
    out.set(id, prev === undefined ? v : merge(prev, v))
  }
  return out
}

/** Översätter en mängd id (favoriter). */
export async function remapSet(ids: Set<string>): Promise<Set<string>> {
  if (![...ids].some((k) => k.startsWith('curated-'))) return ids
  const a = await loadAliases()
  return new Set([...ids].map((k) => a[k] ?? k))
}
