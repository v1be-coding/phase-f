# phase-f

Phase F's throwaway episode, made from `episode-template` to prove the Foundation. It is removed once its checks pass.

## Sites

- **Production:** https://phase-f.emilianocasijr.com (phase F teardown check)
- **Branch environments:** each ready PR gets its own address, printed as `Branch environment: <url>` in its `branch / deploy` job log.

## Database

Aurora DSQL through `@aws/aurora-dsql-drizzle` (ADR-0003). Change `src/db/schema.ts`, run `npm run db:generate`, then review and commit what lands in `drizzle/`.

- **Migrations only add things.** A revert can't undo one, and `deploy.yml` refuses any that don't.
- **Writes are upserts keyed by client-generated IDs, inside `transactionWithRetry`,** because any write may be retried.
- **`src/db/seed-data.ts` holds fake data only.** It loads on every `portfolio` target and never on café production.
