-- Allow team members to view each other's profiles
-- This is needed so team owners can see member information

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Profiles are viewable by their owner" ON public.profiles;

-- Create new policy that allows viewing your own profile OR profiles of team members
CREATE POLICY "Profiles are viewable by owner or team members" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      INNER JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = public.profiles.id
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Profiles are viewable by owner or team members" ON public.profiles IS
  'Users can view their own profile and profiles of users who are in the same team(s)';
