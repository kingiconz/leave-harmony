-- Update handle_new_user_role to include 'cce' role
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
      WHEN NEW.raw_user_meta_data->>'role' = 'cce' THEN 'cce'::app_role
      ELSE 'staff'::app_role
    END
  );
  RETURN NEW;
END;
$function$;
