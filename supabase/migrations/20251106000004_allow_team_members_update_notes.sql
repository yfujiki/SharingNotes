-- Allow any team member to update notes (not just the author)
-- This enables collaborative editing within teams

-- Drop the restrictive author-only update policy
DROP POLICY IF EXISTS "Authors can update notes" ON public.notes;

-- Create new policy that allows any team member to update notes
CREATE POLICY "Team members can update notes" ON public.notes
  FOR UPDATE
  USING (public.is_team_member(team_id))
  WITH CHECK (public.is_team_member(team_id));

-- Add comment explaining the collaborative editing approach
COMMENT ON POLICY "Team members can update notes" ON public.notes IS
  'Any team member can update notes in their team. This enables collaborative editing while maintaining team boundaries.';
