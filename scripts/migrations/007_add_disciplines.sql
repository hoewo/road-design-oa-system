-- Migration: Add disciplines table
-- This migration creates the disciplines table for managing professional disciplines

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create disciplines table
CREATE TABLE IF NOT EXISTS disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disciplines_name ON disciplines(name);
CREATE INDEX IF NOT EXISTS idx_disciplines_is_active ON disciplines(is_active);

-- Insert default disciplines (common road design disciplines)
INSERT INTO disciplines (name, description, is_active) VALUES
    ('道路工程', '道路工程设计专业', true),
    ('桥梁工程', '桥梁工程设计专业', true),
    ('隧道工程', '隧道工程设计专业', true),
    ('交通工程', '交通工程设计专业', true),
    ('给排水工程', '给排水工程设计专业', true),
    ('电气工程', '电气工程设计专业', true),
    ('景观工程', '景观工程设计专业', true),
    ('岩土工程', '岩土工程设计专业', true),
    ('工程经济', '工程经济专业', true),
    ('工程测量', '工程测量专业', true)
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE disciplines IS '专业字典表，存储设计专业信息';
