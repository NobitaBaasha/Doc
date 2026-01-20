import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Users, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export function TeamManagement() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: teams = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/teams"] });

  const availableUsers = users.filter(u => {
    if (user?.role === 'admin') {
      return u.id !== user.id; // Admin can add anyone else
    }
    if (user?.role === 'manager') {
      return u.role === 'employee'; // Manager can only add employees
    }
    return false;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("POST", "/api/teams", {
        name,
        description,
        memberIds: selectedMembers
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Success", description: "Team created successfully" });
      setOpen(false);
      setName("");
      setDescription("");
      setSelectedMembers([]);
    } catch (error) {
      toast({ title: "Error", description: "Failed to create team", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Teams</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>Add members to your new secure team.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Add Members</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                  {availableUsers.map((u) => (
                    <div key={u.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`user-${u.id}`} 
                        checked={selectedMembers.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedMembers([...selectedMembers, u.id]);
                          else setSelectedMembers(selectedMembers.filter(id => id !== u.id));
                        }}
                      />
                      <label htmlFor={`user-${u.id}`} className="text-sm">
                        {u.username} ({u.role})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Team</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((teamData: any) => {
          const team = teamData.teams || teamData;
          return (
            <Card key={team.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">ID: {team.id}</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{team.name}</h3>
                <p className="text-sm text-muted-foreground">{team.description}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
