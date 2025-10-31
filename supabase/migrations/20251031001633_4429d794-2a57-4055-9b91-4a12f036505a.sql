-- Remove CloudPRNT queue table
DROP TABLE IF EXISTS cloudprnt_queue;

-- Remove CloudPRNT settings from app_settings
DELETE FROM app_settings WHERE key IN ('cloudprnt_printer_mac', 'cloudprnt_enabled');