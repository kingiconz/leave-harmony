import { Badge } from "@/components/ui/badge";

const variants: Record<string, string> = {
  Pending: "bg-warning/15 text-warning border-warning/30",
  Approved: "bg-success/15 text-success border-success/30",
  Rejected: "bg-destructive/15 text-destructive border-destructive/30",
  "Pending Leader Review": "bg-warning/15 text-warning border-warning/30",
  "Pending HR Review": "bg-primary/15 text-primary border-primary/30",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`font-medium whitespace-nowrap ${variants[status] ?? ""}`}>
      {status}
    </Badge>
  );
}
