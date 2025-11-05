-- Fix infinite recursion in is_team_member function
-- The issue: is_team_member queries team_members, but team_members RLS also uses is_team_member
-- Solution: Use SECURITY DEFINER to bypass RLS within the function

-- Recreate is_team_member with SECURITY DEFINER
-- Using CREATE OR REPLACE to avoid dropping dependent policies
CREATE OR REPLACE FUNCTION public.is_team_member(team uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team AND tm.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Also fix is_team_owner for consistency
CREATE OR REPLACE FUNCTION public.is_team_owner(team uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team AND t.owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Add comment explaining the security definer usage
COMMENT ON FUNCTION public.is_team_member IS
  'Checks if the current user is a member of the given team. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';

COMMENT ON FUNCTION public.is_team_owner IS
  'Checks if the current user is the owner of the given team. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
