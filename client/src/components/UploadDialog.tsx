import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUploadDocument } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("employee");
  const { user } = useAuth();
  const upload = useUploadDocument();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    
    // We append allowedRoles. For this simple app, we can just allow the role selected
    // In a more complex app, this might be a multi-select
    // Always allow admin to see it + the selected target role
    const roles = ["admin"];
    if (targetRole === "employee" && !roles.includes("employee")) {
      roles.push("employee");
    }
    
    // Append as JSON string or individual fields depending on backend expectation
    // Based on schema `text("allowed_roles").array()`, backend likely expects array
    // Since we can't send array in FormData easily without convention, 
    // let's send it as JSON string if backend parses it, or multiple entries
    // Implementation Note 2 says: "Append allowedRoles as a JSON string or multiple values"
    formData.append("allowedRoles", JSON.stringify(roles));

    try {
      await upload.mutateAsync(formData);
      if (user?.role === 'admin') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      }
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      setOpen(false);
      setFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a file to the secure cloud storage.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}>
              <Input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                required
              />
              
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-sm font-medium text-foreground">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="bg-muted p-3 rounded-full">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium text-foreground">Click to select file</div>
                  <div className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG up to 10MB</div>
                </label>
              )}
            </div>

            {user?.role === "admin" && (
              <div className="space-y-2">
                <Label>Who can view this?</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">All Employees & Admins</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!file || upload.isPending}>
              {upload.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload File"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
