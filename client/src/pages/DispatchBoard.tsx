import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Car, 
  User, 
  Clock, 
  ChevronRight, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Timer,
  LayoutGrid,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/authStore';
import { useToast } from '@/hooks/use-toast';

interface RepairOrder {
  id: string;
  roNumber: number;
  status: string;
  workflowId: string;
  customerId: string;
  vehicleId: string;
  advisorId: string | null;
  technicianId: string | null;
  jobs: Array<{ id: string; name: string; lineItems: any[] }>;
  notes: string;
  odometerIn: number;
  createdAt: string;
}

interface WorkflowStage {
  id: string;
  label: string;
  color: string;
  order: number;
  type: string;
  isEnabled: boolean;
}

interface Workflow {
  id: string;
  name: string;
  isDefault: boolean;
  stages: WorkflowStage[];
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  licensePlate: string | null;
}

interface User {
  id: string;
  name: string;
}

function getTimeInStage(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

function ROCard({ 
  ro, 
  customer, 
  vehicle, 
  advisor, 
  technician,
  onDragStart,
}: { 
  ro: RepairOrder; 
  customer?: Customer; 
  vehicle?: Vehicle;
  advisor?: User;
  technician?: User;
  onDragStart: (e: React.DragEvent, roId: string) => void;
}) {
  const jobCount = ro.jobs?.length || 0;
  const totalItems = ro.jobs?.reduce((sum, job) => sum + (job.lineItems?.length || 0), 0) || 0;
  
  return (
    <Link href={`/ros/${ro.id}`}>
      <Card 
        className="cursor-pointer hover:bg-slate-700/50 transition-all hover:shadow-lg border-slate-700 bg-slate-800/80"
        draggable
        onDragStart={(e) => onDragStart(e, ro.id)}
        data-testid={`ro-card-${ro.roNumber}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                RO #{ro.roNumber}
              </Badge>
              {jobCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {jobCount} job{jobCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="w-3 h-3" />
              {getTimeInStage(ro.createdAt)}
            </div>
          </div>
          
          {vehicle && (
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Car className="w-4 h-4 text-blue-400" />
              {vehicle.year} {vehicle.make} {vehicle.model}
            </div>
          )}
          
          {customer && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <User className="w-3 h-3" />
              {customer.firstName} {customer.lastName}
              {customer.phone && <span className="text-slate-500">• {customer.phone}</span>}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-slate-700">
            <div className="flex items-center gap-3">
              {advisor && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-500">SA:</span> {advisor.name.split(' ')[0]}
                </span>
              )}
              {technician && (
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {technician.name.split(' ')[0]}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StageColumn({
  stage,
  repairOrders,
  customers,
  vehicles,
  users,
  onDragOver,
  onDrop,
  onDragStart,
  isDragTarget,
}: {
  stage: WorkflowStage;
  repairOrders: RepairOrder[];
  customers: Map<string, Customer>;
  vehicles: Map<string, Vehicle>;
  users: Map<string, User>;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, roId: string) => void;
  isDragTarget: boolean;
}) {
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-80 rounded-lg transition-all",
        isDragTarget && "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900"
      )}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
      data-testid={`stage-column-${stage.id}`}
    >
      <div 
        className="rounded-t-lg px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: stage.color }}
      >
        <h3 className="font-semibold text-white text-sm">
          {stage.label}
        </h3>
        <Badge 
          variant="secondary" 
          className="bg-white/20 text-white border-0"
        >
          {repairOrders.length}
        </Badge>
      </div>
      
      <ScrollArea className="h-[calc(100vh-240px)] bg-slate-800/30 rounded-b-lg border border-slate-700 border-t-0">
        <div className="p-3 space-y-3">
          {repairOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <LayoutGrid className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No repair orders</p>
            </div>
          ) : (
            repairOrders.map(ro => (
              <ROCard
                key={ro.id}
                ro={ro}
                customer={customers.get(ro.customerId)}
                vehicle={vehicles.get(ro.vehicleId)}
                advisor={ro.advisorId ? users.get(ro.advisorId) : undefined}
                technician={ro.technicianId ? users.get(ro.technicianId) : undefined}
                onDragStart={onDragStart}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function DispatchBoard() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [draggedRO, setDraggedRO] = useState<string | null>(null);
  const [dragTargetStage, setDragTargetStage] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch workflows');
      return res.json() as Promise<Workflow[]>;
    },
  });

  const { data: repairOrders = [], isLoading: rosLoading, refetch: refetchROs } = useQuery({
    queryKey: ['repair-orders'],
    queryFn: async () => {
      const res = await fetch('/api/repair-orders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch repair orders');
      return res.json() as Promise<RepairOrder[]>;
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<Customer[]>;
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<Vehicle[]>;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<User[]>;
    },
  });

  useEffect(() => {
    if (workflows.length > 0 && !selectedWorkflowId) {
      const defaultWorkflow = workflows.find(w => w.isDefault) || workflows[0];
      setSelectedWorkflowId(defaultWorkflow.id);
    }
  }, [workflows, selectedWorkflowId]);

  const updateROMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/repair-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update repair order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      toast({ title: 'Status updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);
  const stages = selectedWorkflow?.stages?.filter(s => s.isEnabled).sort((a, b) => a.order - b.order) || [];
  
  const customerMap = new Map(customers.map(c => [c.id, c]));
  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
  const userMap = new Map(users.map(u => [u.id, u]));

  const filteredROs = repairOrders.filter(ro => ro.workflowId === selectedWorkflowId);

  const handleDragStart = (e: React.DragEvent, roId: string) => {
    setDraggedRO(roId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (stageId: string) => {
    setDragTargetStage(stageId);
  };

  const handleDragLeave = () => {
    setDragTargetStage(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragTargetStage(null);
    
    if (draggedRO) {
      const ro = repairOrders.find(r => r.id === draggedRO);
      if (ro && ro.status !== stageId) {
        updateROMutation.mutate({ id: draggedRO, status: stageId });
      }
    }
    setDraggedRO(null);
  };

  const isLoading = workflowsLoading || rosLoading;

  const totalStats = {
    total: filteredROs.length,
    inProgress: filteredROs.filter(ro => ro.status === 'in-progress').length,
    waiting: filteredROs.filter(ro => ro.status === 'waiting-approval' || ro.status === 'waiting-parts').length,
    completed: filteredROs.filter(ro => ro.status === 'completed' || ro.status === 'ready-for-pickup').length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-slate-700" data-testid="button-back-home">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Dispatch Board</h1>
          
          <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
            <SelectTrigger className="w-[200px]" data-testid="select-workflow">
              <SelectValue placeholder="Select workflow" />
            </SelectTrigger>
            <SelectContent>
              {workflows.map(wf => (
                <SelectItem key={wf.id} value={wf.id}>
                  {wf.name} {wf.isDefault && '(Default)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">In Progress:</span>
              <span className="font-semibold">{totalStats.inProgress}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Waiting:</span>
              <span className="font-semibold">{totalStats.waiting}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Ready/Done:</span>
              <span className="font-semibold">{totalStats.completed}</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchROs()}
            className="gap-2"
            data-testid="button-refresh"
          >
            <RefreshCw className={cn("w-4 h-4", rosLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading dispatch board...</p>
            </div>
          </div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Workflow Selected</h3>
              <p className="text-muted-foreground">Select a workflow to view the dispatch board.</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-x-auto">
            <div 
              className="flex gap-4 pb-4 min-w-max"
              onDragLeave={handleDragLeave}
            >
              {stages.map(stage => (
                <div 
                  key={stage.id}
                  onDragEnter={() => handleDragEnter(stage.id)}
                >
                  <StageColumn
                    stage={stage}
                    repairOrders={filteredROs.filter(ro => ro.status === stage.id)}
                    customers={customerMap}
                    vehicles={vehicleMap}
                    users={userMap}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragStart={handleDragStart}
                    isDragTarget={dragTargetStage === stage.id}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
