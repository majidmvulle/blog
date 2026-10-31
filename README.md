# Homelab Journal

Blog about my homelab, built with [Astro](https://astro.build) (blog starter). The homelab config itself lives at [github.com/majidmvulle/homelab](https://github.com/majidmvulle/homelab).

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # production build into ./dist
npm run preview  # serve the built site locally
```

## Writing a post

Add a Markdown (`.md`) or MDX (`.mdx`) file to `src/content/blog/`. The filename becomes the URL slug (`/blog/<filename>/`).

```markdown
---
title: 'Post title'
description: 'One-line summary used in listings, RSS and meta tags.'
pubDate: '2026-11-15'
updatedDate: '2026-11-20'   # optional
heroImage: '../../assets/my-image.jpg'   # optional, relative to the post
---

Post body here.
```

The schema lives in `src/content.config.ts`. Site title and description are in `src/consts.ts`.

## Posts from Strapi

When `STRAPI_URL` is set, posts come from the shared Strapi instance (project `majid`, content type `majid-post`) instead of `src/content/blog/`. Only published posts are loaded. The loader is in `src/loaders/strapi.ts`.

| Variable | Required | Notes |
|---|---|---|
| `STRAPI_URL` | yes | Public API base, e.g. `https://strapi.example.com` |
| `STRAPI_TOKEN` | yes | Read-only Custom API token for `majid` (`find`/`findOne` on posts and tags) |
| `CF_ACCESS_CLIENT_ID` | no | Cloudflare Access service token ID, if the API is behind Access |
| `CF_ACCESS_CLIENT_SECRET` | no | Cloudflare Access service token secret |

Strapi fields map to the frontmatter: `slug` becomes the URL, `publishDate` (or `publishedAt` if empty) becomes `pubDate`, `updatedDate` stays `updatedDate`, `cover` becomes `heroImage`, and the Markdown `body` is rendered by Astro.
Remote `https` covers are downloaded and optimized at build time.

Locally, put the variables in a `.env` file (ignored by git) and run `npm run build` or `npm run dev`.
Unset `STRAPI_URL` to go back to the Markdown files.

In Cloudflare Pages, set them under **Settings → Variables and Secrets** for Production (and Preview, if you want previews from Strapi), with the token and Access secret as encrypted secrets.
Then create a **Deploy hook** under **Settings → Builds** and store its URL in the `deploy-hook-majid` key of `strapi-secrets`. Strapi calls it after you publish, unpublish or delete a post.

## Deploying to Cloudflare Pages

1. Push this repo to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repo.
   Name the project `majidmvulle-blog`, which gives `https://majidmvulle-blog.pages.dev` (the `site` value in `astro.config.mjs`).
3. Build settings: framework preset **Astro**, build command `npm run build`, output directory `dist`.
   The Node version comes from `.node-version`.
4. Update `site` in `astro.config.mjs` to the final URL (the `*.pages.dev` address or a custom domain), so the sitemap and RSS links are correct.

Every push to the main branch deploys, and PRs get preview URLs.

## Alternative: GitHub Pages

Use the official [`withastro/action`](https://github.com/withastro/action) workflow and set Pages to deploy from GitHub Actions. If the site is served from a project repo (`https://<user>.github.io/<repo>/`), set `base: '/<repo>'` in `astro.config.mjs`, and the template's hard-coded links (`/blog`, `/about`) will need the base prefix. Serving from a `<user>.github.io` repo or a custom domain avoids that.
