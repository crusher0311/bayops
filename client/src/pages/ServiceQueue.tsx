import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLocations } from '@/lib/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Loader2, 
  Clock, 
  Wrench, 
  CheckCircle2,
  User,
  Car,
  Phone,
  Play,
  Trash2,
  MoveRight,
  Timer,
  QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';

interface ServiceQueueEntry {
  id: string;
  locationId: string;
  customerId?: string;
  vehicleId?: string;
  customerName?: string;
  vehicleInfo?: string;
  phone?: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETE';
  checkInTime: string;
  startTime?: string;
  completedTime?: string;
  estimatedMinutes?: number;
  serviceDescription?: string;
  notes?: string;
  assignedBayId?: string;
  assignedTechId?: string;
  repairOrderId?: string;
  position: number;
  checkInSource: 'WALK_IN' | 'APPOINTMENT' | 'QR_CHECKIN' | 'PHONE';
}

export default function ServiceQueue() {
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const { data: queueEntries = [], isLoading: queueLoading, refetch } = useQuery<ServiceQueueEntry[]>({
    queryKey: ['service-queue', selectedLocationId],
    queryFn: () => apiRequest(`/api/locations/${selectedLocationId}/service-queue`),
    enabled: !!selectedLocationId,
    refetchInterval: 30000,
  });

  const { data: serviceBays = [] } = useQuery<any[]>({
    queryKey: ['service-bays', selectedLocationId],
    queryFn: () => apiRequest(`/api/locations/${selectedLocationId}/service-bays`),
    enabled: !!selectedLocationId,
  });

  const { data: technicians = [] } = useQuery<any[]>({
    queryKey: ['technicians', selectedLocationId],
    queryFn: () => apiRequest(`/api/locations/${selectedLocationId}/technicians`),
    enabled: !!selectedLocationId,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => apiRequest('/api/customers'),
    staleTime: 60000,
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/locations/${selectedLocationId}/service-queue`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: 'Customer added to queue' });
      queryClient.invalidateQueries({ queryKey: ['service-queue', selectedLocationId] });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/service-queue/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-queue', selectedLocationId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/service-queue/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Entry removed from queue' });
      queryClient.invalidateQueries({ queryKey: ['service-queue', selectedLocationId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const startServiceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/service-queue/${id}/start-service`, {
      method: 'POST',
    }),
    onSuccess: (data: any) => {
      toast({ title: 'Service started', description: data.repairOrder ? 'Repair order created' : undefined });
      queryClient.invalidateQueries({ queryKey: ['service-queue', selectedLocationId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const waitingEntries = queueEntries
    .filter(e => e.status === 'WAITING')
    .sort((a, b) => a.position - b.position);
  
  const inProgressEntries = queueEntries
    .filter(e => e.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.startTime || a.checkInTime).getTime() - new Date(b.startTime || b.checkInTime).getTime());
  
  const completedEntries = queueEntries
    .filter(e => e.status === 'COMPLETE')
    .sort((a, b) => new Date(b.completedTime || b.checkInTime).getTime() - new Date(a.completedTime || a.checkInTime).getTime())
    .slice(0, 10);

  const getWaitTime = (entry: ServiceQueueEntry) => {
    const startTime = new Date(entry.checkInTime);
    return formatDistanceToNow(startTime, { addSuffix: false });
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'QR_CHECKIN':
        return <Badge variant="secondary" className="text-xs"><QrCode className="w-3 h-3 mr-1" /> QR</Badge>;
      case 'APPOINTMENT':
        return <Badge variant="outline" className="text-xs">Appt</Badge>;
      case 'PHONE':
        return <Badge variant="outline" className="text-xs"><Phone className="w-3 h-3 mr-1" /> Phone</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Walk-in</Badge>;
    }
  };

  if (locationsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8" />
            Service Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer waitlist and service bay assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {locations.length > 1 && (
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger className="w-[200px]" data-testid="select-queue-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <AddToQueueDialog
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSubmit={(data) => createEntryMutation.mutate(data)}
            isLoading={createEntryMutation.isPending}
            customers={customers}
          />

          <Link href="/quick-checkin">
            <Button variant="outline" className="gap-2" data-testid="button-view-checkin">
              <QrCode className="w-4 h-4" />
              Quick Check-In
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="column-waiting">
          <CardHeader className="bg-amber-500/10 border-b border-amber-500/20">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="w-5 h-5" />
                Waiting
              </div>
              <Badge variant="secondary">{waitingEntries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3 min-h-[400px]">
            {queueLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : waitingEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No customers waiting</p>
              </div>
            ) : (
              waitingEntries.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  onStart={() => startServiceMutation.mutate(entry.id)}
                  onDelete={() => deleteEntryMutation.mutate(entry.id)}
                  onUpdate={(data) => updateEntryMutation.mutate({ id: entry.id, data })}
                  serviceBays={serviceBays}
                  technicians={technicians}
                  isStarting={startServiceMutation.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card data-testid="column-in-progress">
          <CardHeader className="bg-blue-500/10 border-b border-blue-500/20">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700">
                <Wrench className="w-5 h-5" />
                In Progress
              </div>
              <Badge variant="secondary">{inProgressEntries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3 min-h-[400px]">
            {inProgressEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active services</p>
              </div>
            ) : (
              inProgressEntries.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  onComplete={() => updateEntryMutation.mutate({ id: entry.id, data: { status: 'COMPLETE' } })}
                  onDelete={() => deleteEntryMutation.mutate(entry.id)}
                  serviceBays={serviceBays}
                  technicians={technicians}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card data-testid="column-complete">
          <CardHeader className="bg-green-500/10 border-b border-green-500/20">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                Complete
              </div>
              <Badge variant="secondary">{completedEntries.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3 min-h-[400px]">
            {completedEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No completed services today</p>
              </div>
            ) : (
              completedEntries.map((entry) => (
                <QueueCard
                  key={entry.id}
                  entry={entry}
                  showRoLink
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-amber-600">{waitingEntries.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Customers Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{inProgressEntries.length}</p>
              <p className="text-sm text-muted-foreground mt-1">In Service</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{completedEntries.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Completed Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-4xl font-bold">
                {waitingEntries.length > 0 
                  ? getWaitTime(waitingEntries[0])
                  : '—'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">Avg Wait Time</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function QueueCard({ 
  entry, 
  onStart, 
  onComplete,
  onDelete,
  onUpdate,
  serviceBays = [],
  technicians = [],
  isStarting = false,
  showRoLink = false
}: { 
  entry: ServiceQueueEntry; 
  onStart?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  onUpdate?: (data: any) => void;
  serviceBays?: any[];
  technicians?: any[];
  isStarting?: boolean;
  showRoLink?: boolean;
}) {
  const waitTime = formatDistanceToNow(new Date(entry.checkInTime), { addSuffix: false });

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'QR_CHECKIN':
        return <Badge variant="secondary" className="text-xs"><QrCode className="w-3 h-3 mr-1" /> QR</Badge>;
      case 'APPOINTMENT':
        return <Badge variant="outline" className="text-xs">Appt</Badge>;
      case 'PHONE':
        return <Badge variant="outline" className="text-xs"><Phone className="w-3 h-3 mr-1" /> Phone</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Walk-in</Badge>;
    }
  };

  return (
    <div 
      className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
      data-testid={`queue-card-${entry.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{entry.customerName || 'Walk-in Customer'}</p>
            {entry.phone && (
              <p className="text-xs text-muted-foreground">{entry.phone}</p>
            )}
          </div>
        </div>
        {getSourceBadge(entry.checkInSource)}
      </div>

      {entry.vehicleInfo && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Car className="w-3 h-3" />
          {entry.vehicleInfo}
        </div>
      )}

      {entry.serviceDescription && (
        <p className="text-xs text-slate-600 mb-2 line-clamp-2">
          {entry.serviceDescription}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Timer className="w-3 h-3" />
          <span>{waitTime} wait</span>
        </div>
        {entry.estimatedMinutes && (
          <span>Est: {entry.estimatedMinutes}min</span>
        )}
      </div>

      {entry.status === 'WAITING' && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1 gap-1" 
            onClick={onStart}
            disabled={isStarting}
            data-testid={`button-start-service-${entry.id}`}
          >
            {isStarting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Start
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onDelete}
            data-testid={`button-remove-${entry.id}`}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      )}

      {entry.status === 'IN_PROGRESS' && (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 gap-1" 
            onClick={onComplete}
            data-testid={`button-complete-${entry.id}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Complete
          </Button>
          {entry.repairOrderId && (
            <Link href={`/ros/${entry.repairOrderId}`}>
              <Button size="sm" variant="secondary" data-testid={`button-view-ro-${entry.id}`}>
                <MoveRight className="w-3 h-3" />
              </Button>
            </Link>
          )}
        </div>
      )}

      {entry.status === 'COMPLETE' && showRoLink && entry.repairOrderId && (
        <Link href={`/ros/${entry.repairOrderId}`}>
          <Button size="sm" variant="outline" className="w-full gap-1" data-testid={`button-view-ro-${entry.id}`}>
            View Repair Order
            <MoveRight className="w-3 h-3" />
          </Button>
        </Link>
      )}
    </div>
  );
}

function AddToQueueDialog({ 
  isOpen, 
  onOpenChange, 
  onSubmit, 
  isLoading,
  customers 
}: { 
  isOpen: boolean; 
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  customers: any[];
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    vehicleInfo: '',
    phone: '',
    serviceDescription: '',
    estimatedMinutes: '',
    checkInSource: 'WALK_IN',
  });

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : null,
    });
    setFormData({
      customerName: '',
      vehicleInfo: '',
      phone: '',
      serviceDescription: '',
      estimatedMinutes: '',
      checkInSource: 'WALK_IN',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-to-queue">
          <Plus className="w-4 h-4" />
          Add to Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Customer to Queue</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              data-testid="input-queue-customer-name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vehicleInfo">Vehicle</Label>
            <Input
              id="vehicleInfo"
              placeholder="e.g., 2020 Toyota Camry"
              value={formData.vehicleInfo}
              onChange={(e) => setFormData({ ...formData, vehicleInfo: e.target.value })}
              data-testid="input-queue-vehicle"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 555-5555"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              data-testid="input-queue-phone"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="serviceDescription">Service Requested</Label>
            <Textarea
              id="serviceDescription"
              placeholder="What service does the customer need?"
              value={formData.serviceDescription}
              onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
              data-testid="input-queue-service"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="estimatedMinutes">Est. Time (min)</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                min="1"
                placeholder="30"
                value={formData.estimatedMinutes}
                onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
                data-testid="input-queue-estimate"
              />
            </div>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select
                value={formData.checkInSource}
                onValueChange={(v) => setFormData({ ...formData, checkInSource: v })}
              >
                <SelectTrigger data-testid="select-queue-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            data-testid="button-submit-queue"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add to Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
