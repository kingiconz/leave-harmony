import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requiredRole: "staff" | "admin" | "department_leader";
}

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
    const loginPath = requiredRole === "department_leader" ? "/leader/login" : `/${requiredRole}/login`;
    return <Navigate to={loginPath} replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== requiredRole) {
    const dashboardPath = role === "department_leader" ? "/leader/dashboard" : `/${role}/dashboard`;
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
}
