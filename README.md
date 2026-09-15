# Frecciata 🎯

App web full-stack per la prenotazione dei **turni di allenamento** di una società di tiro con l'arco.
Usabile da mobile e desktop, con pannello di amministrazione per turni e regole di prenotazione.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** (mobile-first)
- **Prisma ORM** su **PostgreSQL**
- **NextAuth.js** (v4, credentials, session JWT) con ruoli `ADMIN` / `ATLETA`
- Target deploy: **Vercel** (piano gratuito, con Vercel Postgres/Neon)

## Regole di business

1. **Un solo turno al giorno solare per atleta** — il giorno solare è calcolato nel fuso del club (`CLUB_TIMEZONE`). È vincolato due volte:
   - validazione esplicita nel servizio (`lib/rules.ts` → `bookSlot`, con messaggio d'errore chiaro);
   - vincolo unico a livello database `Booking(userId, day)` (impedisce anche le race condition).
2. **Capienza massima per turno** — controllata in transazione al momento della prenotazione; un turno pieno non è prenotabile (stato visibile in UI).

Tutti i controlli avvengono **lato server** negli API route; l'UI è solo una vista su di essi.

## Avvio in locale

```bash
# 1. dipendenze
npm install

# 2. Postgres locale (servono Docker) — oppure il tuo Postgres/Neon
docker compose up -d

# 3. variabili d'ambiente
cp .env.example .env        # poi aggiusta DATABASE_URL, AUTH_SECRET, ...

# 4. schema e dati
npx prisma migrate dev      # applica le migrazioni e genera il client
npm run db:seed             # crea l'utente ADMIN (da ADMIN_* in .env)

# 5. via!
npm run dev                 # http://localhost:3000
```

> Un `.env` pronto (es. Prisma Postgres) può essere già presente: `prisma migrate dev` lo usa così com'è.

### Variabili d'ambiente

| Variabile | Dove serve | Note |
|---|---|---|
| `DATABASE_URL` | app + Prisma | `postgres://user:pass@host:5432/db` |
| `AUTH_SECRET` | NextAuth | `openssl rand -base64 32` |
| `CLUB_TIMEZONE` | app | es. `Europe/Rome`; governa giorni solari, ricorrenze e vincoli |
| `NEXT_PUBLIC_CLUB_TIMEZONE` | UI | stesso valore, per formattare gli orari nel fuso del club |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | solo seed | create/modificano l'utente admin |

`CLUB_TIMEZONE` e `NEXT_PUBLIC_CLUB_TIMEZONE` devono coincidere.

## Modello dati

- **User** — nome, email, password (hash bcrypt), ruolo `ADMIN|ATLETA`
- **TrainingSlot** — inizio/fine (UTC), capienza massima, opzionale link alla regola che l'ha generato
- **RecurringRule** — giorni della settimana, orari, data inizio/fine; genera i `TrainingSlot`
- **Booking** — utente + turno + giorno solare; vincoli unici `(userId, slotId)` e `(userId, day)`

### Migrazioni

Le migrazioni vivono in `prisma/migrations/` e vengono applicate:
- in locale con `npx prisma migrate dev` (sviluppo) o `npm run db:deploy`;
- **al build su Vercel** (script `build` = `prisma migrate deploy && next build`).

## Deploy su Vercel

1. **Aggiungi il progetto** su Vercel collegando il repository.
2. **Database**: crea **Vercel Postgres** (free tier) dal dashboard e copia le URL nel progetto:
   - `DATABASE_URL` → l'URL **pooler** (…`-pooler…:5432`), con `?pgbouncer=true&connection_limit=1` se non già presente — il pooling serve in serverless.
3. **Variabili** (tab *Environment*, valori per *Production* e *Preview*):
   - `DATABASE_URL`
   - `AUTH_SECRET` (genera un valore nuovo, non quello locale)
   - `CLUB_TIMEZONE` e `NEXT_PUBLIC_CLUB_TIMEZONE` (es. entrambi `Europe/Rome`)
   - Opzionale: `ADMIN_EMAIL`/`ADMIN_NAME`/`ADMIN_PASSWORD`
4. **Build command** (se Vercel non lo deduce): `prisma migrate deploy && next build`
   — le migrazioni si applicano automaticamente a ogni deploy.
5. **Deploy** → al primo deploy senza admin, esegui il seed:
   ```bash
   npx prisma db execute  # oppure dal CLI con l'URL di produzione:
   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx prisma/seed.ts
   ```
   (l'alternativa più semplice: registrati come atleta e promuovi manualmente, oppure esegui `npm run db:seed` puntando `DATABASE_URL` a Vercel Postgres).
6. Poni l'URL di Vercel nel tuo DNS; le sessioni NextAuth funzionano senza configurazione aggiuntiva.

> Il file `.env` non viene mai committato (è in `.gitignore`); su Vercel le variabili vivono nel dashboard.

## Struttura

```
app/
  calendario/        area atleta: vista settimana/giorno, prenotazione con un click
  prenotazioni/      i propri turni futuri + annullamento
  admin/             pannello: CRUD turni, regole ricorrenti, atleti per turno
  login/ registrazione/
  api/
    auth/[...nextauth]  sessione (JWT) con ruolo
    register            creazione account ATLETA
    slots, rules        CRUD admin (+ elenco con atleti)
    bookings            prenota/annulla (vincoli applicati qui, lato server)
    me/bookings         propri turni futuri
lib/
  rules.ts           vincoli di business (un-turno-al-giorno, capienza)
  tz.ts              fuso del club: conversioni UTC <-> locale, aritmetica giorni
  auth.ts            opzioni NextAuth (credentials + Prisma + bcrypt)
middleware.ts        protegge /admin (solo ADMIN) e le pagine atleta
prisma/
  schema.prisma      User, TrainingSlot, RecurringRule, Booking
  seed.ts            crea l'utente admin
components/          UI (calendario, card turni, pannello admin, toast, nav)
```

## Note

- **Cosa succede quando l'admin modifica/elimina un turno già prenotato**:
  - *cambia orario entro lo stesso giorno* → le prenotazioni restano;
  - *cambia giorno* → le prenotazioni si trasferiscono, salvo conflitti (errore chiaro se qualcuno avrebbe due turni nel nuovo giorno);
  - *capienza* → aggiornata, prenotazioni intatte;
  - *eliminazione* → le prenotazioni collegate vengono rimosse (conferma in UI con conteggio).
- **Regole ricorrenti**: modificando giorni/orari/dati si **rigenerano** i turni (le prenotazioni esistenti su di essi vengono rimosse); cambiando solo la capienza, i turni e le prenotazioni restano.
- Nessun servizio a pagamento: Postgres (locale, Prisma Postgres o Vercel Postgres free), NextAuth con provider credentials, nessuna dipendenza esterna a pagamento.
