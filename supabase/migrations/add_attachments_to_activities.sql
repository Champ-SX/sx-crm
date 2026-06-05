-- Add attachments column to activities table if it doesn't exist
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN activities.attachments IS 'Array of ActivityAttachment objects stored as JSON: {filename, size, type, data}';
