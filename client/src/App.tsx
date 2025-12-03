import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/Dashboard";
import JobBoard from "@/pages/JobBoard";
import RepairOrders from "@/pages/RepairOrders";
import RepairOrderDetail from "@/pages/RepairOrderDetail";
import Inventory from "@/pages/Inventory";
import Customers from "@/pages/Customers";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/job-board" component={JobBoard} />
      <Route path="/ros" component={RepairOrders} />
      <Route path="/ros/:id" component={RepairOrderDetail} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/customers" component={Customers} />
      <Route path="/reports" component={Dashboard} /> {/* Placeholder for now */}
      <Route path="/settings" component={Dashboard} /> {/* Placeholder for now */}
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
