import { useEffect, useMemo, useRef, useState } from 'react'
import type { ParkedPosition } from '../lib/parking'
import { clearParked, saveParked } from '../lib/parking'
import type { ForecastHour } from '../lib/smhi'
import { fetchForecast, maxGustPerDay, minNightTemps } from '../lib/smhi'
import type { TankEvent, TankType } from '../lib/tanklog'
import { TANK_LABELS, addTankEvent, loadTankLog, predictTank, removeLastTankEvent } from '../lib/tanklog'
import type { VehicleProfile } from '../lib/vehicle'

type Tab = 'vattenpass' | 'vader' | 'tank' | 'fordon'

interface Props {
  open: boolean
  onClose: () => void
  vehicle: VehicleProfile
  onVehicleChange: (v: VehicleProfile) => void
  parked: ParkedPosition | null
  onParkedChange: (p: ParkedPosition | null) => void
  /** Kartans mittpunkt – används som väderposition när ingen parkering finns */
  mapCenter: { lat: number; lon: number }
}

const DAY_FMT = new Intl.DateTimeFormat('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })

/* ---------- Vattenpass ---------- */

function LevelTool({ vehicle }: { vehicle: VehicleProfile }) {
  const [tilt, setTilt] = useState<{ beta: number; gamma: number } | null>(null)
  const [offset, setOffset] = useState({ beta: 0, gamma: 0 })
  const [needsPermission, setNeedsPermission] = useState(false)
  const [error, setError] = useState('')
  const latest = useRef<{ beta: number; gamma: number } | null>(null)

  useEffect(() => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      setError('Din enhet saknar lutningssensor – öppna appen i mobilen.')
      return
    }
    const doe = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof doe.requestPermission === 'function') {
      setNeedsPermission(true)
      return
    }
    return listen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function listen() {
    const handler = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      latest.current = { beta: e.beta, gamma: e.gamma }
      setTilt(latest.current)
    }
    window.addEventListener('deviceorientation', handler)
    return () => window.removeEventListener('deviceorientation', handler)
  }

  async function requestPermission() {
    try {
      const doe = DeviceOrientationEvent as unknown as {
        requestPermission: () => Promise<string>
      }
      const state = await doe.requestPermission()
      if (state === 'granted') {
        setNeedsPermission(false)
        listen()
      } else {
        setError('Åtkomst till lutningssensorn nekades.')
      }
    } catch {
      setError('Kunde inte begära sensoråtkomst.')
    }
  }

  const pitch = tilt ? tilt.beta - offset.beta : 0
  const roll = tilt ? tilt.gamma - offset.gamma : 0
  // Kilhöjd = tan(vinkel) × avstånd mellan hjulen
  const pitchCm = Math.tan((Math.abs(pitch) * Math.PI) / 180) * vehicle.wheelbase * 100
  const rollCm = Math.tan((Math.abs(roll) * Math.PI) / 180) * vehicle.track * 100
  const level = Math.abs(pitch) < 0.5 && Math.abs(roll) < 0.5

  if (error) return <p className="tool-note">{error}</p>
  if (needsPermission)
    return (
      <button className="btn" onClick={requestPermission}>
        Aktivera lutningssensorn
      </button>
    )
  if (!tilt) return <p className="tool-note">Väntar på sensorvärden …</p>

  return (
    <div className="level">
      <div className={level ? 'bubble-box level-ok' : 'bubble-box'}>
        <div
          className="bubble"
          style={{
            transform: `translate(${Math.max(-1, Math.min(1, roll / 10)) * 60}px, ${
              Math.max(-1, Math.min(1, pitch / 10)) * 60
            }px)`,
          }}
        />
        <div className="crosshair" />
      </div>
      <p>
        <strong>Framåt/bakåt:</strong> {pitch.toFixed(1)}°{' '}
        {Math.abs(pitch) >= 0.5 && (
          <>
            – kila {pitch > 0 ? 'fram' : 'bak'} ca <strong>{pitchCm.toFixed(0)} cm</strong>
          </>
        )}
      </p>
      <p>
        <strong>Sida:</strong> {roll.toFixed(1)}°{' '}
        {Math.abs(roll) >= 0.5 && (
          <>
            – kila {roll > 0 ? 'vänster' : 'höger'} sida ca{' '}
            <strong>{rollCm.toFixed(0)} cm</strong>
          </>
        )}
      </p>
      {level && <p className="ok">✅ Bilen står plant – godnatt!</p>}
      <button
        className="btn secondary"
        onClick={() => latest.current && setOffset(latest.current)}
      >
        Nollställ (telefonen ligger plant i bilen)
      </button>
      <p className="tool-note">
        Lägg telefonen plant på golvet eller ett bord i bilen. Kil-förslagen utgår
        från axelavstånd {vehicle.wheelbase} m och spårvidd {vehicle.track} m
        (ändra under Fordon). Riktningen beror på hur telefonen ligger – lita på
        graderna, testa riktningen.
      </p>
    </div>
  )
}

/* ---------- Väder: vind + frost ---------- */

function WeatherTool({
  parked,
  onParkedChange,
  mapCenter,
}: Pick<Props, 'parked' | 'onParkedChange' | 'mapCenter'>) {
  const [forecast, setForecast] = useState<ForecastHour[] | null>(null)
  const [status, setStatus] = useState('')
  const pos = parked ?? { ...mapCenter, time: 0 }

  useEffect(() => {
    let cancelled = false
    setStatus('Hämtar prognos från SMHI …')
    setForecast(null)
    fetchForecast(pos.lat, pos.lon)
      .then((f) => {
        if (cancelled) return
        setForecast(f)
        setStatus('')
      })
      .catch(() => !cancelled && setStatus('Kunde inte hämta prognos (SMHI täcker Norden).'))
    return () => {
      cancelled = true
    }
  }, [pos.lat, pos.lon])

  const gusts = useMemo(() => (forecast ? maxGustPerDay(forecast) : []), [forecast])
  const nights = useMemo(() => (forecast ? minNightTemps(forecast) : []), [forecast])
  const frostNight = nights.find((n) => n.temp <= 0)
  const windyDay = gusts.find((g) => g.gust >= 14)

  function parkHere() {
    if (!navigator.geolocation) {
      setStatus('Din webbläsare stödjer inte platstjänster.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        onParkedChange({
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          time: Date.now(),
        }),
      () => setStatus('Kunde inte hämta din position.'),
    )
  }

  return (
    <div>
      <p className="tool-note">
        {parked
          ? `Prognos för din parkerade position (sparad ${new Date(parked.time).toLocaleDateString('sv-SE')}).`
          : 'Prognos för kartans mittpunkt. Spara var bilen står så minns Frostvakten platsen.'}
      </p>
      <div className="btn-row">
        <button className="btn" onClick={parkHere}>
          📍 Bilen står här
        </button>
        {parked && (
          <button
            className="btn secondary"
            onClick={() => {
              clearParked()
              onParkedChange(null)
            }}
          >
            Glöm position
          </button>
        )}
      </div>
      {status && <p className="tool-note">{status}</p>}
      {forecast && (
        <>
          {frostNight ? (
            <p className="warn">
              ❄️ <strong>Frostvakt:</strong> ner mot {frostNight.temp.toFixed(0)} °C
              natten mot {DAY_FMT.format(new Date(frostNight.date.getTime() + 12 * 3600 * 1000))} –
              töm eller värm vattensystemet!
            </p>
          ) : (
            <p className="ok">❄️ Ingen frost de närmaste nätterna.</p>
          )}
          {windyDay ? (
            <p className="warn">
              💨 <strong>Vindvarning:</strong> byar upp till {windyDay.gust.toFixed(0)} m/s{' '}
              {DAY_FMT.format(windyDay.date)} – tänk på markis och höga broar.
            </p>
          ) : (
            <p className="ok">💨 Lugna vindar de närmaste dagarna.</p>
          )}
          <table className="wx-table">
            <thead>
              <tr>
                <th>Dag</th>
                <th>Byvind</th>
                <th>Natt-temp</th>
              </tr>
            </thead>
            <tbody>
              {gusts.map((g, i) => (
                <tr key={g.date.toISOString()}>
                  <td>{DAY_FMT.format(g.date)}</td>
                  <td className={g.gust >= 14 ? 'warn' : ''}>{g.gust.toFixed(0)} m/s</td>
                  <td className={nights[i] && nights[i].temp <= 0 ? 'warn' : ''}>
                    {nights[i] ? `${nights[i].temp.toFixed(0)} °C` : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tool-note">Källa: SMHI:s öppna prognosdata.</p>
        </>
      )}
    </div>
  )
}

/* ---------- Tankkoll ---------- */

function TankTool({ log, onLogChange }: { log: TankEvent[]; onLogChange: (l: TankEvent[]) => void }) {
  const types: TankType[] = ['vatten', 'gravatten', 'latrin']
  return (
    <div>
      <p className="tool-note">
        Tryck när du tömmer eller fyller, så lär sig appen ert mönster och
        förutspår när det är dags igen.
      </p>
      {types.map((type) => {
        const p = predictTank(log, type)
        return (
          <div key={type} className="tank-row">
            <button className="btn" onClick={() => onLogChange(addTankEvent(log, type))}>
              {TANK_LABELS[type]}
            </button>
            <span className="tank-info">
              {p.count === 0 && 'Inget loggat än'}
              {p.count > 0 && p.avgIntervalDays === undefined && `${p.count} loggade`}
              {p.avgIntervalDays !== undefined &&
                p.daysLeft !== undefined &&
                (p.daysLeft >= 0
                  ? `ca ${p.daysLeft.toFixed(0)} dagar kvar (var ${p.avgIntervalDays.toFixed(1)} dag)`
                  : `⚠️ borde varit dags för ${(-p.daysLeft).toFixed(0)} dagar sen`)}
            </span>
            {p.count > 0 && (
              <button
                className="btn tiny"
                title="Ångra senaste"
                onClick={() => onLogChange(removeLastTankEvent(log, type))}
              >
                ↩︎
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Fordonsprofil ---------- */

function VehicleTool({ vehicle, onChange }: { vehicle: VehicleProfile; onChange: (v: VehicleProfile) => void }) {
  const field = (
    label: string,
    key: keyof VehicleProfile,
    step: number,
    unit: string,
  ) => (
    <label className="veh-field">
      {label}
      <span>
        <input
          type="number"
          step={step}
          min={0}
          value={vehicle[key]}
          onChange={(e) => onChange({ ...vehicle, [key]: Number(e.target.value) })}
        />{' '}
        {unit}
      </span>
    </label>
  )
  return (
    <div>
      <p className="tool-note">
        Uppgifterna används av höjd-/viktvarningen på kartan och vattenpassets
        kil-beräkning. Sparas bara i din webbläsare.
      </p>
      {field('Höjd (inkl. antenn/takbox)', 'height', 0.05, 'm')}
      {field('Totalvikt', 'weight', 0.1, 't')}
      {field('Axelavstånd', 'wheelbase', 0.1, 'm')}
      {field('Spårvidd', 'track', 0.05, 'm')}
    </div>
  )
}

/* ---------- Själva lådan ---------- */

export default function Toolbox(props: Props) {
  const [tab, setTab] = useState<Tab>('vattenpass')
  const [tankLog, setTankLog] = useState<TankEvent[]>(loadTankLog)
  const { open, onClose } = props

  if (!open) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'vattenpass', label: '🧭 Vattenpass' },
    { id: 'vader', label: '❄️💨 Frost & vind' },
    { id: 'tank', label: '🚰 Tankkoll' },
    { id: 'fordon', label: '🚐 Fordon' },
  ]

  return (
    <div className="toolbox" role="dialog" aria-label="Verktygslåda">
      <div className="toolbox-head">
        <div className="toolbox-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="btn tiny" onClick={onClose} aria-label="Stäng">
          ✕
        </button>
      </div>
      <div className="toolbox-body">
        {tab === 'vattenpass' && <LevelTool vehicle={props.vehicle} />}
        {tab === 'vader' && (
          <WeatherTool
            parked={props.parked}
            onParkedChange={(p) => {
              if (p) saveParked(p)
              props.onParkedChange(p)
            }}
            mapCenter={props.mapCenter}
          />
        )}
        {tab === 'tank' && <TankTool log={tankLog} onLogChange={setTankLog} />}
        {tab === 'fordon' && (
          <VehicleTool vehicle={props.vehicle} onChange={props.onVehicleChange} />
        )}
      </div>
    </div>
  )
}
