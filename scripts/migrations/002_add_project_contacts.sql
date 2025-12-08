-- Migration: Add project_contacts table
-- This migration creates the project_contacts table for managing project-specific contact information

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create project_contacts table
CREATE TABLE IF NOT EXISTS project_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE,
    client_id UUID NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_project_contacts_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_contacts_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_contacts_project_id ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contacts_client_id ON project_contacts(client_id);

-- Add comment
COMMENT ON TABLE project_contacts IS '项目联系人信息表，存储项目特定的联系人信息';
