# Free cloud so the laptop can be OFF

You need a free **website + database**, not only a database.
Phone and district both talk to that website.

Recommended (easiest): **Render.com free**

## Do this once

1. Create a GitHub account if you do not have one.
2. Upload the `annasetu` folder to a new GitHub repo (or zip upload if they allow).
3. Go to https://render.com → Sign up with GitHub.
4. New → **Web Service** → pick the repo.
5. Settings:
   - Runtime: Node
   - Build command: `echo ok`
   - Start command: `node server.js`
   - Instance: **Free**
6. Create Web Service.
7. Wait until you get a URL like:
   `https://annasetu-xxxx.onrender.com`

## Use that URL everywhere

- Laptop Chrome: open that https URL (district)
- Android Chrome: same https URL → Add to Home screen (farmer app)
- You can shut the laptop. Phone still works as long as Render is up.

Free Render **sleeps after ~15 minutes** of no traffic. First open after sleep takes 30–60 seconds. Then it is normal.

## Other free options (same idea)

| Service | What you get | Hard for 1st year? |
|---|---|---|
| Render free | Whole API + SQLite file | Easiest |
| Railway trial | Same | Easy, card sometimes |
| Fly.io | Same | Medium |
| Supabase | Postgres DB only | You still need to host server.js |

Do **not** use only Supabase unless someone rewrites the API. AnnaSetu already has the API (`server.js`). Host that.

## After you have the URL

Reply with the `https://....onrender.com` link.
We will lock it into the app as the default server so you never type it again.
