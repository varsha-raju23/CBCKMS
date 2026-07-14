-- ================================================================
-- TunnelKMS — Migration: Add Password Reset Columns to Users Table
-- Run this once in your Azure SQL database
-- ================================================================

-- Add resetPasswordToken column (stores the secure reset token)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = 'resetPasswordToken'
    AND Object_ID = Object_ID('Users')
)
BEGIN
    ALTER TABLE Users
    ADD resetPasswordToken NVARCHAR(255) NULL;
    PRINT 'Added resetPasswordToken column to Users table.';
END
ELSE
BEGIN
    PRINT 'resetPasswordToken column already exists.';
END

-- Add resetPasswordExpires column (token expiry timestamp)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE Name = 'resetPasswordExpires'
    AND Object_ID = Object_ID('Users')
)
BEGIN
    ALTER TABLE Users
    ADD resetPasswordExpires DATETIME2 NULL;
    PRINT 'Added resetPasswordExpires column to Users table.';
END
ELSE
BEGIN
    PRINT 'resetPasswordExpires column already exists.';
END

PRINT 'Migration complete!';
