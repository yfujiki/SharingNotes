-- Add email column to profiles table for easier access
-- This avoids needing to query auth.users (which requires admin access)

-- Add email column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

-- Update the handle_new_user trigger function to also copy email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  -- On conflict: update the existing profile row with new values from EXCLUDED
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        email = EXCLUDED.email,
        updated_at = timezone('utc', now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.email IS
  'User email copied from auth.users for easier access by team members. Updated automatically via trigger.';
