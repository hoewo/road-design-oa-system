-- Migration: Migrate ProductionCost data to FinancialRecord
-- This migration script migrates existing ProductionCost records to the unified FinancialRecord table
-- WARNING: Backup your database before running this migration!

-- Step 1: Insert ProductionCost records into financial_records table
INSERT INTO financial_records (
    id,
    project_id,
    financial_type,
    direction,
    amount,
    occurred_at,
    cost_category,
    description,
    created_by_id,
    created_at,
    updated_at
)
SELECT
    id,                                    -- Use existing ProductionCost ID
    project_id,
    'cost'::text,                           -- Set financial_type to 'cost'
    'expense'::text,                       -- Production cost is an expense (支出)
    amount,
    COALESCE(incurred_at, created_at, NOW()), -- Use incurred_at if available, otherwise created_at
    CASE
        WHEN cost_type = 'travel' THEN 'taxi'::text          -- Map travel to taxi (closest match)
        WHEN cost_type = 'accommodation' THEN 'accommodation'::text
        WHEN cost_type = 'vehicle' THEN 'taxi'::text          -- Map vehicle to taxi (closest match)
        WHEN cost_type = 'labor' THEN 'other'::text           -- Map labor to other
        WHEN cost_type = 'material' THEN 'other'::text          -- Map material to other
        WHEN cost_type = 'other' THEN 'other'::text
        ELSE 'other'::text
    END,                                   -- Map cost_type to cost_category
    description,
    created_by_id,
    created_at,
    updated_at
FROM production_costs
WHERE NOT EXISTS (
    SELECT 1 FROM financial_records WHERE financial_records.id = production_costs.id
);

-- Step 2: Verify migration (optional - run this to check)
-- SELECT COUNT(*) FROM production_costs;
-- SELECT COUNT(*) FROM financial_records WHERE financial_type = 'cost';

-- Step 3: After verification, you can drop the production_costs table
-- DROP TABLE IF EXISTS production_costs CASCADE;

-- Note: The production_costs table will be kept for now to allow rollback if needed.
-- After confirming the migration is successful, you can drop it manually.
