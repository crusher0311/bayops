import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/lib/authStore";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import JobBoard from "@/pages/JobBoard";
import RepairOrders from "@/pages/RepairOrders";
import RepairOrderDetail from "@/pages/RepairOrderDetail";
import NewRepairOrder from "@/pages/NewRepairOrder";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";
import Appointments from "@/pages/Appointments";
import Parts from "@/pages/Parts";
import TimeTracking from "@/pages/TimeTracking";
import Invoices from "@/pages/Invoices";
import Settings from "@/pages/Settings";
import OrganizationSettings from "@/pages/OrganizationSettings";
import MasterDashboard from "@/pages/MasterDashboard";
import Login from "@/pages/Login";

function ProtectedRouter() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== '/login') {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/master-dashboard" component={MasterDashboard} />
      <Route path="/job-board" component={JobBoard} />
      <Route path="/ros" component={RepairOrders} />
      <Route path="/ros/new" component={NewRepairOrder} />
      <Route path="/ros/:id" component={RepairOrderDetail} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/customers" component={Customers} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/parts" component={Parts} />
      <Route path="/time-tracking" component={TimeTracking} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/reports" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/org-settings" component={OrganizationSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ProtectedRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
