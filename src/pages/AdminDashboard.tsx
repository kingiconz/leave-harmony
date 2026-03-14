import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Clock, CheckCircle2, XCircle, LayoutDashboard, MessageSquare, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["all-leaves"],
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
    refetchInterval: 10000, // Live polling every 10s
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_comment }: { id: string; status: string; admin_comment?: string }) => {
      const updateData: Record<string, string> = { status };
      if (admin_comment !== undefined) updateData.admin_comment = admin_comment;
      const { error } = await supabase
        .from("leave_requests")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-leaves"] });
      toast({ title: "Updated!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [comments, setComments] = useState<Record<string, string>>({});

  const total = requests?.length ?? 0;
  const pending = requests?.filter((r) => r.status === "Pending").length ?? 0;
  const approved = requests?.filter((r) => r.status === "Approved").length ?? 0;
  const rejected = requests?.filter((r) => r.status === "Rejected").length ?? 0;

  const readyForHR = requests?.filter((r) => r.leader_status !== "Pending" && r.status === "Pending") ?? [];
  const pendingLeader = requests?.filter((r) => r.leader_status === "Pending") ?? [];

  const stats = [
    { label: "Total", value: total, icon: LayoutDashboard, color: "text-primary" },
    { label: "Pending HR", value: readyForHR.length, icon: Clock, color: "text-warning" },
    { label: "Approved", value: approved, icon: CheckCircle2, color: "text-success" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "text-destructive" },
  ];

  // Available years from data
  const availableYears = useMemo(() => {
    if (!requests?.length) return [String(currentYear)];
    const years = new Set(requests.map((r) => String(new Date(r.start_date).getFullYear())));
    years.add(String(currentYear));
    return Array.from(years).sort().reverse();
  }, [requests, currentYear]);

  // Monthly data for the selected year
  const monthlyData = useMemo(() => {
    if (!requests) return [];
    const year = parseInt(selectedYear);
    const filtered = requests.filter((r) => new Date(r.start_date).getFullYear() === year);
    const months: Record<number, { approved: number; pending: number; rejected: number }> = {};
    
    for (let i = 0; i < 12; i++) months[i] = { approved: 0, pending: 0, rejected: 0 };
    
    filtered.forEach((r) => {
      const m = new Date(r.start_date).getMonth();
      if (r.status === "Approved") months[m].approved++;
      else if (r.status === "Rejected") months[m].rejected++;
      else months[m].pending++;
    });

    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_NAMES[i],
      monthIndex: i,
      ...months[i],
      total: months[i].approved + months[i].pending + months[i].rejected,
    }));
  }, [requests, selectedYear]);

  // Single month detail data (daily breakdown)
  const dailyData = useMemo(() => {
    if (selectedMonth === "all" || !requests) return null;
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const filtered = requests.filter((r) => {
      const d = new Date(r.start_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Record<number, { approved: number; pending: number; rejected: number }> = {};
    for (let i = 1; i <= daysInMonth; i++) days[i] = { approved: 0, pending: 0, rejected: 0 };
    
    filtered.forEach((r) => {
      const day = new Date(r.start_date).getDate();
      if (r.status === "Approved") days[day].approved++;
      else if (r.status === "Rejected") days[day].rejected++;
      else days[day].pending++;
    });

    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1}`,
      ...days[i + 1],
      total: days[i + 1].approved + days[i + 1].pending + days[i + 1].rejected,
    }));
  }, [requests, selectedYear, selectedMonth]);

  // Department data for selected scope
  const departmentData = useMemo(() => {
    if (!requests) return [];
    const year = parseInt(selectedYear);
    let filtered = requests.filter((r) => new Date(r.start_date).getFullYear() === year);
    if (selectedMonth !== "all") {
      const month = parseInt(selectedMonth);
      filtered = filtered.filter((r) => new Date(r.start_date).getMonth() === month);
    }
    const depts: Record<string, { approved: number; pending: number; rejected: number }> = {};
    filtered.forEach((r) => {
      const profile = r.profile as any;
      const dept = profile?.department || "Unknown";
      if (!depts[dept]) depts[dept] = { approved: 0, pending: 0, rejected: 0 };
      if (r.status === "Approved") depts[dept].approved++;
      else if (r.status === "Rejected") depts[dept].rejected++;
      else depts[dept].pending++;
    });
    return Object.entries(depts).map(([name, counts]) => ({
      name,
      ...counts,
      total: counts.approved + counts.pending + counts.rejected,
    }));
  }, [requests, selectedYear, selectedMonth]);

  const chartData = dailyData || monthlyData;
  const xKey = dailyData ? "day" : "month";
  const chartTitle = selectedMonth === "all"
    ? `${selectedYear} — Yearly Overview`
    : `${MONTH_NAMES[parseInt(selectedMonth)]} ${selectedYear} — Daily Breakdown`;

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    color: "hsl(var(--foreground))",
    boxShadow: "0 8px 24px hsl(var(--foreground) / 0.1)",
    fontSize: 12,
  };

  const renderRequestTable = (data: typeof requests, showLeaderStatus: boolean, canAct: boolean) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            {showLeaderStatus && <TableHead>Leader Decision</TableHead>}
            {showLeaderStatus && <TableHead>Leader Comment</TableHead>}
            <TableHead>HR Status</TableHead>
            <TableHead>HR Comment</TableHead>
            {canAct && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((r) => {
            const profile = r.profile as any;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{profile?.name || "—"}</p>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{profile?.department || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{r.start_date}</TableCell>
                <TableCell className="whitespace-nowrap">{r.end_date}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                </TableCell>
                <TableCell className="max-w-[180px] truncate">{r.reason}</TableCell>
                {showLeaderStatus && <TableCell><StatusBadge status={r.leader_status} /></TableCell>}
                {showLeaderStatus && <TableCell className="text-sm text-muted-foreground">{r.leader_comment || "—"}</TableCell>}
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 min-w-[180px]">
                    <Input
                      placeholder="Add comment..."
                      value={comments[r.id] ?? r.admin_comment ?? ""}
                      onChange={(e) => setComments((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        const comment = comments[r.id] ?? r.admin_comment ?? "";
                        updateMutation.mutate({ id: r.id, status: r.status, admin_comment: comment });
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                {canAct && (
                  <TableCell>
                    {r.status === "Pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-success/40 text-success hover:bg-success/10"
                          onClick={() => updateMutation.mutate({ id: r.id, status: "Approved", admin_comment: comments[r.id] ?? r.admin_comment })}
                          disabled={updateMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => updateMutation.mutate({ id: r.id, status: "Rejected", admin_comment: comments[r.id] ?? r.admin_comment })}
                          disabled={updateMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-primary font-montserrat">HR Admin Dashboard</h1>

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
            <TabsTrigger value="pending">Ready for HR Review ({readyForHR.length})</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Leader ({pendingLeader.length})</TabsTrigger>
            <TabsTrigger value="all">All Requests ({total})</TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="mr-1 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display text-lg text-primary font-montserrat">Requests Ready for HR Final Decision</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : readyForHR.length > 0 ? (
                  renderRequestTable(readyForHR, true, true)
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No requests awaiting HR decision.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="awaiting">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display text-lg text-primary font-montserrat">Awaiting Department Leader Review</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : pendingLeader.length > 0 ? (
                  renderRequestTable(pendingLeader, true, false)
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No requests awaiting leader review.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="font-display text-lg text-primary font-montserrat">All Leave Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : requests && requests.length > 0 ? (
                  renderRequestTable(requests, true, true)
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No leave requests found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedMonth("all"); }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={selectedMonth === "all" ? "default" : "outline"}
                    onClick={() => setSelectedMonth("all")}
                    className="text-xs"
                  >
                    All Months
                  </Button>
                  {MONTH_NAMES.map((name, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={selectedMonth === String(i) ? "default" : "outline"}
                      onClick={() => setSelectedMonth(String(i))}
                      className="text-xs px-2"
                    >
                      {name}
                    </Button>
                  ))}
                </div>

                <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  Live
                </span>
              </div>

              {/* Main trend chart */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2 text-primary font-montserrat">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {chartTitle}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedMonth === "all" ? "Monthly leave request trends" : "Daily leave request trends"}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey={xKey}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: 12, fontSize: 13 }} />
                        <Area
                          type="monotone"
                          dataKey="approved"
                          name="Approved"
                          stroke="hsl(var(--success))"
                          strokeWidth={2.5}
                          fill="url(#gradApproved)"
                          dot={{ r: 3, fill: "hsl(var(--success))" }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="pending"
                          name="Pending"
                          stroke="hsl(var(--warning))"
                          strokeWidth={2.5}
                          fill="url(#gradPending)"
                          dot={{ r: 3, fill: "hsl(var(--warning))" }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rejected"
                          name="Rejected"
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2.5}
                          fill="url(#gradRejected)"
                          dot={{ r: 3, fill: "hsl(var(--destructive))" }}
                          activeDot={{ r: 5, strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Department breakdown */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="font-display text-lg text-primary font-montserrat">Department Breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Leave distribution by department
                    {selectedMonth !== "all" && ` — ${MONTH_NAMES[parseInt(selectedMonth)]} ${selectedYear}`}
                  </p>
                </CardHeader>
                <CardContent>
                  {departmentData.length > 0 ? (
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={departmentData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                            axisLine={{ stroke: "hsl(var(--border))" }}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: 12, fontSize: 13 }} />
                          <Line type="monotone" dataKey="approved" name="Approved" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--success))" }} />
                          <Line type="monotone" dataKey="pending" name="Pending" stroke="hsl(var(--warning))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--warning))" }} />
                          <Line type="monotone" dataKey="rejected" name="Rejected" stroke="hsl(var(--destructive))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--destructive))" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="py-8 text-center text-muted-foreground">No data for this period.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
