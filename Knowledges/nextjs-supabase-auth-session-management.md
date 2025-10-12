# SOP: Next.js + Supabase Authentication & Session Management

Understanding how authentication sessions work in Next.js App Router with Supabase is critical for proper implementation.

**⚠️ IMPORTANT: Always follow the official documentation at https://supabase.com/docs/guides/auth/server-side/nextjs**

This SOP documents key concepts and the most common pitfall we encountered during implementation.

## Session Storage Mechanisms

### Client-Side: localStorage
- **Storage Location**: Browser's `localStorage` (not `sessionStorage`)
- **Persistence**: Survives browser restarts and tab closures
- **Automatic Handling**: Supabase browser client (`@supabase/supabase-js`) automatically stores sessions in `localStorage`
- **Contents**: Access token, refresh token, user metadata
- **Usage**: Client components read directly from `localStorage` via the Supabase client

### Server-Side: HTTP Cookies
- **Storage Location**: HTTP-only cookies sent with every request
- **Necessity**: Server components and API routes cannot access browser `localStorage`
- **Cookie Attributes**: Should be HTTP-only, Secure (HTTPS), SameSite for security
- **Next.js Integration**: Use `cookies()` helper from `next/headers` to read/write cookies
- **Package Required**: `@supabase/ssr` provides cookie helpers for proper server-side session management

## Why Both Are Needed

| Scenario | Storage Used | Reason |
|----------|-------------|--------|
| Client component navigation | localStorage | Fast, no server roundtrip |
| Server component rendering | Cookies | Server can't access localStorage |
| API route authentication | Cookies | Server-side execution context |
| Initial page load (SSR) | Cookies | Session must be available server-side |
| Token refresh | Both | Must sync across client and server |

## Full Authentication Flow

### 1. Initial Login (Client-Side)
```typescript
// User signs in via client component
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// ✅ Session stored in localStorage automatically
// ⚠️ Must ALSO store in cookies for server-side access
```

### 2. Session Synchronization
The `@supabase/ssr` package handles:
- Writing session to cookies after login
- Reading session from cookies on server
- Updating both localStorage and cookies on token refresh
- Cleaning up both storages on logout

### 3. Server Component Access
```typescript
// Server component reads from cookies
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabase = createServerClient(url, key, {
  cookies: {
    getAll() { return cookies().getAll(); },
    setAll(cookiesToSet) { /* update cookies */ }
  }
});

const { data: { session } } = await supabase.auth.getSession();
```

### 4. Client Component Access
```typescript
// Client component reads from localStorage AND writes to cookies
import { createBrowserClient } from '@supabase/ssr'; // ⚠️ NOT @supabase/supabase-js!

const supabase = createBrowserClient(url, key, {
  cookies: {
    getAll() { /* read cookies */ },
    setAll(cookiesToSet) { /* write cookies */ }
  }
});
const { data: { session } } = await supabase.auth.getSession();
```

## Critical Pitfall: Wrong Browser Client Package

### ❌ THE PROBLEM: Using `createClient` from `@supabase/supabase-js`

This is the **#1 mistake** that breaks server-side auth:

```typescript
// ❌ WRONG - This only uses localStorage, not cookies
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
await supabase.auth.signInWithPassword({ email, password });
// Session stored in localStorage only
// Middleware reads cookies → finds nothing → redirects to login
// USER GETS STUCK IN LOGIN LOOP!
```

**Why this breaks:**
1. User logs in successfully
2. Session stored ONLY in `localStorage` (browser-side storage)
3. Middleware runs on the server and checks cookies (server-side storage)
4. Cookies are empty → middleware thinks user is not authenticated
5. Middleware redirects to `/auth/login`
6. Login loop!

### ✅ THE FIX: Use `createBrowserClient` from `@supabase/ssr`

```typescript
// ✅ CORRECT - This syncs both localStorage AND cookies
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(url, key, {
  cookies: {
    getAll() {
      return document.cookie.split('; ').map((cookie) => {
        const [name, ...rest] = cookie.split('=');
        return { name, value: rest.join('=') };
      });
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        let cookie = `${name}=${value}`;
        if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
        if (options?.path) cookie += `; path=${options.path}`;
        document.cookie = cookie;
      });
    },
  },
});

await supabase.auth.signInWithPassword({ email, password });
// ✅ Session stored in BOTH localStorage AND cookies
// ✅ Middleware can read cookies and see the user
// ✅ Authentication works!
```

**Why this works:**
- `createBrowserClient` from `@supabase/ssr` is **cookie-aware**
- It implements the cookie helpers interface
- When authentication happens, it writes to BOTH:
  - `localStorage` (for fast client-side access)
  - `document.cookie` (for server-side middleware/SSR)
- Middleware can now read the session from cookies
- Server and client stay in sync

**The Key Difference:**
| Package | Storage | Server Auth Works? |
|---------|---------|-------------------|
| `@supabase/supabase-js` | localStorage only | ❌ No |
| `@supabase/ssr` | localStorage + cookies | ✅ Yes |

## Common Pitfalls

### ❌ Using Browser Client on Server
```typescript
// WRONG: This will fail or return null session
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default async function ServerPage() {
  const supabase = getSupabaseBrowserClient(); // ❌ No cookies!
  const { data: { user } } = await supabase.auth.getUser();
}
```

### ✅ Proper Server-Side Pattern
```typescript
// CORRECT: Use server client with cookie helpers
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function ServerPage() {
  const supabase = await createSupabaseServerClient(); // ✅ Reads cookies
  const { data: { user } } = await supabase.auth.getUser();
}
```

### ❌ Missing Cookie Sync on Login
```typescript
// WRONG: Session only in localStorage, server can't see it
const { data } = await supabase.auth.signInWithPassword({ email, password });
router.push('/dashboard'); // Server-side render will fail to see session
```

### ✅ Proper Login with Cookie Sync
The `@supabase/ssr` middleware or auth helpers automatically sync cookies when properly configured.

## Token Refresh Synchronization

When access tokens expire (default: 1 hour), both storages must be updated:

1. **Client-Side Refresh**: Supabase client detects expiration, refreshes token, updates `localStorage`
2. **Cookie Update**: Server middleware or API route must also update cookies
3. **Race Conditions**: The `@supabase/ssr` package prevents conflicts between client and server refreshes

## Implementation Checklist

- [ ] Install `@supabase/ssr` package
- [ ] Create server client factory with cookie helpers (`lib/supabase/server.ts`) using `createServerClient` from `@supabase/ssr`
- [ ] Create browser client with cookie helpers (`lib/supabase/client.ts`) using `createBrowserClient` from `@supabase/ssr` ⚠️ **NOT** from `@supabase/supabase-js`
- [ ] Implement middleware for session sync and route protection
- [ ] Implement auth callback route with server-side cookie handling
- [ ] Use server components for protected pages that fetch data
- [ ] Use client components for interactive auth UI (login forms, etc.)
- [ ] Test that login writes to both localStorage and cookies (check browser DevTools → Application → Cookies)
- [ ] Test that middleware can read user from cookies (add breakpoint in middleware.ts)
- [ ] Test that server components can read user session
- [ ] Test that token refresh updates both localStorage and cookies

## Security Considerations

### Cookie Configuration
```typescript
// Recommended cookie options
{
  name: 'supabase-auth-token',
  httpOnly: true,        // Prevent XSS attacks
  secure: true,          // HTTPS only (production)
  sameSite: 'lax',      // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
}
```

### Never Store in sessionStorage
- `sessionStorage` is cleared when tab closes (poor UX)
- Use `localStorage` for client-side persistence
- Use cookies for server-side access

## Related Docs
- `AGENTS.md` – System architecture overview
- `Strategies/issue-2.md` – Auth UX implementation plan
- `Knowledges/supabase-cli-migrations.md` – Database schema management
