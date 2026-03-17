
-- Allow department leaders to create their own leave requests
CREATE POLICY "Leaders can create own requests"
ON public.leave_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_department_leader());

-- Leaders should be able to view their own requests too (already covered by staff policy but let's be explicit)
-- The existing "Staff can view own requests" policy already covers this since it uses auth.uid() = user_id
