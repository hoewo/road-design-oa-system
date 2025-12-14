-- Migration: Add bidding_info table
-- Date: 2025-01-28
-- Description: Create bidding_info table for managing project bidding information

-- Create bidding_info table
CREATE TABLE IF NOT EXISTS bidding_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    tender_file_id UUID,
    bid_file_id UUID,
    award_notice_file_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_bidding_info_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_bidding_info_tender_file FOREIGN KEY (tender_file_id) REFERENCES files(id) ON DELETE SET NULL,
    CONSTRAINT fk_bidding_info_bid_file FOREIGN KEY (bid_file_id) REFERENCES files(id) ON DELETE SET NULL,
    CONSTRAINT fk_bidding_info_award_notice_file FOREIGN KEY (award_notice_file_id) REFERENCES files(id) ON DELETE SET NULL,
    
    -- Unique constraint: one bidding info per project
    CONSTRAINT uk_bidding_info_project_id UNIQUE (project_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bidding_info_project_id ON bidding_info(project_id);
CREATE INDEX IF NOT EXISTS idx_bidding_info_tender_file_id ON bidding_info(tender_file_id);
CREATE INDEX IF NOT EXISTS idx_bidding_info_bid_file_id ON bidding_info(bid_file_id);
CREATE INDEX IF NOT EXISTS idx_bidding_info_award_notice_file_id ON bidding_info(award_notice_file_id);

-- Add comment
COMMENT ON TABLE bidding_info IS '项目招投标信息表';
COMMENT ON COLUMN bidding_info.project_id IS '项目ID';
COMMENT ON COLUMN bidding_info.tender_file_id IS '招标文件ID';
COMMENT ON COLUMN bidding_info.bid_file_id IS '投标文件ID';
COMMENT ON COLUMN bidding_info.award_notice_file_id IS '中标通知书文件ID';

