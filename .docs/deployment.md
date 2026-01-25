# Cloudflare Pages Deployment Guide

Follow these steps to deploy the BCL Portal to Cloudflare Pages.

## 1. Connect Repository
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** > **Create Application** > **Pages** > **Connect to Git**.
3. Select your GitHub repository (`bcl-portal`).

## 2. Configure Build Settings
Cloudflare will detect Next.js. **However**, for full SSR support (Supabase), use these settings:

- **Framework Preset**: `Next.js`
- **Build Command**: `npm run pages:build`
  - *This uses `@cloudflare/next-on-pages` which we installed.*
- **Build Output Directory**: `.cloudflare_build`
  - *Optimized for Cloudflare Pages.*
- **Root Directory**: `portal`
  - *Since your Next.js app is inside the `/portal` folder, you MUST set this.*

### 3. Wrangler Configuration (`wrangler.toml`)
We explicitly set the build output directory to `.cloudflare_build`.

```toml
# wrangler.toml
pages_build_output_dir = ".cloudflare_build"
```

## 4. Environment Variables (Critical)
You must add these variables in the **Environment Variables** section during setup (or in Settings > Environment Variables after creation).

| Variable Name | Value (Copy from your `.env.local`) |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://meklaisrcpecuwwwakhv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXT_PUBLIC_KAKAO_CLIENT_ID` | (Your Kakao JS Key) |
| `KAKAO_CLIENT_SECRET` | (Your Kakao Secret, if used on server) |
| `NODE_VERSION` | `20` (Recommended) |

## 5. Deploy
1. Click **Save and Deploy**.
2. Cloudflare will clone, install dependencies, and run `npm run pages:build`.
3. Once finished, you will get a `*.pages.dev` URL.

## Troubleshooting
- **"Error: No Output Directory found"**: Ensure you set Output Directory to `.cloudflare_build`.
- **"Error: missing dependency"**: We installed `@cloudflare/next-on-pages`. Ensure `package.json` is committed.
