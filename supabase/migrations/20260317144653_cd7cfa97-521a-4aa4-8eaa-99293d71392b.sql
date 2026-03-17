
-- Create is_cce() helper function
CREATE OR REPLACE FUNCTION public.is_cce()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'cce'
  )
$$;

-- CCE can view all leave requests
CREATE POLICY "CCE can view all requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (is_cce());

-- CCE can update leave requests
CREATE POLICY "CCE can update requests"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (is_cce());

-- CCE can view all profiles
CREATE POLICY "CCE can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_cce());

-- CCE can view all roles
CREATE POLICY "CCE can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_cce());
