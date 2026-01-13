import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UploadDialog } from "@/components/UploadDialog";
import { LogOut, FileText, Download, Shield, User, Search, Clock } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { data: documents, isLoading, error } = useDocuments();
  const [search, setSearch] = useState("");

  const filteredDocs = documents?.filter(doc => 
    doc.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">SecureDocs</span>
          </div>

          <div className="flex items-center gap-4">
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
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-1">
              Manage and access your secure files
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search files..." 
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <UploadDialog />
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {isLoading ? (
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
                    <div className="absolute top-0 right-0 p-4 transition-opacity">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-sm" asChild>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
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
                          By User #{doc.uploadedBy}
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
