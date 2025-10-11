import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Sharing Notes starter
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            This scaffold wires Supabase into a Next.js App Router project with environment guards
            and diagnostics. Replace this landing page once core product work begins.
          </p>
        </header>

        <section className="rounded-lg border border-neutral-200 bg-white/60 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Checklist
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-emerald-500" />
              <span>
                Fill out `.env.local` using the Supabase project keys (anon + service role) and run
                `pnpm check-env`.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-emerald-500" />
              <span>
                Visit <Link href="/check" className="underline decoration-dotted underline-offset-4">
                  /check
                </Link>{' '}
                to confirm Supabase connectivity across server and client contexts.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-2 rounded-full bg-emerald-500" />
              <span>
                Replace this diagnostic content with the Sharing Notes product experience once the
                backend schema is ready.
              </span>
            </li>
          </ol>
        </section>

        <footer className="text-sm text-neutral-500 dark:text-neutral-500">
          Next steps: wire Supabase auth UX, scaffold note schemas, and set up CI for lint/typecheck.
        </footer>
      </div>
    </main>
  );
}
