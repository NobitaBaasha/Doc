import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadDialog } from "@/components/UploadDialog";
import { LogOut, FileText, Download, Shield, User, Search, Clock, Eye, Activity, Trash2 } from "lucide-react";
import { AuditLogDialog } from "@/components/AuditLogDialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Document } from "@shared/schema";

import { ThemeToggle } from "@/components/theme-toggle";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: documents, isLoading, error } = useDocuments();
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const [view, setView] = useState<'documents' | 'teams'>('documents');

  const filteredDocs = (documents as Document[] | undefined)?.filter(doc => 
    doc.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleView = async (doc: Document) => {
    try {
      // For App Storage, URLs starting with /objects/ need to be fetched via proxy
      const viewUrl = doc.fileUrl.startsWith('/objects/') 
        ? `${window.location.origin}${doc.fileUrl}`
        : doc.fileUrl.replace('fl_attachment/', '');
      
      window.open(viewUrl, '_blank');
      await apiRequest("POST", `/api/documents/${doc.id}/log`, { action: 'view' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    } catch (error) {
      console.error("Failed to log view:", error);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      let downloadUrl = doc.fileUrl;
      
      if (doc.fileUrl.startsWith('/objects/')) {
        // App Storage: Use proxy endpoint
        downloadUrl = `${window.location.origin}${doc.fileUrl}`;
      } else if (doc.fileUrl.includes('res.cloudinary.com')) {
        // Cloudinary specific: add fl_attachment for forced download
        const isPdf = doc.filename.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          if (!doc.fileUrl.includes('/raw/upload/')) {
            downloadUrl = doc.fileUrl.replace('/upload/', '/upload/fl_attachment/');
          } else if (!doc.fileUrl.includes('fl_attachment')) {
            downloadUrl = doc.fileUrl.replace('/raw/upload/', '/raw/upload/fl_attachment/');
          }
        } else {
          if (!doc.fileUrl.includes('fl_attachment')) {
            downloadUrl = doc.fileUrl.replace('/upload/', '/upload/fl_attachment/');
          }
        }
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await apiRequest("POST", `/api/documents/${doc.id}/log`, { action: 'download' });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
    } catch (error) {
      console.error("Failed to log download:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/documents/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (user?.role === 'admin' || user?.role === 'manager') {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      }
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">DocVault</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
              <div className="bg-background p-1 rounded-full">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm">
                <span className="font-medium text-foreground">{user?.username}</span>
                <span className="text-muted-foreground mx-1">•</span>
                <span className="capitalize text-primary text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10">
                  {user?.role}
                </span>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant={view === 'documents' ? 'default' : 'ghost'} 
              onClick={() => setView('documents')}
              className="text-xl font-display font-bold"
            >
              Documents
            </Button>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Button 
                variant={view === 'teams' ? 'default' : 'ghost'} 
                onClick={() => setView('teams')}
                className="text-xl font-display font-bold"
              >
                Teams
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {view === 'documents' && (
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search files..." 
                  className="pl-9 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {(user?.role === "admin" || user?.role === "manager") && <AuditLogDialog />}
            {view === 'documents' && <UploadDialog />}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {view === 'teams' ? (
            <TeamManagement />
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-48 animate-pulse bg-muted/50 border-transparent" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-destructive/5 rounded-2xl border border-destructive/10">
              <Shield className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-destructive">Failed to load documents</h3>
              <p className="text-muted-foreground">Please check your connection and try again.</p>
            </div>
          ) : filteredDocs?.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
              <div className="bg-background p-4 rounded-full inline-flex mb-4 shadow-sm">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No documents found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
                {search ? "Try adjusting your search terms." : "Upload your first document to get started."}
              </p>
              {!search && <UploadDialog />}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredDocs?.map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative"
                >
                  <Card className="h-full hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 p-4 flex gap-2 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm" onClick={() => handleView(doc)} title="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm" onClick={() => handleDownload(doc)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      {(user?.role === "admin" || doc.uploadedBy === user?.id) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-sm" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the document from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(doc.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    
                    <div className="p-6 flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="bg-primary/10 p-3 rounded-xl group-hover:scale-105 transition-transform duration-300">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="font-semibold text-foreground truncate" title={doc.filename}>
                            {doc.filename}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {doc.createdAt ? format(new Date(doc.createdAt), 'MMM d, yyyy') : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="bg-secondary px-2 py-1 rounded-md">
                          ID: {doc.id}
                        </span>
                        <span>
                          By {(doc as any).uploaderName || `User #${doc.uploadedBy}`}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
