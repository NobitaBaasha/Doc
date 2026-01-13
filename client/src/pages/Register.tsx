import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";
import { Link } from "wouter";
import { UserPlus, Loader2 } from "lucide-react";
import { z } from "zod";
import { motion } from "framer-motion";

const registerSchema = api.auth.register.input;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { register } = useAuth();
  
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "employee" // Default role
    }
  });

  const onSubmit = (data: RegisterForm) => {
    register.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            Create Account
          </h1>
          <p className="text-muted-foreground mt-2">
            Join SecureDocs Organization
          </p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-black/5 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Create a new account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="Choose a username" 
                  {...form.register("username")}
                  className={form.formState.errors.username ? "border-destructive focus-visible:ring-destructive/30" : ""}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Choose a strong password" 
                  {...form.register("password")}
                  className={form.formState.errors.password ? "border-destructive focus-visible:ring-destructive/30" : ""}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Controller
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  Admins can see all documents. Employees only see their own.
                </p>
              </div>

              {register.isError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {register.error?.message}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 text-base" 
                disabled={register.isPending}
              >
                {register.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
