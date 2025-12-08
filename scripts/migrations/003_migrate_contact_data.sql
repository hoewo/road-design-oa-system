-- Migration: Migrate contact data from clients to project_contacts
-- This migration moves contact information from the clients table to project_contacts
-- Note: This assumes clients table had contact_name and contact_phone fields

-- WARNING: This migration assumes:
-- 1. Clients table has been updated to remove contact_name and contact_phone
-- 2. Projects table has client_id foreign key
-- 3. All IDs have been converted to UUID format

-- Step 1: Migrate contact data from clients to project_contacts
-- This creates a project_contact record for each project that has a client
-- with contact information
INSERT INTO project_contacts (project_id, client_id, contact_name, contact_phone, created_at, updated_at)
SELECT
    p.id AS project_id,
    p.client_id,
    COALESCE(c.contact_name, '') AS contact_name,
    COALESCE(c.contact_phone, '') AS contact_phone,
    CURRENT_TIMESTAMP AS created_at,
    CURRENT_TIMESTAMP AS updated_at
FROM projects p
INNER JOIN clients c ON p.client_id = c.id
WHERE p.client_id IS NOT NULL
  AND (c.contact_name IS NOT NULL OR c.contact_phone IS NOT NULL)
ON CONFLICT (project_id) DO NOTHING;

-- Note: If clients table still has contact_name and contact_phone columns,
-- you may need to adjust this query or run it before removing those columns.
