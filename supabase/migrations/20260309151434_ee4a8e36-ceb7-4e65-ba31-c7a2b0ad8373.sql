
-- Create is_department_leader function
CREATE OR REPLACE FUNCTION public.is_department_leader()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(auth.uid(), 'department_leader') $$;

-- Create function to get leader's department
CREATE OR REPLACE FUNCTION public.get_user_department(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT department FROM public.profiles WHERE user_id = p_user_id LIMIT 1 $$;

-- Update handle_new_user to include department
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, department)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, COALESCE(NEW.raw_user_meta_data->>'department', ''));
  RETURN NEW;
END;
$function$;

-- Update handle_new_user_role to handle department_leader
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::app_role
      WHEN NEW.raw_user_meta_data->>'role' = 'department_leader' THEN 'department_leader'::app_role
      ELSE 'staff'::app_role
    END
  );
  RETURN NEW;
END;
$function$;

-- RLS: Department leaders can view requests from their department members
CREATE POLICY "Leaders can view department requests"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  is_department_leader() AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = leave_requests.user_id
    AND p.department = public.get_user_department(auth.uid())
  )
);

-- RLS: Department leaders can update requests (leader_status, leader_comment)
CREATE POLICY "Leaders can update department requests"
ON public.leave_requests FOR UPDATE TO authenticated
USING (
  is_department_leader() AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = leave_requests.user_id
    AND p.department = public.get_user_department(auth.uid())
  )
);

-- RLS: Department leaders can view profiles in their department
CREATE POLICY "Leaders can view department profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  is_department_leader() AND
  department = public.get_user_department(auth.uid())
);

-- RLS: Department leaders can view roles of their department members
CREATE POLICY "Leaders can view department member roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  is_department_leader() AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
    AND p.department = public.get_user_department(auth.uid())
  )
);
