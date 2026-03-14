
-- Add department_leader to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_leader';

-- Add department to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';

-- Add leader approval fields to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leader_status text NOT NULL DEFAULT 'Pending';
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leader_comment text NOT NULL DEFAULT '';
