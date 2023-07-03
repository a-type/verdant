# {{todo}}

Welcome to your lo-fi PWA!

This is a very opinionated starter aimed at getting you working on your idea on day 1, not fussing with tools or doing bootstrapping work like OAuth.

It comes with a bunch of things out of the box. Some stuff you may not want to keep, but it should serve as a guide on what to build in replacement.

# 👀 Your Checklist 👀

Here's what you need to do before your app is ready to use:

- [ ] Create a Google Cloud project for your app and configure the OAuth consent screen
- [ ] Create a Stripe project for your app and create an API key
- [ ] Fill in the missing values in `./apps/api/.env`
- [ ] Edit `./packages/lo-fi/src/schema.ts` and add your first lo-fi schema
- [ ] Run `pnpm generate` to generate the lo-fi client
- [ ] Run `pnpm prisma migrate dev` to set up the database

Finally, run `pnpm dev` to start the API and PWA in parallel.

## How this app is designed to work

The app works offline-first. Users can use it anonymously for free, storing all data on their local device and never touching the server.

The built-in business model is simple: to sync to other devices or collaborate with other people, users must create an account and subscribe to your product in Stripe. Currently, the model is set up so that only one subscription is required per "plan," which can include any number of collaborators.

You can build your features with lo-fi, and they'll work in a limited, on-device way for free users. You can then add upsells to convert your free, anonymous users to paid subscribers. Your server load will only scale as your paid userbase does.

## What's inside

### A lo-fi client monorepo package

All your generated lo-fi client code can be imported from `@{{todo}}/lo-fi`

### A Vite PWA

The PWA can be installed to user devices and will automatically update itself in the background when new code is deployed. A basic component is included to notify users of updates and request that they reload.

You should supply some icons in `/apps/web/public` for your app, and check out `/apps/web/vite.config.ts` for more manifest options.

### A Node server

The server handles user management and lo-fi syncing.

- uses Prisma (`/packages/prisma`) to manage storing user accounts in SQLite
- authenticates users with Google OAuth
- integrates with Stripe to restrict lo-fi sync to only users with a valid subscription

## How to deploy

I recommend deploying the frontend app on Vercel and the backend on Fly.io.

### Frontend + Vercel

Visit [https://vercel.com/new](https://vercel.com/new) to create a new project. Select this repo. Vercel will probably detect the Vite app automatically. You still want to specify some command overrides:

- **Build**: `cd ../.. && pnpm --filter @{{todo}}/web run build`
- **Output**: `dist`
- **Install**: `cd ../.. && pnpm install --frozen-lockfile --filter @{{todo}}/web...`

Set your `VITE_API_HOST` environment variable to the domain you plan to host the server on, and the `VITE_PUBLIC_URL` environment variable to the domain you plan to host the frontend on.

Deploy the app!

### Backend + Fly.io

#### First time setup

Visit [https://fly.io](https://fly.io) and create a new project. Install their CLI.

Open `/apps/api/fly.toml` and review the values. Particularly, set the `HOST` build variable to the domain you plan to host your server on.

You'll need to create a persistent volume for your app's data. By default this should be named `{{todo}}_data` (see `fly.toml`). You can do that with `fly volumes create {{todo}}_data --region lhr --size 10` (adjust `--region` and `--size` to your needs). Volume must be in the same region you plan to deploy the app.

Before deploying you may want to [set your secrets](https://fly.io/docs/reference/secrets/), so the app doesn't crash on first run. All variables from `/apps/api/.env` should be supplied as secrets.

Run `flyctl launch --dockerfile` in the `/apps/api` directory to launch your app.

#### Redeploying from Github

Included is a Github action which will detect changes to the server code or any of the shared packages and redeploy for you. You'll need to set a `FLY_API_TOKEN` secret in Github.
