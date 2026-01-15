import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Clock, User, Info } from "lucide-react";
import { format } from "date-fns";
import { AuditLog } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AuditLogDialog() {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/logs"],
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Activity className="h-4 w-4" />
          Activity Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            System Activity Log
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 p-6 pt-4">
          <ScrollArea className="h-full border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No activity logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">
                        {log.timestamp ? format(new Date(log.timestamp), "MMM d, HH:mm:ss") : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium text-sm">{log.username || "System"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground ml-5">
                            UID: {log.userId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.action === 'login' ? 'bg-green-100 text-green-700' :
                          log.action === 'upload' ? 'bg-blue-100 text-blue-700' :
                          log.action === 'delete' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.documentName || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
