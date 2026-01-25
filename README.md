This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.



## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/nextjs) - your feedback and contributions are welcome!

## Deploy on Cloudflare Pages

This project is configured to deploy on **Cloudflare Pages** using the `@cloudflare/next-on-pages` adapter.

1. **Push to GitHub**: Make sure your repository is connected to Cloudflare Pages.
2. **Build Settings**:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run pages:build`
   - **Build Output Directory**: `.cloudflare_build` (Custom configured)
   - **Root Directory**: `portal`
3. **Environment Variables**:
   - Ensure you add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Cloudflare settings.

For detailed deployment instructions, please refer to [`docs/deployment.md`](docs/deployment.md).
