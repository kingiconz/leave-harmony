import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <nav className="border-b border-border bg-card">
      <div className="flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.ico" alt="logo" className="h-14 w-14" />
          <span className="font-montserrat text-2xl font-bold text-primary">
            LeaveTrack
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-montserrat text-sm text-muted-foreground">{user.user_metadata?.name || user.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
