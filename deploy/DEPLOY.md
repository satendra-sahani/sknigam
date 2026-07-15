# Deploying Pollistics to the Hostinger VPS

A run-it-yourself runbook. Everything here you execute **on your machine / the
server with your own credentials** — no secrets belong in the repo.

> **Before anything:** you pasted the VPS password + Hostinger API key in a chat.
> Rotate both after the first successful login (Hostinger panel → change VPS
> root password; regenerate the API token). The `deployment` file holding them
> is gitignored, so it's not in git history — keep it that way.

The stack: **MongoDB** + **API** (Express/ts-node, port 9003) + **Web**
(Next.js, port 3004), fronted by **nginx** + TLS. PM2 keeps the two Node procs
alive. Domain `pollistics.com` (banner said "pollstics.com" — confirm spelling)
DNS **A record → 187.127.166.72**.

---

## 0. One-time: provision the VPS (skip any step already done)

SSH in from your own terminal (this is you, with your own password):

```bash
ssh root@187.127.166.72
```

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx

# PM2 process manager
npm i -g pm2

# MongoDB — either install locally (below) OR use MongoDB Atlas (recommended;
# then skip this and just set MONGODB_URI to the Atlas string).
apt-get install -y gnupg curl
# ...follow mongodb.com/docs for the current 7.x apt steps for your Ubuntu ver
systemctl enable --now mongod
```

## 1. Get the code onto the server

```bash
cd /var/www            # or wherever you keep apps
git clone <your-git-remote-url> pollistics
cd pollistics
npm install            # installs all workspaces (api, web, shared)
```

> No git remote yet? Alternatively `rsync -avz --exclude node_modules ./
> root@187.127.166.72:/var/www/pollistics/` from your local repo.

## 2. Configure secrets

```bash
cp deploy/api.env.example deploy/api.env
cp deploy/web.env.example deploy/web.env
nano deploy/api.env    # fill MONGODB_URI, JWT_SECRET, Razorpay, ImageKit…
nano deploy/web.env    # set NEXT_PUBLIC_API_URL to https://YOURDOMAIN/api
```

Generate a JWT secret: `openssl rand -hex 48`.

## 3. Build

```bash
# Web build INLINES NEXT_PUBLIC_* — load web.env first, then build.
set -a && . deploy/web.env && set +a
npm run build:web

# API compiles too (optional; `npm start` runs via ts-node either way)
npm run build:api
```

## 4. Start under PM2

```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints, so PM2 restarts on reboot
pm2 status         # both pollistics-api and pollistics-web should be "online"
pm2 logs           # tail for errors (Mongo connection, missing env, etc.)
```

## 5. nginx + TLS

```bash
sudo cp deploy/nginx-pollistics.conf /etc/nginx/sites-available/pollistics
# edit the file: replace pollistics.com with your real domain
sudo ln -s /etc/nginx/sites-available/pollistics /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# HTTPS (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pollistics.com -d www.pollistics.com
```

## 6. Seed & verify

```bash
# optional: seed reference data / an initial admin
npm run seed

# smoke test from the server
curl -s localhost:9003/api/health   # or any known API route
curl -sI localhost:3004             # Next.js responds
```

Then open `https://pollistics.com` in a browser. Marketing pages (`/`, `/about`,
`/services`, `/publish`, `/bookstore`, `/download`, `/contact`) are public; the
app (`/login`, `/dashboard`, …) needs a seeded user.

---

## Updating after a code change

```bash
cd /var/www/pollistics
git pull                       # or rsync again
npm install
set -a && . deploy/web.env && set +a && npm run build:web
pm2 reload deploy/ecosystem.config.js
```

## Gotchas
- **noindex stays on:** every page already ships `noindex, nofollow`. Remove
  `robots` from `packages/web/src/app/layout.tsx` only when you want Google in.
- **NEXT_PUBLIC_* are build-time.** Change the API URL → rebuild web.
- **Razorpay / ImageKit** are required for bookstore checkout and cover uploads;
  the pages render without them but those actions will error.
- **Ollama vision** is heavy. Skip it unless you use the voter-roll OCR import;
  the rest of the API runs fine without a model loaded.
- **Firewall:** open 80/443 only. Keep 9003/3004 bound to localhost (they are,
  via 127.0.0.1 in the nginx upstreams) so they're not exposed directly.
