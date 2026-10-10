# Cloudflare Pages migration

The application is a static Vite site. Supabase runs authentication, database access policies, profile provisioning, and note quotas. No Pages Functions or Express server is required.

## Deployment settings

| Setting | Value |
| --- | --- |
| Framework | React (Vite) |
| Root directory | Repository root; remove the old frontend root |
| Build command | npm run build |
| Output directory | dist |
| Node version | 24.21.0, recorded in .node-version |
| Supabase connection | config/supabase-config.ts: public URL and publishable key |

The frontend and Vite build import the same checked-in public connection from config/supabase-config.ts. No Supabase environment variables or environment files are required. The URL and publishable key are intended to be public; privileged credentials must never be placed in this module. Validation rejects missing values, privileged keys, and remote HTTP project URLs. A configuration change requires a rebuild.

Build-generated dist/_headers contains a CSP restricted to the configured Supabase origin, framing restrictions, a referrer policy, and nosniff. public/_headers is a template; deploy the generated dist directory, not public. The service worker excludes API calls, authorized requests, cross-origin responses, and non-static paths.

Choose the production Git branch deliberately. The migration branch is cloudflare-migration; a Git-integrated Pages build cannot receive these local changes until they are committed and pushed separately.

## Database preparation

The three July migration files are restored without changing their applied contents. The newest pages_direct_access_hardening migration captures the profile triggers and defaults previously applied manually, least-privilege table/column grants, public-feed reads, input constraints, and server-enforced limits:

- 1,000 private notes per account. Deleting a private note frees capacity.
- 10 Global Notes posts in a rolling 10-minute window.
- 100 Global Notes posts in a rolling 24-hour window.

A private ledger keeps publication counts even after a post is deleted. Database row locking serializes insertions for each account. Protected owner IDs and creation times cannot be supplied or updated through the public API. Existing notes are preserved, including rows predating the new constraints.

For the existing Supabase project, apply only the new hardening migration through the usual migration workflow. Do not replay the historical migrations or bootstrap.sql against production. Run the security advisor afterward and confirm anonymous private reads fail, public text reads work, and the privileged table/function grants are gone.

For a NEW Supabase project, first run supabase/bootstrap.sql in its SQL Editor, then apply the migration files in filename order. The old July files assumed manually-created April tables, so they require that one-time bootstrap. This sequence is exercised by npm run test:db. Keep app_private outside the Data API's exposed schemas.

## Supabase Auth settings before launch

- Keep email confirmation enabled.
- Set the server-side minimum password length to at least 12; the signup form uses 12 but browser validation does not replace the Auth setting.
- Set Site URL to https://jot-notes.app and allow the exact production redirect origins actually used by the site.
- Add only the project's intended pages.dev preview destinations if preview signup is needed. Avoid a wildcard allowing all pages.dev sites.
- Review email delivery and signup rate limits before opening public registration.
- Leaked-password protection requires Supabase Pro or above. The current Free plan cannot enable it; no plan upgrade is part of this preparation.

Supabase Auth redirect/password settings and Cloudflare project settings are external account configuration, not changes automatically applied by a frontend build.

## Verification and cutover

Run npm ci, npm run check, and npm audit. Frontend tests exercise account changes, stale session restoration, delayed saves, quota feedback, and cache boundaries. Database tests run the actual SQL in isolated PostgreSQL and exercise anonymous access, two-account ownership, protected columns, bulk insert rollback, quota recovery, and grant restrictions.

Before DNS cutover, verify the Pages preview over HTTPS: guest persistence, signup/confirmation, private create/read/delete, public feed reads, and the served security headers. Use a separate Supabase project for previews when feasible by changing the shared public configuration on the preview branch. Previews otherwise use the same project as production, so signed-in users can act on their production data.

Retain a recovery path until the preview checks pass. Add the custom domain in Pages, switch its DNS through Cloudflare, and verify HTTPS and an already-installed app's service-worker upgrade. Retire the old Express API and its database credentials after successful cutover. These deployment actions require separate publication; they are not performed by the local checks.

Sources: [Cloudflare build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/), [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), [Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls), [password security](https://supabase.com/docs/guides/auth/password-security).
