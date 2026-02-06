This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

-  [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-  [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CI/CD — Deploy to cPanel with GitHub Actions

This repository includes a GitHub Actions workflow that builds the app and deploys to a cPanel-hosted site using FTP. The workflow runs on pushes to the `main` branch and can also be triggered manually.

Files added:

-  `.github/workflows/deploy-to-cpanel.yml` — builds the project and deploys the generated output.

How it works:

-  The workflow installs dependencies with `pnpm` and runs `pnpm build`.
-  If your project is exportable statically (supports `next export`) set the repository environment variable `NEXT_EXPORT=true` in your GitHub Actions environment or during a manual run; it will run `next export` and upload the `out` directory.
-  If `out` isn't present the workflow prepares a `dist` folder containing `.next`, `public`, `package.json`, and `server.js` (if present) and deploys that — suitable for cPanel Node deployments.

Configuring secrets

Add the following secrets in the GitHub repository settings -> Secrets -> Actions for automatic FTP deploys:

-  `CPANEL_FTP_HOST` — your cPanel FTP hostname (e.g. ftp.example.com)
-  `CPANEL_FTP_USERNAME` — FTP username
-  `CPANEL_FTP_PASSWORD` — FTP password
-  `CPANEL_FTP_PATH` — remote path where files should be uploaded (for example `/public_html` or `/public_html/your-subfolder`). Leave empty to use FTP user's home.

Notes and tips

-  If your Next.js app requires a Node server (custom `server.js`), the workflow includes `server.js` and `package.json` in `dist` so you can run `npm install` via the cPanel Node UI. Many shared cPanel hosts don't run persistent Node servers; if your host doesn't support Node processes, prefer static export.
-  Test locally: run `pnpm build` and, if desired, `pnpm exec next export -o out` to confirm static output.
-  The workflow uses `SamKirkland/FTP-Deploy-Action` for FTP uploads. If you prefer a different tool (for example `lftp`), I can update the workflow.

If you want, I can also:

-  Add inputs to the `workflow_dispatch` trigger (for example to toggle `NEXT_EXPORT` at manual runs).
-  Adjust the workflow to only deploy on tags or on merges to main.

cPanel-specific notes

From the screenshot you provided it looks like your cPanel supports Node applications (Application root, Application startup file, Node.js version). For a Node app on cPanel:

-  Set the Application root to the folder where the app should live (for example `nihemart_v2` or `public_html` if you want it at the webroot).
-  Set the Application startup file to `server.js` (this repo already contains `server.js`).
-  Choose Node.js version 18/20 as appropriate (the workflow uses Node 20 to build).

Post-deploy commands on cPanel

-  If you deploy via FTP the workflow uploads files only. After the deploy use the cPanel Node.js App UI to run `NPM Install` (or click "Run NPM Install" in your cPanel app) and restart the application. This ensures native modules (for example `sharp`) are built on the host.

Security reminders

-  Do not commit secrets into the repository. Use GitHub repository Secrets.
-  For FTP prefer creating an FTP-only user with access only to the destination folder.

If you'd like, I can:

-  Switch the workflow to deploy only on tags or on merged pull requests.
-  Add inputs to the `workflow_dispatch` trigger (for example to toggle `NEXT_EXPORT` at manual runs).
