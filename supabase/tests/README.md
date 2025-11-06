# RLS Policy Tests

This directory contains tests for Row Level Security (RLS) policies to ensure proper access control across all database tables.

## Testing Frameworks

We use two industry-standard testing frameworks:

1. **pgTAP** - PostgreSQL testing framework for SQL-level tests
2. **Vitest** - Modern JavaScript testing framework for integration tests

## Test Files

### 1. `rls-policies.test.pgtap.sql` (Recommended)
pgTAP-based tests that run directly against the database using TAP (Test Anything Protocol):

**Features:**
- 26 comprehensive tests covering all tables and operations
- Schema validation (tables, columns, helper functions exist)
- RLS enabled verification
- Full CRUD operation testing
- Automatic rollback (no manual cleanup needed)
- TAP output format for CI/CD integration

**Advantages:**
- Industry-standard testing framework
- Proper assertions and test structure
- Fast execution
- Direct database-level testing
- No API layer involved
- Easy to test edge cases
- Professional test output

**Run with:**
```bash
pnpm test:rls:pgtap
```

### 2. `../tests/rls.test.ts`
Vitest-based TypeScript integration tests using the Supabase client library:

**Features:**
- Structured with `describe`, `it`, `expect` API
- Creates test users via auth API
- Uses real authentication tokens
- Tests through Supabase client
- Automatic setup/teardown with `beforeAll`/`afterAll`
- Tests collaborative editing features
- Clean separation of test suites

**Advantages:**
- Modern testing framework
- Tests the full application stack
- Validates client library behavior
- Tests real-world usage patterns
- Catches integration issues
- Watch mode for development
- Better developer experience

**Run with:**
```bash
# Run once
pnpm test:rls

# Watch mode for development
pnpm test:rls:watch
```

## Running Tests

### pgTAP Tests (For Local Development)

**Prerequisites:**
1. **For local testing** (recommended):
   ```bash
   # Start local Supabase (do this once, keep it running)
   npx supabase start
   ```

2. **For remote testing** (may have permission errors):
   ```bash
   # Link to your Supabase project (do this once)
   npx supabase link
   ```

**Running the tests:**
```bash
# Run against LOCAL Supabase (recommended - assumes supabase is already started)
pnpm test:rls:pgtap

# Run against linked/remote instance (may have permission issues)
pnpm test:rls:pgtap:linked
```

**Requirements:**
- Supabase CLI installed: `npm install -g supabase`
- Local Docker running (for local tests)
- pgTAP extension installed (migration `20251106000005_install_pgtap.sql`)

**Note:** pgTAP tests work best on local Supabase instances where you have full database control. Running against linked (remote) instances may encounter permission errors when creating test data. For remote testing, use the Vitest integration tests below.

The pgTAP tests directly test RLS policies at the database level with proper testing framework structure.

### Vitest Integration Tests (Recommended for Remote/CI Testing)

**Prerequisites:**
- Remote Supabase instance with credentials in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Running the tests:**
```bash
# Run Vitest tests once
pnpm test:rls

# Run in watch mode for development
pnpm test:rls:watch
```

**Note on Local Testing:**
Due to JWT validation complexities between local GoTrue and PostgREST, Vitest tests are recommended for **remote Supabase instances only**. For local development testing, use the pgTAP tests above, which work perfectly with local instances.

The Vitest tests validate that RLS policies work correctly through the full application stack including the Supabase client library, authentication, and API layer.

## Test Scenarios

### Profiles
- ✅ Any authenticated user can view all profiles
- ✅ User can update their own profile
- ❌ User cannot update other users' profiles
- ❌ Anonymous users cannot view profiles

### Teams
- ✅ User can create a team
- ✅ Team members can view their teams
- ✅ Team owner can update/delete their team
- ❌ Non-members cannot view teams
- ❌ Non-owners cannot update/delete teams

### Team Members
- ✅ Team members can view membership
- ✅ Team owner can add/remove members
- ✅ User can join a team themselves
- ✅ User can leave a team themselves
- ❌ Non-members cannot view membership
- ❌ Non-owners cannot update member roles

### Notes
- ✅ Team members can view team notes
- ✅ Team members can create notes
- ✅ Any team member can update any note in the team
- ✅ Note author can delete their notes
- ✅ Team owner can delete any team notes
- ❌ Non-members cannot view team notes
- ❌ Non-members cannot create/update/delete notes

## Test Output

Both test scripts provide clear output indicating:
- ✓ Passed tests (green checkmarks)
- ✗ Failed tests (red X marks with error messages)
- Test progress and section headers
- Summary of results

### Example Output

```
========================================
RLS Policy Tests Starting
========================================

📝 Creating test users...
✓ Created User 1: abc123...
✓ Created User 2: def456...
✓ Created User 3: ghi789...

========================================
Test 1: Teams RLS Policies
========================================
✓ User 1 can create team
✓ User 2 can create team

========================================
Test 2: Team Members RLS Policies
========================================
✓ Owner can add members to team
✓ Member can view team they belong to
✓ Non-member cannot view team

...

========================================
All RLS Policy Tests PASSED ✓
========================================
```

## Adding New Tests

### To add a pgTAP test:

1. Edit `rls-policies.test.pgtap.sql`
2. Update the test plan count: `SELECT plan(N);` where N is total test count
3. Add test in appropriate section using pgTAP functions:
   ```sql
   -- Test schema
   SELECT has_table('public', 'table_name', 'description');
   SELECT has_column('public', 'table_name', 'column_name', 'description');

   -- Test policy allows operation
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claims TO json_build_object('sub', user_id)::text;

   PREPARE test_operation AS
     SELECT operation FROM table WHERE condition;

   SELECT results_eq('test_operation', $$VALUES (expected)$$, 'description');

   -- Test policy denies operation
   SELECT lives_ok('prepared_statement', 'description');
   -- or
   SELECT throws_ok('prepared_statement', 'error_code', 'description');
   ```
4. Tests automatically rollback, no cleanup needed

### To add a Vitest test:

1. Edit `../tests/rls.test.ts`
2. Add test in appropriate `describe` block or create new one
3. Use Vitest's `it` and `expect` API:
   ```typescript
   describe('Feature Name', () => {
     it('should allow/deny operation', async () => {
       const { data, error } = await userClient
         .from('table')
         .operation();

       expect(error).toBeNull();
       expect(data).toBeTruthy();
       expect(data?.field).toBe(expectedValue);
     });
   });
   ```
4. Use `beforeAll` for setup, `afterAll` for cleanup
5. Use descriptive test names

## Troubleshooting

### pgTAP tests fail to run

**Issue:** `command not found: supabase` or `unknown command: test`

**Solution:**
- Install Supabase CLI: `npm install -g supabase` or use `npx supabase`
- Update to latest version: `npm update -g supabase`
- Link your project: `npx supabase link`
- Verify connection: `npx supabase status`

**Issue:** `extension "pgtap" does not exist`

**Solution:**
- Run migration: `pnpm supabase:migrate`
- Or manually: `npx supabase db push`
- Verify extension installed: Check Supabase dashboard → Database → Extensions

### Vitest tests fail to create users

**Issue:** `Failed to create user: ...`

**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct in `.env.local`
- Check Supabase project is accessible
- Ensure email confirmation is disabled for testing
- Check for rate limiting on auth endpoints

**Issue:** Test timeouts

**Solution:**
- Increase timeout in `vitest.config.ts`
- Check database performance
- Ensure not running too many tests in parallel

### Tests pass but policies don't work in app

**Issue:** Tests pass but RLS still allows/blocks incorrectly in the application

**Possible causes:**
- Different Supabase instance between tests and app
- Caching issues (refresh browser/clear Supabase cache)
- Migrations not applied to production
- Helper functions (`is_team_member`, `is_team_owner`) not working correctly

**Debug steps:**
1. Verify migrations are applied: `pnpm supabase:migrate`
2. Check helper functions exist and use SECURITY DEFINER
3. Test with fresh browser session
4. Check Supabase dashboard for policy configuration
5. Run pgTAP tests to verify database-level policies
6. Check browser console for API errors

## CI/CD Integration

To run these tests in CI/CD:

1. **Set up environment variables** in your CI/CD platform
2. **Install dependencies**: `pnpm install`
3. **Link Supabase project**: `npx supabase link`
4. **Run tests**: Both `pnpm test:rls:pgtap` and `pnpm test:rls`
5. **Check exit code**: Tests exit with code 1 on failure

### Example GitHub Actions

```yaml
name: RLS Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Link Supabase project
        run: npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Run pgTAP tests
        run: pnpm test:rls:pgtap

      - name: Run Vitest integration tests
        run: pnpm test:rls
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Best Practices

1. **Run both test suites** - pgTAP for database-level validation, Vitest for full-stack integration
2. **Run tests before deploying** to catch RLS regressions
3. **Update tests when adding new policies** to maintain coverage
4. **Test both allowed and denied operations** for complete validation
5. **Use descriptive test names** that explain what is being tested
6. **Keep tests isolated** - each test should be independent
7. **Use watch mode during development** - `pnpm test:rls:watch` for fast feedback
8. **Document new test scenarios** in this README when adding them
9. **Update test plan count** in pgTAP tests when adding/removing tests
10. **Clean up test data** - Vitest uses afterAll, pgTAP uses rollback

## Security Considerations

- Tests use real credentials (service role key)
- Test users are created and deleted automatically
- Tests should never run against production with real user data
- Use a dedicated test Supabase project or local instance
- Never commit `.env.local` or credentials to version control

## Further Reading

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Testing RLS Policies](https://supabase.com/docs/guides/database/testing)
