import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requiredRole: "staff" | "admin" | "department_leader" | "cce";
}

const loginPaths: Record<string, string> = {
  staff: "/staff/login",
  admin: "/admin/login",
  department_leader: "/leader/login",
  cce: "/cce/login",
};

const dashboardPaths: Record<string, string> = {
  staff: "/staff/dashboard",
  admin: "/admin/dashboard",
  department_leader: "/leader/dashboard",
  cce: "/cce/dashboard",
};

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={loginPaths[requiredRole] || "/staff/login"} replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== requiredRole) {
    return <Navigate to={dashboardPaths[role] || "/staff/dashboard"} replace />;
  }

  return <>{children}</>;
}
