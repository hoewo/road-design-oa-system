-- Migration: Migrate ExpertFeePayment data to FinancialRecord
-- This migration script migrates existing ExpertFeePayment records to the unified FinancialRecord table
-- WARNING: Backup your database before running this migration!

-- Step 1: Insert ExpertFeePayment records into financial_records table
INSERT INTO financial_records (
    id,
    project_id,
    financial_type,
    direction,
    amount,
    occurred_at,
    payment_method,
    expert_name,
    description,
    created_by_id,
    created_at,
    updated_at
)
SELECT
    id,                                    -- Use existing ExpertFeePayment ID
    project_id,
    'expert_fee'::text,                    -- Set financial_type to 'expert_fee'
    'expense'::text,                       -- Expert fee is an expense (支出)
    amount,
    COALESCE(created_at, NOW()),          -- Use created_at as occurred_at if available
    payment_method::text,                  -- Map payment_method
    expert_name,                           -- Map expert_name
    description,
    created_by_id,
    created_at,
    updated_at
FROM expert_fee_payments
WHERE NOT EXISTS (
    SELECT 1 FROM financial_records WHERE financial_records.id = expert_fee_payments.id
);

-- Step 2: Verify migration (optional - run this to check)
-- SELECT COUNT(*) FROM expert_fee_payments;
-- SELECT COUNT(*) FROM financial_records WHERE financial_type = 'expert_fee';

-- Step 3: After verification, you can drop the expert_fee_payments table
-- DROP TABLE IF EXISTS expert_fee_payments CASCADE;

-- Note: The expert_fee_payments table will be kept for now to allow rollback if needed.
-- After confirming the migration is successful, you can drop it manually.
