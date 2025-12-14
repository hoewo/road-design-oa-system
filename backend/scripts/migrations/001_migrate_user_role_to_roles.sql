-- Migration: Convert user role from single role to roles array
-- Date: 2025-01-30
-- Description: Migrate users.role (varchar) to users.roles (text[])

-- Step 1: Add new roles column (temporary, allow NULL initially)
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles text[];

-- Step 2: Migrate existing role data to roles array
-- Convert single role value to array format
UPDATE users 
SET roles = ARRAY[role]::text[]
WHERE roles IS NULL AND role IS NOT NULL;

-- Step 3: Set default value for any remaining NULL roles
UPDATE users 
SET roles = ARRAY['member']::text[]
WHERE roles IS NULL;

-- Step 4: Make roles column NOT NULL
ALTER TABLE users ALTER COLUMN roles SET NOT NULL;

-- Step 5: Set default value for new rows
ALTER TABLE users ALTER COLUMN roles SET DEFAULT ARRAY['member']::text[];

-- Step 6: (Optional) Drop old role column after verification
-- Uncomment the following line after verifying the migration is successful:
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Note: Keep the old 'role' column temporarily for backward compatibility
-- Remove it in a separate migration after all code is updated

