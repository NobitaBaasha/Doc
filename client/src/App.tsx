import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user, isLoading } = useAuth();

  // Handle redirects for authenticated users visiting auth pages
  if (!isLoading && user) {
    return (
      <Switch>
        <Route path="/login"><Redirect to="/dashboard" /></Route>
        <Route path="/register"><Redirect to="/dashboard" /></Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/">
        {/* If not logged in, go to login. If logged in, dashboard. */}
        <Redirect to="/login" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
