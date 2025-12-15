-- Migration: Drop old role column from users table
-- Date: 2025-12-15
-- Description: Remove the old single 'role' column after migration to 'roles' array
-- This fixes the issue where creating new users fails due to NOT NULL constraint on 'role' column

-- Step 1: Ensure all users have roles value (safety check)
UPDATE users 
SET roles = ARRAY['member']::text[]
WHERE roles IS NULL;

-- Step 2: Drop the old role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Verification: Check that role column is removed
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = CURRENT_SCHEMA() 
-- AND table_name = 'users' 
-- AND column_name = 'role';
-- Should return 0 rows

