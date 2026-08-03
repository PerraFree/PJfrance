import { useEffect, useState } from 'react'
import { SUPABASE_ANON_KEY, SUPABASE_URL, communityEnabled } from '../config'

/**
 * Enkel adminsida: öppnas med ?admin=1 och kollar själv vilka
 * installationssteg som är klara. Visar inget hemligt – alla kontroller görs
 * med den publika besöksnyckeln, så sidan behöver ingen inloggning.
 */

const REPO = 'https://github.com/PerraFree/PJfrance'

type CheckState = 'checking' | 'ok' | 'missing' | 'na'

function useTableCheck(table: string): CheckState {
  const [state, setState] = useState<CheckState>(communityEnabled ? 'checking' : 'na')
  useEffect(() => {
    if (!communityEnabled) return
    let cancelled = false
    fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    })
      .then((res) => {
        if (!cancelled) setState(res.status === 404 ? 'missing' : 'ok')
      })
      .catch(() => {
        if (!cancelled) setState('missing')
      })
    return () => {
      cancelled = true
    }
  }, [table])
  return state
}

function Icon({ state }: { state: CheckState }) {
  if (state === 'checking') return <span className="adm-ic wait">…</span>
  if (state === 'ok') return <span className="adm-ic ok">✓</span>
  if (state === 'na') return <span className="adm-ic fail">✗</span>
  return <span className="adm-ic fail">✗</span>
}

export default function AdminPanel() {
  const submissions = useTableCheck('submissions')
  const reports = useTableCheck('reports')
  const verifications = useTableCheck('verifications')
  const reviews = useTableCheck('reviews')

  const sqlNeeded = verifications === 'missing' || reviews === 'missing'

  return (
    <div className="admin">
      <header className="admin-head">
        <h1>Tömningskartan – adminstatus</h1>
        <p>
          Den här sidan kollar själv vad som är klart. Spara adressen som
          bokmärke: <code>…/PJfrance/?admin=1</code>
        </p>
      </header>

      <section className="admin-card">
        <h2>Installation</h2>
        <ul className="adm-list">
          <li>
            <Icon state={communityEnabled ? 'ok' : 'na'} />
            <div>
              <strong>Supabase-koppling</strong>
              <p>
                {communityEnabled
                  ? 'Adress och besöksnyckel finns i bygget – appen kan prata med databasen.'
                  : 'Saknas: lägg SUPABASE_URL och SUPABASE_ANON_KEY som repo-variabler i GitHub och kör deployen igen.'}
              </p>
            </div>
          </li>
          <li>
            <Icon state={submissions} />
            <div>
              <strong>Tabell: platsförslag</strong>
              <p>{submissions === 'ok' ? 'Finns – "Lägg till en plats" kan skicka förslag.' : 'Saknas – gör engångsfixen i rutan nedan.'}</p>
            </div>
          </li>
          <li>
            <Icon state={reports} />
            <div>
              <strong>Tabell: felrapporter</strong>
              <p>{reports === 'ok' ? 'Finns – "Rapportera fel" fungerar.' : 'Saknas – gör engångsfixen i rutan nedan.'}</p>
            </div>
          </li>
          <li>
            <Icon state={verifications} />
            <div>
              <strong>Tabell: bekräftelser (✓ Stämmer fortfarande)</strong>
              <p>{verifications === 'ok' ? 'Finns – bekräftelser delas mellan alla användare.' : 'Saknas – gör engångsfixen i rutan nedan.'}</p>
            </div>
          </li>
          <li>
            <Icon state={reviews} />
            <div>
              <strong>Tabell: betyg &amp; kommentarer</strong>
              <p>{reviews === 'ok' ? 'Finns – betyg och kommentarer fungerar.' : 'Saknas – gör engångsfixen i rutan nedan.'}</p>
            </div>
          </li>
        </ul>
        {sqlNeeded && (
          <p className="adm-fix">
            <strong>Röda rader?</strong> Gör de tre stegen i rutan nedan – då skapas
            tabellerna automatiskt och raderna blir gröna. Du behöver aldrig skriva SQL.
          </p>
        )}
      </section>

      <section className="admin-card">
        <h2>Engångsfix: koppla ihop GitHub och Supabase</h2>
        <p>
          Ett enda "lösenord" (en nyckel) behövs för att GitHub ska kunna sköta databasen åt
          dig. Tre steg, ca 3 minuter:
        </p>
        <ol className="adm-steps">
          <li>
            <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer">
              Öppna denna sida hos Supabase
            </a>{' '}
            → klicka <em>Generate new token</em> → döp den till <code>tomningskartan</code> →
            kopiera den långa texten som visas.
          </li>
          <li>
            <a href={`${REPO}/settings/secrets/actions/new`} target="_blank" rel="noopener noreferrer">
              Öppna denna sida hos GitHub
            </a>{' '}
            → i fältet <em>Name</em> skriv <code>SUPABASE_ACCESS_TOKEN</code> → i fältet{' '}
            <em>Secret</em> klistra in texten → klicka <em>Add secret</em>.
          </li>
          <li>
            <a href={`${REPO}/actions/workflows/installera-databasen.yml`} target="_blank" rel="noopener noreferrer">
              Öppna denna sida
            </a>{' '}
            → klicka <em>Run workflow</em> (grön knapp, två gånger) → vänta en minut → ladda
            om den här sidan. Alla rader ska nu vara gröna.
          </li>
        </ol>
        <p>
          Kolla också att din mejladress stämmer under{' '}
          <a href="https://github.com/settings/notifications" target="_blank" rel="noopener noreferrer">
            GitHub → Settings → Notifications
          </a>{' '}
          – dit skickas granskningsmejlen.
        </p>
      </section>

      <section className="admin-card">
        <h2>Din vardagsrutin</h2>
        <ol className="adm-steps">
          <li>Du får ett mejl från GitHub när någon föreslagit en plats eller skrivit en kommentar.</li>
          <li>Öppna länken i mejlet – all info och kartlänkar finns i ärendet.</li>
          <li>
            Skriv en kommentar: <code>godkänn</code> för att publicera för alla, eller{' '}
            <code>neka</code>. Klart – ärendet stängs automatiskt.
          </li>
        </ol>
        <p className="adm-links">
          <a href={`${REPO}/issues?q=is%3Aopen+label%3Aplatsf%C3%B6rslag`} target="_blank" rel="noopener noreferrer">
            Väntande platsförslag
          </a>
          {' · '}
          <a href={`${REPO}/issues?q=is%3Aopen+label%3Aomd%C3%B6me`} target="_blank" rel="noopener noreferrer">
            Väntande kommentarer
          </a>
          {' · '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
            Supabase (databasen)
          </a>
        </p>
      </section>

      <p className="adm-back">
        <a href="./">← Tillbaka till kartan</a>
      </p>
    </div>
  )
}
