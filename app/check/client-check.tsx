'use client';

import { useEffect, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type ClientStatus = 'loading' | 'ok' | 'error';

type ClientCheckState = {
  status: ClientStatus;
  sessionMessage: string;
  healthMessage: string;
  error?: string;
};

const initialState: ClientCheckState = {
  status: 'loading',
  sessionMessage: 'Checking Supabase session…',
  healthMessage: 'Waiting for health endpoint…',
};

const statusStyles: Record<ClientStatus, string> = {
  loading: 'bg-blue-500/10 text-blue-700 border-blue-200',
  ok: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  error: 'bg-rose-500/10 text-rose-700 border-rose-200',
};

const statusLabels: Record<ClientStatus, string> = {
  loading: 'loading',
  ok: 'ok',
  error: 'error',
};

export function ClientSupabaseCheck() {
  const [state, setState] = useState<ClientCheckState>(initialState);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      try {
        const supabase = getSupabaseBrowserClient();

        const [{ data: sessionData, error: sessionError }, healthResponse] = await Promise.all([
          supabase.auth.getSession(),
          fetch('/api/supabase-health').then(async (response) => ({
            ok: response.ok,
            json: await response.json().catch(() => ({})),
          })),
        ]);

        if (sessionError) {
          throw sessionError;
        }

        const session = sessionData?.session ?? null;
        const sessionMessage = session
          ? `Authenticated as ${session.user.email ?? session.user.id}`
          : 'No active session (anonymous visitor).';

        if (!healthResponse.ok || !healthResponse.json?.ok) {
          const errorMessage =
            (healthResponse.json && 'message' in healthResponse.json
              ? String(healthResponse.json.message)
              : 'Health endpoint returned an error') ?? 'Health endpoint returned an error';
          throw new Error(errorMessage);
        }

        const healthMessage = `Service role query succeeded (sampleUserCount=${healthResponse.json.sampleUserCount ?? 0}).`;

        if (isActive) {
          setState({
            status: 'ok',
            sessionMessage,
            healthMessage,
          });
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          status: 'error',
          sessionMessage: 'Unable to confirm session.',
          healthMessage: 'Health endpoint failed.',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white/60 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Client connectivity</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Checks Supabase availability from the browser.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[state.status]}`}
        >
          <span className="size-2 rounded-full bg-current" />
          {statusLabels[state.status]}
        </span>
      </header>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-200">
            `supabase.auth.getSession()`
          </dt>
          <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
            {state.sessionMessage}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-700 dark:text-neutral-200">
            `/api/supabase-health`
          </dt>
          <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
            {state.healthMessage}
          </dd>
        </div>
      </dl>

      {state.error ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
