import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';

import { getSupabasePublicEnv } from '@/lib/supabase/env';
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@/lib/supabase/server';

import { ClientSupabaseCheck } from './client-check';

type Status = 'ok' | 'error';

type ServerCheckResult = {
  sessionStatus: Status;
  sessionMessage: string;
  session: Session | null;
  sessionError?: string;
  adminStatus: Status;
  adminMessage: string;
  sampleUserIdentifier?: string | null;
};

const statusStyles: Record<Status, string> = {
  ok: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  error: 'bg-rose-500/10 text-rose-700 border-rose-200',
};

const statusLabels: Record<Status, string> = {
  ok: 'ok',
  error: 'error',
};

const mask = (value: string): string => {
  if (!value) {
    return '—';
  }

  if (value.length <= 8) {
    return `${value.slice(0, 3)}…${value.slice(-1)}`;
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

const runServerChecks = async (): Promise<ServerCheckResult> => {
  const serverClient = await createSupabaseServerClient();

  let sessionStatus: Status = 'ok';
  let sessionMessage = 'No active session (anonymous visitor).';
  let session: Session | null = null;
  let sessionError: string | undefined;

  try {
    const { data, error } = await serverClient.auth.getSession();

    if (error) {
      sessionStatus = 'error';
      sessionError = error.message;
      sessionMessage = error.message;
    } else {
      session = data.session ?? null;
      if (session) {
        sessionMessage = `Authenticated as ${session.user.email ?? session.user.id}`;
      }
    }
  } catch (error) {
    sessionStatus = 'error';
    sessionError = error instanceof Error ? error.message : 'Unknown error retrieving session';
    sessionMessage = sessionError;
  }

  let adminStatus: Status = 'ok';
  let adminMessage = 'Admin API query succeeded.';
  let sampleUserIdentifier: string | null | undefined;

  try {
    const serviceClient = createSupabaseServiceRoleClient();
    const result = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (result.error) {
      adminStatus = 'error';
      adminMessage = result.error.message;
    } else {
      if (result.data?.users?.length) {
        const user = result.data.users[0];
        sampleUserIdentifier = user.email ?? user.id;
        adminMessage = `Admin API succeeded. Sample user: ${sampleUserIdentifier}`;
      } else {
        adminMessage = 'Admin API succeeded. No users found yet.';
      }
    }
  } catch (error) {
    adminStatus = 'error';
    adminMessage = error instanceof Error ? error.message : 'Unknown error calling admin API';
  }

  return {
    sessionStatus,
    sessionMessage,
    session,
    sessionError,
    adminStatus,
    adminMessage,
    sampleUserIdentifier,
  };
};

export default async function CheckPage() {
  const env = getSupabasePublicEnv();
  const serverCheck = await runServerChecks();
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <main className="min-h-screen bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Diagnostics
          </p>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            Supabase connectivity check
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Use this page to verify that required environment variables are present and that
            Supabase calls succeed from both server and client contexts. Replace this page once the
            core note-taking features are in place.
          </p>
          <div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 underline decoration-dotted underline-offset-4 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              href="/"
            >
              ← Back to home
            </Link>
          </div>
        </header>

        <section className="rounded-lg border border-neutral-200 bg-white/60 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Server connectivity</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Runs from the Next.js server runtime using the anon and service-role keys.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusStyles[serverCheck.sessionStatus === 'error' || serverCheck.adminStatus === 'error' ? 'error' : 'ok']}`}
            >
              <span className="size-2 rounded-full bg-current" />
              {statusLabels[
                serverCheck.sessionStatus === 'error' || serverCheck.adminStatus === 'error'
                  ? 'error'
                  : 'ok'
              ]}
            </span>
          </header>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-neutral-700 dark:text-neutral-200">
                `supabase.auth.getSession()`
              </dt>
              <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
                {serverCheck.sessionMessage}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-700 dark:text-neutral-200">
                <code>auth.admin.listUsers({`{ page: 1, perPage: 1 }`})</code>
              </dt>
              <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
                {serverCheck.adminMessage}
              </dd>
            </div>
          </dl>
        </section>

        <ClientSupabaseCheck />

        <section className="rounded-lg border border-neutral-200 bg-white/60 p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/70">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Environment</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Values read at runtime from environment variables.
              </p>
            </div>
          </header>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-neutral-700 dark:text-neutral-200">
                NEXT_PUBLIC_SUPABASE_URL
              </dt>
              <dd className="mt-1 text-neutral-600 dark:text-neutral-400">{env.url}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-700 dark:text-neutral-200">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </dt>
              <dd className="mt-1 text-neutral-600 dark:text-neutral-400">{mask(env.anonKey)}</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-700 dark:text-neutral-200">
                SUPABASE_SERVICE_ROLE_KEY
              </dt>
              <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
                {serviceRoleConfigured ? mask(process.env.SUPABASE_SERVICE_ROLE_KEY!) : 'Missing'}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
