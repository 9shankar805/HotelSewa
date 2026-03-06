-- Migration script to add missing columns to existing hotelsewa database
-- This preserves existing data while adding new required fields

USE hotelsewa;

-- Add missing columns to hotels table with default values
ALTER TABLE hotels 
  ADD COLUMN IF NOT EXISTS city VARCHAR(191) DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS state VARCHAR(191) DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(191) DEFAULT '000000',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(191) DEFAULT '0000000000',
  ADD COLUMN IF NOT EXISTS email VARCHAR(191) DEFAULT 'noemail@example.com';

-- Update defaults to NOT NULL after adding
ALTER TABLE hotels 
  MODIFY COLUMN city VARCHAR(191) NOT NULL,
  MODIFY COLUMN state VARCHAR(191) NOT NULL,
  MODIFY COLUMN pincode VARCHAR(191) NOT NULL,
  MODIFY COLUMN phone VARCHAR(191) NOT NULL,
  MODIFY COLUMN email VARCHAR(191) NOT NULL;

SELECT 'Migration completed successfully!' AS Status;
