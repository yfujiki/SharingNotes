-- Allow viewing all profiles so users can see who to invite to teams
-- Previous policy only allowed viewing profiles of team members

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Profiles are viewable by owner or team members" ON public.profiles;

-- Create new policy that allows viewing all profiles
-- This is reasonable since users need to see all users to invite them to teams
CREATE POLICY "Profiles are viewable by all authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add comment explaining the policy
COMMENT ON POLICY "Profiles are viewable by all authenticated users" ON public.profiles IS
  'All authenticated users can view profiles. This allows users to see who they can invite to teams.';
