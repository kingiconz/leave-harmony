import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function getDisplayStatus(leaderStatus: string, hrStatus: string): string {
  // HR decision is final — if HR has decided, show that status
  if (hrStatus === "Approved" || hrStatus === "Rejected") return hrStatus;
  // Otherwise still pending HR review (regardless of leader status)
  if (leaderStatus === "Pending") return "Pending Leader Review";
  return "Pending HR Review";
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-leaves"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leave_requests").insert({
        user_id: user!.id,
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      setStartDate("");
      setEndDate("");
      setReason("");
      toast({ title: "Leave request submitted!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-primary">Staff Dashboard</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-primary">
                <Plus className="h-5 w-5 text-primary" />
                New Leave Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start Date</Label>
                  <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End Date</Label>
                  <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="Describe your reason..." rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-primary">
                <CalendarDays className="h-5 w-5 text-primary" />
                My Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : requests && requests.length > 0 ? (
                <div className="overflow-x-auto">
                  {/* Mobile card view */}
                  <div className="space-y-3 sm:hidden">
                    {requests.map((r) => {
                      const days = Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const fmt = (d: string) => {
                        const dt = new Date(d);
                        return `${dt.getFullYear().toString().slice(-2)}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                      };
                      return (
                        <div key={r.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{fmt(r.start_date)} → {fmt(r.end_date)}</span>
                            <StatusBadge status={getDisplayStatus(r.leader_status, r.status)} />
                          </div>
                          <p className="text-xs text-muted-foreground">{days} day{days > 1 ? 's' : ''} — {r.reason}</p>
                          {r.status !== "Pending" && (r as any).staff_request_decided_by && (
                            <p className="text-xs text-muted-foreground font-medium">Decided by: {(r as any).staff_request_decided_by}</p>
                          )}
                          {(r.leader_comment || r.admin_comment) && (
                            <p className="text-xs text-muted-foreground italic">
                              {r.leader_comment && `Leader: ${r.leader_comment}`}
                              {r.leader_comment && r.admin_comment && ' · '}
                              {r.admin_comment && `HR: ${r.admin_comment}`}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Desktop table view */}
                  <Table className="hidden sm:table">
                    <TableHeader>
                      <TableRow>
                         <TableHead className="text-xs">Start</TableHead>
                         <TableHead className="text-xs">End</TableHead>
                         <TableHead className="text-xs">Days</TableHead>
                         <TableHead className="text-xs">Reason</TableHead>
                         <TableHead className="text-xs">Status</TableHead>
                         <TableHead className="text-xs">Decided By</TableHead>
                         <TableHead className="text-xs">Leader</TableHead>
                         <TableHead className="text-xs">HR</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {requests.map((r) => (
                         <TableRow key={r.id}>
                           <TableCell className="whitespace-nowrap text-xs">{new Date(r.start_date).getFullYear().toString().slice(-2)}-{String(new Date(r.start_date).getMonth() + 1).padStart(2, '0')}-{String(new Date(r.start_date).getDate()).padStart(2, '0')}</TableCell>
                           <TableCell className="whitespace-nowrap text-xs">{new Date(r.end_date).getFullYear().toString().slice(-2)}-{String(new Date(r.end_date).getMonth() + 1).padStart(2, '0')}-{String(new Date(r.end_date).getDate()).padStart(2, '0')}</TableCell>
                           <TableCell className="text-xs">
                             {Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                           </TableCell>
                           <TableCell className="text-xs break-words whitespace-normal">{r.reason}</TableCell>
                           <TableCell><StatusBadge status={getDisplayStatus(r.leader_status, r.status)} /></TableCell>
                           <TableCell className="text-xs text-muted-foreground">{r.status === "Pending" ? "—" : ((r as any).staff_request_decided_by || "—")}</TableCell>
                           <TableCell className="text-xs text-muted-foreground">{r.leader_comment || "—"}</TableCell>
                           <TableCell className="text-xs text-muted-foreground">{r.admin_comment || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No leave requests yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
