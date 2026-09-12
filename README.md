# A Few Quotes

A minimal quote-of-the-day site. Shows an inspirational quote in a glass-card
design, with an admin panel for manual edits and a daily cron job that pulls
a fresh quote automatically.

Live at: afewquotes.vercel.app

## How it works

- **`index.html`** — the public page. Loads the current quote from
  `/api/quote` on page load.
- **`style.css`** — all styling for the public page.
- **`admin.html`** — password-protected panel to manually set the quote.
- **`api/quote.js`** — API route backing both pages:
  - `GET` — returns the current quote and its persistent flag
  - `POST` — logs in with `ADMIN_PASSWORD`, sets an auth cookie
  - `PUT` — saves a new quote (requires the auth cookie)
- **`api/refresh-quote.js`** — cron-triggered route that fetches a new quote
  from [ZenQuotes](https://zenquotes.io) and saves it, unless the current
  quote is marked persistent.
- **`vercel.json`** — schedules `api/refresh-quote.js` to run daily at
  midnight UTC via Vercel Cron.

Quotes are stored as a single JSON blob (`quote.json`) using
[Vercel Blob](https://vercel.com/docs/storage/vercel-blob), with shape:

```json
{
  "quote": "The only way to do great work is to love what you do. — Steve Jobs",
  "persistent": false
}
```

## Persistent vs. non-persistent quotes

In `admin.html`, there's a checkbox next to the quote textarea:

- **Unchecked (default):** the quote will auto-change every night at
  midnight UTC, pulled fresh from the quote API.
- **Checked:** the quote stays exactly as you set it — the nightly cron
  job checks this flag and skips overwriting it.

Uncheck it again and save to resume daily auto-rotation.

## Setup

### Environment variables

Set these in Vercel → Project Settings → Environment Variables:

| Variable         | Purpose                                              |
|------------------|-------------------------------------------------------|
| `ADMIN_PASSWORD` | Password to log into `/admin.html`                    |
| `CRON_SECRET`    | Secret Vercel Cron sends to authorize `/api/refresh-quote` |

Vercel Blob access is handled automatically once the Blob store is linked
to the project (no manual token needed if using `@vercel/blob` on Vercel's
own infrastructure).

### Deploy

Push to your connected Git repo, or run `vercel deploy` — Vercel will pick
up `vercel.json` and register the cron job automatically. You can check it
under Project Settings → Cron Jobs after deploying.

### Manually trigger the daily refresh (for testing)

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://afewquotes.vercel.app/api/refresh-quote
```

## Manually changing the quote

1. Go to `afewquotes.vercel.app/admin.html`
2. Enter `ADMIN_PASSWORD`
3. Edit the quote text
4. Check or uncheck **persistent** depending on whether you want it to
   survive the midnight refresh
5. Click **Save Quote**

## Notes

- Vercel's free (Hobby) plan limits cron jobs to once per day, which is
  exactly what this project uses.
- If the ZenQuotes API is unreachable during a cron run, `refresh-quote.js`
  returns an error but leaves the existing quote in place — nothing breaks
  on the public page.

## Credits

Made by Rui Song
