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
import Reports from "@/pages/Reports";
import Inspections from "@/pages/Inspections";
import InspectionReport from "@/pages/InspectionReport";
import Settings from "@/pages/Settings";
import OrganizationSettings from "@/pages/OrganizationSettings";
import MasterDashboard from "@/pages/MasterDashboard";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import QuickCheckIn from "@/pages/QuickCheckIn";
import CustomerAuthorization from "@/pages/CustomerAuthorization";
import SelfCheckIn from "@/pages/SelfCheckIn";
import ServiceQueue from "@/pages/ServiceQueue";
import DispatchBoard from "@/pages/DispatchBoard";
import PrintRO from "@/pages/PrintRO";
import PrintInvoice from "@/pages/PrintInvoice";
import Messages from "@/pages/Messages";
import ProtractorMigration from "@/pages/ProtractorMigration";

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
        <Route path="/signup" component={Signup} />
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
      <Route path="/dispatch" component={DispatchBoard} />
      <Route path="/ros" component={RepairOrders} />
      <Route path="/ros/new" component={NewRepairOrder} />
      <Route path="/quick-checkin" component={QuickCheckIn} />
      <Route path="/ros/:id" component={RepairOrderDetail} />
      <Route path="/ros/:id/print" component={PrintRO} />
      <Route path="/ros/:id/invoice" component={PrintInvoice} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/customers" component={Customers} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/parts" component={Parts} />
      <Route path="/time-tracking" component={TimeTracking} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/reports" component={Reports} />
      <Route path="/inspections" component={Inspections} />
      <Route path="/messages" component={Messages} />
      <Route path="/service-queue" component={ServiceQueue} />
      <Route path="/settings" component={Settings} />
      <Route path="/org-settings" component={OrganizationSettings} />
      <Route path="/import/protractor" component={ProtractorMigration} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/inspection/:token" component={InspectionReport} />
          <Route path="/authorize/:token" component={CustomerAuthorization} />
          <Route path="/checkin/:locationId/:token" component={SelfCheckIn} />
          <Route path="/signup" component={Signup} />
          <Route component={ProtectedRouter} />
        </Switch>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
