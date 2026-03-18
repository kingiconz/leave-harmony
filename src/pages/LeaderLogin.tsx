import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DEPARTMENTS } from "@/lib/departments";

export default function LeaderLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        if (!department) {
          toast({ title: "Error", description: "Please select your department", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signUp(email, password, name, { role: "department_leader", department });
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
        setIsRegister(false);
      } else {
        await signIn(email, password);
        navigate("/leader/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="w-full flex justify-start">
            <Button variant="ghost" size="sm" onClick={() => navigate("/") }>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <img src="https://e-crimebureau.com/wp-content/uploads/2025/10/cropped-APPROVED-NEW-LOGO.png" alt="logo" className="mx-auto mb-4 h-24 w-24" />
          <CardDescription>
            {isRegister ? "Register as a department leader" : "Sign in to manage your team's leave requests"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Leader Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department You Lead</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="leader@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegister ? "Register" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isRegister ? (
              <>Already have an account?{" "}<button onClick={() => setIsRegister(false)} className="text-primary hover:underline">Sign in</button></>
            ) : (
              <>Don't have an account?{" "}<button onClick={() => setIsRegister(true)} className="text-primary hover:underline">Register</button></>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
