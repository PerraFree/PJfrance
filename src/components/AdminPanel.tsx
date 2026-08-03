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
              <p>{submissions === 'ok' ? 'Finns – "Lägg till en plats" kan skicka förslag.' : 'Saknas – kör SQL-texten i docs/SUPABASE.md (avsnitt 2).'}</p>
            </div>
          </li>
          <li>
            <Icon state={reports} />
            <div>
              <strong>Tabell: felrapporter</strong>
              <p>{reports === 'ok' ? 'Finns – "Rapportera fel" fungerar.' : 'Saknas – kör SQL-texten i docs/SUPABASE.md (avsnitt 2).'}</p>
            </div>
          </li>
          <li>
            <Icon state={verifications} />
            <div>
              <strong>Tabell: bekräftelser (✓ Stämmer fortfarande)</strong>
              <p>{verifications === 'ok' ? 'Finns – bekräftelser delas mellan alla användare.' : 'Saknas – kör SQL-texten (avsnitt 4b).'}</p>
            </div>
          </li>
          <li>
            <Icon state={reviews} />
            <div>
              <strong>Tabell: betyg &amp; kommentarer</strong>
              <p>{reviews === 'ok' ? 'Finns – betyg och kommentarer fungerar.' : 'Saknas – kör SQL-texten (avsnitt 4c).'}</p>
            </div>
          </li>
        </ul>
        {sqlNeeded && (
          <p className="adm-fix">
            <strong>Så fixar du de röda:</strong> supabase.com → ditt projekt →{' '}
            <em>SQL Editor</em> → <em>New query</em> → klistra in SQL-texten från{' '}
            <a href={`${REPO}/blob/claude/gravatten-latrin-app-sverige-aed0qg/docs/SUPABASE.md`} target="_blank" rel="noopener noreferrer">
              docs/SUPABASE.md
            </a>{' '}
            → tryck <em>Run</em>. Ladda sedan om den här sidan.
          </p>
        )}
      </section>

      <section className="admin-card">
        <h2>Mejlgranskning</h2>
        <p>
          Två saker som inte går att kontrollera härifrån (de är hemliga/personliga) –
          bocka av manuellt:
        </p>
        <ul className="adm-list">
          <li>
            <span className="adm-ic manual">?</span>
            <div>
              <strong>Huvudnyckeln som GitHub-secret</strong>
              <p>
                Supabase → Project Settings → API → kopiera <code>service_role</code>. Lägg den{' '}
                <a href={`${REPO}/settings/secrets/actions`} target="_blank" rel="noopener noreferrer">
                  här som secret
                </a>{' '}
                med namnet <code>SUPABASE_SERVICE_KEY</code>.{' '}
                <a href={`${REPO}/actions/workflows/bevaka-platsforslag.yml`} target="_blank" rel="noopener noreferrer">
                  Testa genom att köra "Bevaka platsförslag"
                </a>{' '}
                (knappen <em>Run workflow</em>) – blir den grön är nyckeln rätt.
              </p>
            </div>
          </li>
          <li>
            <span className="adm-ic manual">?</span>
            <div>
              <strong>Din mejladress i GitHub</strong>
              <p>
                Kolla att rätt adress står under{' '}
                <a href="https://github.com/settings/notifications" target="_blank" rel="noopener noreferrer">
                  GitHub → Settings → Notifications
                </a>{' '}
                – dit skickas granskningsmejlen.
              </p>
            </div>
          </li>
        </ul>
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
