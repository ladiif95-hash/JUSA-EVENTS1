# JUSA Events: PostgreSQL + Deploy

## 1. Computer-kaaga (PostgreSQL local)
1. Fur `backend/.env`, kadib `DATABASE_URL`-ka ku beddel `PASSWORD_KAAGA` password-ka aad dejisay markii aad PostgreSQL 18 rakibtay:
   `DATABASE_URL=postgresql://postgres:PASSWORD_KAAGA@localhost:5432/jusa_events`
2. Samee account-yada (database-ka `jusa_events` iyo table-yadu si toos ah ayay u samaysmaan):

```bash
npm run seed
```

3. Kici system-ka (`npm run dev:backend` iyo `npm run dev:frontend`), kadib gal `http://localhost:5173/login`.

Account-yada tijaabada (local oo keliya):

| Doorka | Email | Password |
|---|---|---|
| Super Admin | `admin1@jusa.test` | `JusaAdmin2026!` |
| Admin | `admin2@jusa.test` | `JusaAdmin2026!` |
| Arday | `student1@jusa.test` | `JusaStudent2026!` |

Xogta waxaad ku arki kartaa pgAdmin: **Servers → PostgreSQL 18 → Databases → jusa_events → Schemas → public → Tables**.

## 2. Website live ah (Vercel + PostgreSQL online)
1. Samee PostgreSQL online (bilaash), tusaale **Neon** (https://neon.tech). Koobiyee connection string-ka.
2. Ku samee Super Admin-ka database-ka online-ka ah (computer-kaaga ka run garee):
   - `DATABASE_URL`, `SEED_ADMIN_EMAIL` iyo `SEED_ADMIN_PASSWORD` (12+ xaraf) ku dheji `backend/.env`
   - `npm run seed`
3. Deploy:

```bash
npx vercel login
npx vercel --prod
```

4. Vercel → Project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `DATABASE_URL` | connection string-ka Neon |
| `JWT_SECRET` | isla qiimaha ku jira `backend/.env` |
| `APP_URL` | URL-ka Vercel, tusaale `https://jusa-events.vercel.app` |
| `NODE_ENV` | `production` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | (ikhtiyaari) `https://<url>/api/auth/google/callback` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_EMAIL` | (ikhtiyaari) email |

Env variables ka dib mar kale: `npx vercel --prod`.
