-- Migration: Migrate Bonus data to FinancialRecord
-- This migration script migrates existing Bonus records to the unified FinancialRecord table
-- WARNING: Backup your database before running this migration!

-- Step 1: Insert Bonus records into financial_records table
INSERT INTO financial_records (
    id,
    project_id,
    financial_type,
    direction,
    amount,
    occurred_at,
    bonus_category,
    recipient_id,
    description,
    created_by_id,
    created_at,
    updated_at
)
SELECT
    id,                                    -- Use existing Bonus ID
    project_id,
    'bonus'::text,                         -- Set financial_type to 'bonus'
    'expense'::text,                       -- Bonus is an expense (支出)
    amount,
    COALESCE(created_at, NOW()),          -- Use created_at as occurred_at if available
    CASE
        WHEN bonus_type = 'business' THEN 'business'::text
        WHEN bonus_type = 'production' THEN 'production'::text
        ELSE NULL
    END,                                   -- Map bonus_type to bonus_category
    user_id,                               -- Map user_id to recipient_id
    description,
    created_by_id,
    created_at,
    updated_at
FROM bonuses
WHERE NOT EXISTS (
    SELECT 1 FROM financial_records WHERE financial_records.id = bonuses.id
);

-- Step 2: Verify migration (optional - run this to check)
-- SELECT COUNT(*) FROM bonuses;
-- SELECT COUNT(*) FROM financial_records WHERE financial_type = 'bonus';

-- Step 3: After verification, you can drop the bonuses table
-- DROP TABLE IF EXISTS bonuses CASCADE;

-- Note: The bonuses table will be kept for now to allow rollback if needed.
-- After confirming the migration is successful, you can drop it manually.
