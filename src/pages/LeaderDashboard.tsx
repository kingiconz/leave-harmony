import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Clock, CheckCircle2, XCircle, LayoutDashboard, MessageSquare, Plus, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function getDisplayStatus(cceStatus: string): string {
  if (cceStatus === "N/A" || cceStatus === "Pending") return "Pending CCE Review";
  return cceStatus;
}

export default function LeaderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Leave request form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  // Team requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["leader-leaves"],
    queryFn: async () => {
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

  // My own leave requests
  const { data: myRequests, isLoading: myLoading } = useQuery({
    queryKey: ["leader-my-leaves"],
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
      queryClient.invalidateQueries({ queryKey: ["leader-my-leaves"] });
      setStartDate("");
      setEndDate("");
      setReason("");
      toast({ title: "Leave request submitted!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, leader_status, leader_comment }: { id: string; leader_status: string; leader_comment?: string }) => {
      const updateData: Record<string, string> = { leader_status };
      if (leader_comment !== undefined) updateData.leader_comment = leader_comment;
      // When leader approves/rejects, also set final status and track who decided
      if (leader_status === "Approved" || leader_status === "Rejected") {
        updateData.status = leader_status;
        updateData.staff_request_decided_by = "Department Leader";
      }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const [comments, setComments] = useState<Record<string, string>>({});

  // Filter out own requests from team view
  const teamRequests = requests?.filter((r) => r.user_id !== user?.id) ?? [];
  const total = teamRequests.length;
  const pending = teamRequests.filter((r) => r.leader_status === "Pending").length;
  const approved = teamRequests.filter((r) => r.leader_status === "Approved").length;
  const rejected = teamRequests.filter((r) => r.leader_status === "Rejected").length;

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

  const renderTeamTable = (data: typeof teamRequests) => (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table className="text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead className="hidden sm:table-cell">Days</TableHead>
            <TableHead className="hidden md:table-cell">Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Decided By</TableHead>
            <TableHead className="hidden sm:table-cell">Comment</TableHead>
            <TableHead className="hidden sm:table-cell">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => {
            const profile = r.profile as any;
            const days = Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{profile?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{days}d</p>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(r.start_date)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(r.end_date)}</TableCell>
                <TableCell className="hidden sm:table-cell">{days}</TableCell>
                <TableCell className="hidden md:table-cell text-sm break-words whitespace-normal">{r.reason}</TableCell>
                <TableCell><StatusBadge status={r.leader_status} /></TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {r.leader_status === "Pending" ? "—" : ((r as any).staff_request_decided_by || "—")}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1 min-w-[120px]">
                    <Input
                      placeholder="Comment..."
                      value={comments[r.id] ?? r.leader_comment ?? ""}
                      onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Button size="sm" variant="ghost" className="h-8 px-2" disabled={updateMutation.isPending}
                      onClick={() => {
                        const comment = comments[r.id] ?? r.leader_comment ?? "";
                        updateMutation.mutate({ id: r.id, leader_status: r.leader_status, leader_comment: comment });
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {r.leader_status === "Pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-success/40 text-success hover:bg-success/10"
                        onClick={() => updateMutation.mutate({ id: r.id, leader_status: "Approved", leader_comment: comments[r.id] ?? r.leader_comment })}
                        disabled={updateMutation.isPending}
                      >Approve</Button>
                      <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => updateMutation.mutate({ id: r.id, leader_status: "Rejected", leader_comment: comments[r.id] ?? r.leader_comment })}
                        disabled={updateMutation.isPending}
                      >Reject</Button>
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
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-primary font-montserrat">Department Leader Dashboard</h1>

        {/* Mobile */}
        <div className="block sm:hidden">
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="my-leave">
              <AccordionTrigger>My Leave Request</AccordionTrigger>
              <AccordionContent>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                      <Plus className="h-4 w-4" /> New Leave Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="m-start" className="text-xs">Start Date</Label>
                        <Input id="m-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="m-end" className="text-xs">End Date</Label>
                        <Input id="m-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="m-reason" className="text-xs">Reason</Label>
                        <Textarea id="m-reason" value={reason} onChange={(e) => setReason(e.target.value)} required rows={2} className="text-sm" />
                      </div>
                      <Button type="submit" className="w-full" size="sm" disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                      </Button>
                    </form>

                    {myLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                    ) : myRequests && myRequests.length > 0 ? (
                      <div className="mt-4 overflow-x-auto -mx-4">
                        <Table className="text-xs">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Start</TableHead>
                              <TableHead>End</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {myRequests.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="whitespace-nowrap">{formatDate(r.start_date)}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatDate(r.end_date)}</TableCell>
                                <TableCell><StatusBadge status={getDisplayStatus(r.cce_status)} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </AccordionContent>
            </AccordionItem>
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
            <AccordionItem value="requests">
              <AccordionTrigger>Team Leave Requests ({total})</AccordionTrigger>
              <AccordionContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : teamRequests.length > 0 ? renderTeamTable(teamRequests) : (
                  <p className="py-8 text-center text-muted-foreground">No leave requests from your department.</p>
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

          <Tabs defaultValue="team" className="space-y-4">
            <TabsList>
              <TabsTrigger value="team">Team Requests ({total})</TabsTrigger>
              <TabsTrigger value="my-leave">My Leave</TabsTrigger>
            </TabsList>

            <TabsContent value="team">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-primary font-montserrat">Team Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : teamRequests.length > 0 ? renderTeamTable(teamRequests) : (
                    <p className="py-8 text-center text-muted-foreground">No leave requests from your department.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="my-leave">
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
                    {myLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : myRequests && myRequests.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Start</TableHead>
                              <TableHead>End</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead className="hidden sm:table-cell">Reason</TableHead>
                              <TableHead>CCE Status</TableHead>
                              <TableHead className="hidden sm:table-cell">Decided By</TableHead>
                              <TableHead className="hidden sm:table-cell">CCE Comment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {myRequests.map((r) => (
                              <TableRow key={r.id}>
                                <TableCell className="whitespace-nowrap">{formatDate(r.start_date)}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatDate(r.end_date)}</TableCell>
                                <TableCell>{Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}</TableCell>
                                <TableCell className="hidden sm:table-cell text-sm break-words whitespace-normal">{r.reason}</TableCell>
                                <TableCell><StatusBadge status={getDisplayStatus(r.cce_status)} /></TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                  {(r.cce_status === "N/A" || r.cce_status === "Pending") ? "—" : (r as any).leader_request_decided_by || "—"}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{r.cce_comment || "—"}</TableCell>
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
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
