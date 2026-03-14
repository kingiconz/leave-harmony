import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Clock, CheckCircle2, XCircle, LayoutDashboard, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function LeaderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["leader-leaves"],
    queryFn: async () => {
      // Leader can only see their department's requests via RLS
      const { data: leaves, error: leavesError } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (leavesError) throw leavesError;

      const userIds = [...new Set(leaves.map((l) => l.user_id))];
      if (userIds.length === 0) return [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, department")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
      return leaves.map((l) => ({ ...l, profile: profileMap.get(l.user_id) || null }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, leader_status, leader_comment }: { id: string; leader_status: string; leader_comment?: string }) => {
      const updateData: Record<string, string> = { leader_status };
      if (leader_comment !== undefined) updateData.leader_comment = leader_comment;
      const { error } = await supabase
        .from("leave_requests")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leader-leaves"] });
      toast({ title: "Updated!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [comments, setComments] = useState<Record<string, string>>({});

  const total = requests?.length ?? 0;
  const pending = requests?.filter((r) => r.leader_status === "Pending").length ?? 0;
  const approved = requests?.filter((r) => r.leader_status === "Approved").length ?? 0;
  const rejected = requests?.filter((r) => r.leader_status === "Rejected").length ?? 0;

  const stats = [
    { label: "Total", value: total, icon: LayoutDashboard, color: "text-primary" },
    { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
    { label: "Approved", value: approved, icon: CheckCircle2, color: "text-success" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-primary">Department Leader Dashboard</h1>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="animate-fade-in">
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="font-display text-lg text-primary">Team Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : requests && requests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {requests.map((r) => {
                      const profile = r.profile as any;
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{profile?.name || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{new Date(r.start_date).getFullYear().toString().slice(-2)}-{String(new Date(r.start_date).getMonth() + 1).padStart(2, '0')}-{String(new Date(r.start_date).getDate()).padStart(2, '0')}</TableCell>
                          <TableCell className="whitespace-nowrap">{new Date(r.end_date).getFullYear().toString().slice(-2)}-{String(new Date(r.end_date).getMonth() + 1).padStart(2, '0')}-{String(new Date(r.end_date).getDate()).padStart(2, '0')}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate">{r.reason}</TableCell>
                          <TableCell><StatusBadge status={r.leader_status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 min-w-[120px]">
                              <Input
                                placeholder="Add comment..."
                                value={comments[r.id] ?? r.leader_comment ?? ""}
                                onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                className="h-8 text-xs"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                disabled={updateMutation.isPending}
                                onClick={() => {
                                  const comment = comments[r.id] ?? r.leader_comment ?? "";
                                  updateMutation.mutate({ id: r.id, leader_status: r.leader_status, leader_comment: comment });
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {r.leader_status === "Pending" ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-success/40 text-success hover:bg-success/10"
                                  onClick={() => updateMutation.mutate({ id: r.id, leader_status: "Approved", leader_comment: comments[r.id] ?? r.leader_comment })}
                                  disabled={updateMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                  onClick={() => updateMutation.mutate({ id: r.id, leader_status: "Rejected", leader_comment: comments[r.id] ?? r.leader_comment })}
                                  disabled={updateMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Reviewed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
              <p className="py-8 text-center text-muted-foreground">No leave requests from your department.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
