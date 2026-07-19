/** Tömningslogg – lär sig ert förbrukningsmönster och förutspår nästa tömning/påfyllning. */

export type TankType = 'vatten' | 'gravatten' | 'latrin'

export interface TankEvent {
  type: TankType
  /** Unix-tid i ms */
  time: number
}

export const TANK_LABELS: Record<TankType, string> = {
  vatten: 'Fyllde färskvatten',
  gravatten: 'Tömde gråvatten',
  latrin: 'Tömde latrin',
}

const KEY = 'tomningskartan:tanklog'
const MAX_EVENTS = 200

export function loadTankLog(): TankEvent[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as TankEvent[]) : []
  } catch {
    return []
  }
}

export function addTankEvent(log: TankEvent[], type: TankType): TankEvent[] {
  const next = [...log, { type, time: Date.now() }].slice(-MAX_EVENTS)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // localStorage otillgänglig – loggen gäller bara sessionen
  }
  return next
}

export function removeLastTankEvent(log: TankEvent[], type: TankType): TankEvent[] {
  const idx = log.map((e) => e.type).lastIndexOf(type)
  if (idx === -1) return log
  const next = [...log.slice(0, idx), ...log.slice(idx + 1)]
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // se ovan
  }
  return next
}

export interface TankPrediction {
  /** Antal loggade händelser av typen */
  count: number
  /** Genomsnittligt intervall i dagar, om det går att beräkna */
  avgIntervalDays?: number
  /** Uppskattat antal dagar kvar tills nästa gång (kan vara negativt = försenad) */
  daysLeft?: number
}

/** Beräknar snittintervall från de senaste händelserna och dagar kvar sedan senaste. */
export function predictTank(log: TankEvent[], type: TankType): TankPrediction {
  const times = log
    .filter((e) => e.type === type)
    .map((e) => e.time)
    .sort((a, b) => a - b)
  if (times.length === 0) return { count: 0 }
  if (times.length === 1) return { count: 1 }
  // Intervall längre än 30 dagar räknas som uppehåll mellan resor, inte förbrukning
  const intervals: number[] = []
  for (let i = 1; i < times.length; i++) {
    const days = (times[i] - times[i - 1]) / 86_400_000
    if (days <= 30) intervals.push(days)
  }
  if (intervals.length === 0) return { count: times.length }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const sinceLast = (Date.now() - times[times.length - 1]) / 86_400_000
  return {
    count: times.length,
    avgIntervalDays: avg,
    daysLeft: avg - sinceLast,
  }
}
