import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Clock, CheckCircle2, XCircle, LayoutDashboard, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CCEDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});

  // Fetch all leave requests made by department leaders
  const { data: leaderRequests, isLoading } = useQuery({
    queryKey: ["cce-leader-leaves"],
    queryFn: async () => {
      // Get all user_ids with department_leader role
      const { data: leaderRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "department_leader");
      if (rolesError) throw rolesError;

      const leaderIds = leaderRoles.map((r) => r.user_id);
      if (leaderIds.length === 0) return [];

      const { data: leaves, error: leavesError } = await supabase
        .from("leave_requests")
        .select("*")
        .in("user_id", leaderIds)
        .order("created_at", { ascending: false });
      if (leavesError) throw leavesError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, department")
        .in("user_id", leaderIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
      return leaves.map((l) => ({ ...l, profile: profileMap.get(l.user_id) || null }));
    },
    refetchInterval: 10000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, cce_status, cce_comment }: { id: string; cce_status: string; cce_comment?: string }) => {
      const updateData: Record<string, string> = { cce_status };
      if (cce_comment !== undefined) updateData.cce_comment = cce_comment;
      const { error } = await supabase
        .from("leave_requests")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cce-leader-leaves"] });
      toast({ title: "Updated!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const total = leaderRequests?.length ?? 0;
  const pending = leaderRequests?.filter((r) => r.cce_status === "Pending" || r.cce_status === "N/A").length ?? 0;
  const approved = leaderRequests?.filter((r) => r.cce_status === "Approved").length ?? 0;
  const rejected = leaderRequests?.filter((r) => r.cce_status === "Rejected").length ?? 0;

  const pendingRequests = leaderRequests?.filter((r) => r.cce_status === "Pending" || r.cce_status === "N/A") ?? [];
  const reviewedRequests = leaderRequests?.filter((r) => r.cce_status === "Approved" || r.cce_status === "Rejected") ?? [];

  const stats = [
    { label: "Total", value: total, icon: LayoutDashboard, color: "text-primary" },
    { label: "Pending", value: pending, icon: Clock, color: "text-warning" },
    { label: "Approved", value: approved, icon: CheckCircle2, color: "text-success" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "text-destructive" },
  ];

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear().toString().slice(-2)}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const renderTable = (data: typeof leaderRequests, canAct: boolean) => (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Leader</TableHead>
            <TableHead className="hidden sm:table-cell">Department</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead className="hidden sm:table-cell">Days</TableHead>
            <TableHead className="hidden md:table-cell">Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Comment</TableHead>
            {canAct && <TableHead className="hidden sm:table-cell">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((r) => {
            const profile = r.profile as any;
            const days = Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{profile?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{profile?.department || "—"} · {days}d</p>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell whitespace-nowrap">{profile?.department || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(r.start_date)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(r.end_date)}</TableCell>
                <TableCell className="hidden sm:table-cell">{days}</TableCell>
                <TableCell className="hidden md:table-cell text-sm break-words whitespace-normal">{r.reason}</TableCell>
                <TableCell><StatusBadge status={r.cce_status === "N/A" ? "Pending" : r.cce_status} /></TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      placeholder="Comment..."
                      value={comments[r.id] ?? r.cce_comment ?? ""}
                      onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2" disabled={updateMutation.isPending}
                      onClick={() => {
                        const comment = comments[r.id] ?? r.cce_comment ?? "";
                        updateMutation.mutate({ id: r.id, cce_status: r.cce_status === "N/A" ? "Pending" : r.cce_status, cce_comment: comment });
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                {canAct && (
                  <TableCell className="hidden sm:table-cell">
                    {(r.cce_status === "Pending" || r.cce_status === "N/A") ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10"
                          onClick={() => updateMutation.mutate({ id: r.id, cce_status: "Approved", cce_comment: comments[r.id] ?? r.cce_comment })}
                          disabled={updateMutation.isPending}
                        >Approve</Button>
                        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => updateMutation.mutate({ id: r.id, cce_status: "Rejected", cce_comment: comments[r.id] ?? r.cce_comment })}
                          disabled={updateMutation.isPending}
                        >Reject</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Reviewed</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-primary font-montserrat">CCE Dashboard</h1>

        {/* Mobile */}
        <div className="block sm:hidden">
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="stats">
              <AccordionTrigger>Overview</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3">
                  {stats.map((s) => (
                    <Card key={s.label}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <s.icon className={`h-6 w-6 ${s.color}`} />
                        <div>
                          <p className="text-xl font-bold text-foreground">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pending">
              <AccordionTrigger>Pending ({pending})</AccordionTrigger>
              <AccordionContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : pendingRequests.length > 0 ? renderTable(pendingRequests, true) : (
                  <p className="py-8 text-center text-muted-foreground">No pending leader requests.</p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="reviewed">
              <AccordionTrigger>Reviewed ({reviewedRequests.length})</AccordionTrigger>
              <AccordionContent>
                {reviewedRequests.length > 0 ? renderTable(reviewedRequests, false) : (
                  <p className="py-8 text-center text-muted-foreground">No reviewed requests.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Desktop */}
        <div className="hidden sm:block">
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

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending Review ({pending})</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed ({reviewedRequests.length})</TabsTrigger>
              <TabsTrigger value="all">All ({total})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader><CardTitle className="font-display text-lg text-primary font-montserrat">Leader Leave Requests — Pending CCE Decision</CardTitle></CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : pendingRequests.length > 0 ? renderTable(pendingRequests, true) : (
                    <p className="py-8 text-center text-muted-foreground">No pending leader requests.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviewed">
              <Card>
                <CardHeader><CardTitle className="font-display text-lg text-primary font-montserrat">Reviewed Leader Requests</CardTitle></CardHeader>
                <CardContent>
                  {reviewedRequests.length > 0 ? renderTable(reviewedRequests, false) : (
                    <p className="py-8 text-center text-muted-foreground">No reviewed requests yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <Card>
                <CardHeader><CardTitle className="font-display text-lg text-primary font-montserrat">All Leader Leave Requests</CardTitle></CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : total > 0 ? renderTable(leaderRequests, true) : (
                    <p className="py-8 text-center text-muted-foreground">No leader leave requests.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
