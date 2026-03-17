
-- Step 1: Add 'cce' to the app_role enum and add columns
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cce';

-- Add CCE status and comment columns to leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS cce_status text NOT NULL DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS cce_comment text NOT NULL DEFAULT '';
