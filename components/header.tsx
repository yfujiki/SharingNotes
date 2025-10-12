'use client';

import Link from 'next/link';
import { UserNav } from './user-nav';

export function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Sharing Notes
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/check"
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Diagnostics
            </Link>
          </nav>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
