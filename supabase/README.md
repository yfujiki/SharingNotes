# Supabase Database Scripts

This directory contains database migrations and seed scripts for the Sharing Notes application.

## Available Scripts

### Migration Scripts

```bash
# Push new migrations to the remote database
pnpm supabase:migrate

# Reset the local database to current migrations
pnpm supabase:reset
```

### Seed Script

```bash
# Seed the database with demo data
pnpm supabase:seed
```

The seed script will:
- Use the first registered user from your auth.users table
- Create 3 demo teams: "Personal Projects", "Work Team", and "Study Group"
- Create 9 demo notes across these teams (3 notes per team)

**Prerequisites:**
- You must have at least one user signed up in your application
- The `SUPABASE_SERVICE_ROLE_KEY` must be set in your `.env.local` file

## Migrations

Migrations are stored in `./migrations/` and are applied in chronological order.

### Current Migrations:

1. **20251012000100_init_notes_schema.sql** - Initial schema setup
   - Creates profiles, teams, team_members, and notes tables
   - Sets up RLS policies
   - Creates helper functions for team membership checks

2. **20251020000001_fix_team_member_recursion.sql** - Fixes RLS recursion
   - Updates `is_team_member` and `is_team_owner` functions with SECURITY DEFINER
   - Prevents infinite recursion in RLS policy checks

3. **20251106000001_allow_team_members_view_profiles.sql** - Profile visibility
   - Allows team members to view each other's profiles
   - Updates RLS policy to enable team collaboration features

## Creating a New Migration

To create a new migration manually:

1. Create a new SQL file in the `migrations/` directory
2. Name it with the format: `YYYYMMDDHHMMSS_description.sql`
3. Write your SQL statements
4. Run `pnpm supabase:migrate` to apply it

## Seed Data

The seed data includes:

### Personal Projects Team
- Welcome to Shared Notes! (Getting started guide)
- Project Ideas (List of project ideas)
- Learning Resources (Useful web development resources)

### Work Team
- Team Meeting Notes (Sample meeting notes with action items)
- Feature Specifications (Feature requirements document)
- Code Review Checklist (PR checklist)

### Study Group
- Chapter 1: Introduction (Study notes)
- Study Schedule (Weekly study plan)
- Exam Preparation Tips (Study tips)

## Troubleshooting

### No users found error
If you see "No users found" when running the seed script:
1. Visit your application
2. Sign up for a new account
3. Run the seed script again

### Migration conflicts
If you encounter migration conflicts:
1. Check the migration order
2. Ensure no duplicate migration names
3. Review SQL syntax for errors

### RLS Policy Issues
If you can't access data after migrations:
1. Verify RLS policies are correctly set up
2. Check that helper functions use SECURITY DEFINER where needed
3. Test policies with different user roles

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
