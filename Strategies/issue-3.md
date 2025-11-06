# Issue #3: RLS Policy Testing Strategy

## Overview

Implement comprehensive tests for Row Level Security (RLS) policies to ensure proper access control across all database tables. This ensures "only team members can access the notes data surface across all entry points."

## Current RLS Policies

### Profiles Table

- **SELECT**: All authenticated users can view all profiles
- **UPDATE/INSERT/DELETE**: Only the profile owner can modify their own profile

### Teams Table

- **SELECT**: Team members can view their teams (via `is_team_member()`)
- **INSERT**: Users can create teams (must be owner)
- **UPDATE**: Only team owners (via `is_team_owner()`)
- **DELETE**: Only team owners (via `is_team_owner()`)

### Team Members Table

- **SELECT**: View membership of teams you belong to
- **INSERT**: Team owners OR the user themselves can add memberships
- **UPDATE**: Team owners only
- **DELETE**: Team owners OR the user themselves

### Notes Table

- **SELECT**: Team members can view team notes (via `is_team_member()`)
- **INSERT**: Team members can create notes (must be author + team member)
- **UPDATE**: Team member
- **DELETE**: Note author OR team owner

## Testing Approach

### 1. pgTAP-based SQL Tests (Primary)

**File**: `supabase/tests/rls-policies.test.pgtap.sql`

Use pgTAP testing framework for PostgreSQL:

- Industry-standard TAP (Test Anything Protocol) output
- Built-in test functions: `plan()`, `has_table()`, `has_function()`, `lives_ok()`, etc.
- Automatic transaction rollback (no manual cleanup needed)
- Create test users and teams in temporary tables
- Use `SET LOCAL ROLE` and JWT claims to simulate different users
- Test schema validation, helper functions, and RLS policies
- Verify both allowed and denied operations

**Run with**: `pnpm test:rls:pgtap`

**Advantages**:

- Proper testing framework with assertions
- TAP output format for CI/CD integration
- Direct database-level testing
- Fast execution
- No API layer involved
- Automatic cleanup via rollback
- Industry best practice

### 2. Vitest TypeScript Integration Tests

**File**: `tests/rls.test.ts`

Use Vitest testing framework with Supabase client library:

- Modern Jest alternative with better performance
- Use `describe`, `it`, `expect` API for structured tests
- Create test users via auth API
- Test operations with real authentication tokens
- Verify API responses for allowed/denied operations
- Automatic setup and teardown hooks

**Run with**: `pnpm test:rls`

**Advantages**:

- Tests full application stack
- Validates client library behavior
- Tests real-world usage patterns
- Catches integration issues
- Proper test framework with good developer experience
- Watch mode for development

## Test Scenarios to Cover

### Teams

- ✅ **Allowed**:
  - Owner can view, update, and delete their team
  - Member can view team they belong to
  - Any user can create a new team

- ❌ **Denied**:
  - Non-member cannot view team
  - Member (non-owner) cannot update team
  - Member (non-owner) cannot delete team
  - User cannot create team with different owner_id

### Team Members

- ✅ **Allowed**:
  - Member can view team membership
  - Owner can add/remove members
  - User can join team themselves
  - User can leave team themselves

- ❌ **Denied**:
  - Non-member cannot view membership
  - Non-owner cannot update member roles
  - Non-owner, non-self cannot remove members

### Notes

- ✅ **Allowed**:
  - Team member can view team notes
  - Team member can create notes
  - Any team member can update any note in the team
  - Author can delete their own notes
  - Team owner can delete any team notes

- ❌ **Denied**:
  - Non-member cannot view team notes
  - Non-member cannot create notes in team
  - Non-member cannot update notes
  - Non-author, non-owner cannot delete notes
  - User cannot create note with different author_id

### Profiles

- ✅ **Allowed**:
  - Any authenticated user can view all profiles
  - Owner can update their own profile

- ❌ **Denied**:
  - Anonymous users cannot view profiles
  - User cannot update other users' profiles

## Implementation Tasks

1. **✅ Install pgTAP Extension**
   - Created migration `20251106000005_install_pgtap.sql`
   - Installed pgTAP extension in database

2. **✅ Create pgTAP Test Suite**
   - Created `supabase/tests/rls-policies.test.pgtap.sql`
   - 32 comprehensive tests covering:
     - Schema validation (tables, columns)
     - Helper functions existence
     - RLS enabled on all tables
     - Full CRUD operations for all tables
     - Both allowed and denied operations

3. **🔄 Add pgTAP Test Runner**
   - Update `scripts/run-pgtap-tests.sh` with correct command
   - Add npm script: `test:rls:pgtap`
   - Remove broken `test:rls:sql` script

4. **📋 Install Vitest**
   - Add Vitest and @vitest/ui as dev dependencies
   - Create `vitest.config.ts` configuration
   - Configure environment variable loading

5. **📋 Convert TypeScript Tests to Vitest**
   - Move `scripts/test-rls.ts` to `tests/rls.test.ts`
   - Refactor to use `describe`, `it`, `expect` API
   - Add proper setup/teardown with `beforeAll`/`afterAll`
   - Update npm script: `test:rls`

6. **📋 Update Documentation**
   - Update `supabase/tests/README.md` with new commands
   - Document pgTAP and Vitest usage
   - Add examples and troubleshooting
   - Update CI/CD integration examples

## Acceptance Criteria

✅ **Completion Requirements**:

1. ✅ pgTAP extension installed in database
2. ✅ pgTAP test suite created with 32+ comprehensive tests
3. 🔄 pgTAP test runner script configured with correct CLI command
4. 📋 Vitest installed and configured
5. 📋 TypeScript tests converted to Vitest format with proper structure
6. 📋 NPM scripts configured: `test:rls:pgtap` and `test:rls`
7. 📋 Documentation updated with new testing framework usage
8. 📋 All tests pass and demonstrate both allowed and denied operations
9. Tests stored in repository for regression coverage and CI/CD integration

## Helper Functions

The following helper functions are used in RLS policies:

1. **`is_team_member(team_id uuid)`**
   - Returns: boolean
   - Checks if current user is a member of the given team
   - Uses SECURITY DEFINER to bypass RLS

2. **`is_team_owner(team_id uuid)`**
   - Returns: boolean
   - Checks if current user is the owner of the given team
   - Uses SECURITY DEFINER to bypass RLS

These functions prevent infinite recursion in RLS policy evaluation.

## Security Considerations

1. **Service Role Key**: Used only in server-side code and tests
2. **Anonymous Key**: Limited by RLS policies (no authenticated access)
3. **Test Isolation**: Tests should create and clean up their own data
4. **No Real User Data**: Tests use generated test data only

## Future Enhancements

- Add performance testing for RLS policies with pgTAP benchmarks
- Monitor query plan performance with EXPLAIN ANALYZE
- Add fuzzing tests for edge cases
- Integrate with CI/CD pipeline (GitHub Actions)
- Add code coverage for policy branches
- Use Vitest watch mode for TDD during development
- Add snapshot testing for query results
- Test concurrent operations and race conditions
