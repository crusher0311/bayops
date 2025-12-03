import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrder, useCustomer, useVehicle, useWorkflows, useUpdateRepairOrder, useLaborGuide, type LaborGuideRepair } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Printer, 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  LayoutList,
  Briefcase,
  Loader2,
  Pencil,
  BookOpen,
  Search,
  DollarSign
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ServiceJob {
  id: string;
  name: string;
  description?: string;
  lineItems: LineItem[];
}

interface LineItem {
  id: string;
  type: 'LABOR' | 'PART' | 'TIRE' | 'FEE';
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  approved: boolean;
}

interface LaborGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: { year: number; make: string; model: string } | null;
  onSelect: (repair: LaborGuideRepair) => void;
}

function LaborGuideDialog({ isOpen, onClose, vehicle, onSelect }: LaborGuideDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const hasVehicle = vehicle && vehicle.year && vehicle.make && vehicle.model;
  
  const { data: laborGuideData, isLoading, error } = useLaborGuide(
    hasVehicle ? vehicle.year : 0,
    hasVehicle ? vehicle.make : '',
    hasVehicle ? vehicle.model : ''
  );

  const laborOperations = laborGuideData?.data?.repair?.flatMap(trim => 
    trim.repair.map(r => ({ ...r, trim: trim.trim }))
  ) || [];

  const filteredOperations = laborOperations.filter(op =>
    op.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Labor Guide - {vehicle?.year} {vehicle?.make} {vehicle?.model}
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search labor operations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-labor-guide-search"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading labor guide...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Unable to load labor guide</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        ) : filteredOperations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              {searchTerm ? 'No matching operations' : 'No labor data available'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Labor guide data not found for this vehicle'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredOperations.map((op, index) => {
                const laborCost = op.costs.find(c => c.name === 'Labor');
                const partsCost = op.costs.find(c => c.name === 'Parts');
                
                return (
                  <Card 
                    key={`${op.value}-${index}`} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onSelect(op)}
                    data-testid={`labor-guide-item-${index}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{op.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {op.description}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {laborCost && (laborCost.low > 0 || laborCost.high > 0) && (
                            <div className="flex items-center gap-1 text-sm font-medium text-primary">
                              <DollarSign className="w-3 h-3" />
                              {laborCost.low === laborCost.high 
                                ? `$${laborCost.low}`
                                : `$${laborCost.low} - $${laborCost.high}`}
                            </div>
                          )}
                          {partsCost && (partsCost.low > 0 || partsCost.high > 0) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Parts: ${partsCost.low} - ${partsCost.high}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RepairOrderDetail() {
  const [, params] = useRoute('/ros/:id');
  const roId = params?.id || '';
  
  const { data: ro, isLoading: roLoading } = useRepairOrder(roId);
  const { data: customer } = useCustomer(ro?.customerId || '');
  const { data: vehicle } = useVehicle(ro?.vehicleId || '');
  const { data: workflows = [] } = useWorkflows();
  const updateRO = useUpdateRepairOrder();

  const [newJobName, setNewJobName] = useState('');
  const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ jobId: string; item: LineItem } | null>(null);
  const [editForm, setEditForm] = useState<Partial<LineItem>>({});
  const [isLaborGuideOpen, setIsLaborGuideOpen] = useState(false);
  const [laborGuideJobId, setLaborGuideJobId] = useState<string | null>(null);

  if (roLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!ro) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Repair Order not found</p>
          <Link href="/ros">
            <Button variant="outline">Back to Repair Orders</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const activeWorkflow = workflows.find(w => w.id === ro.workflowId) || workflows[0];
  const stages = (activeWorkflow?.stages || []) as Array<{ id: string; label: string; order: number }>;
  const activeStages = [...stages].sort((a, b) => a.order - b.order);
  
  const jobs = (ro.jobs || []) as ServiceJob[];
  const allLineItems = jobs.flatMap(j => j.lineItems);
  
  const partsTotal = allLineItems
    .filter(i => i.type === 'PART' || i.type === 'TIRE')
    .reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
    
  const laborTotal = allLineItems
    .filter(i => i.type === 'LABOR')
    .reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);

  const subtotal = partsTotal + laborTotal;
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  const currentStepIndex = activeStages.findIndex(s => s.id === ro.status);

  const handleAddFromLaborGuide = (repair: LaborGuideRepair) => {
    if (!laborGuideJobId) return;
    
    const laborCost = repair.costs.find(c => c.name === 'Labor');
    const avgLaborPrice = laborCost ? (laborCost.low + laborCost.high) / 2 : 0;
    
    const newItem: LineItem = {
      id: `li-${Date.now()}`,
      type: 'LABOR',
      description: repair.title,
      quantity: 1,
      unitCost: 0,
      unitPrice: Math.round(avgLaborPrice * 100) / 100,
      approved: true
    };
    
    const updatedJobs = jobs.map(job => 
      job.id === laborGuideJobId 
        ? { ...job, lineItems: [...job.lineItems, newItem] }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    });
    
    setIsLaborGuideOpen(false);
    setLaborGuideJobId(null);
  };

  const openLaborGuide = (jobId: string) => {
    setLaborGuideJobId(jobId);
    setIsLaborGuideOpen(true);
  };

  const advanceStatus = () => {
    if (currentStepIndex < activeStages.length - 1) {
      updateRO.mutate({
        id: ro.id,
        updates: { status: activeStages[currentStepIndex + 1].id },
      });
    }
  };

  const handleAddJob = () => {
    if (!newJobName.trim()) return;
    
    const newJob: ServiceJob = {
      id: `job-${Date.now()}`,
      name: newJobName,
      description: '',
      lineItems: []
    };
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: [...jobs, newJob] as any },
    });
    setNewJobName('');
    setIsAddJobDialogOpen(false);
  };

  const handleAddLabor = (jobId: string) => {
    const newItem: LineItem = {
      id: `li-${Date.now()}`,
      type: 'LABOR',
      description: 'New Labor Item',
      quantity: 1,
      unitCost: 0,
      unitPrice: 0,
      approved: true
    };
    
    const updatedJobs = jobs.map(job => 
      job.id === jobId 
        ? { ...job, lineItems: [...job.lineItems, newItem] }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    });
  };

  const handleAddPart = (jobId: string) => {
    const newItem: LineItem = {
      id: `li-${Date.now()}`,
      type: 'PART',
      description: 'New Part Item',
      quantity: 1,
      unitCost: 0,
      unitPrice: 0,
      approved: true
    };
    
    const updatedJobs = jobs.map(job => 
      job.id === jobId 
        ? { ...job, lineItems: [...job.lineItems, newItem] }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    });
  };

  const handleDeleteItem = (jobId: string, itemId: string) => {
    const updatedJobs = jobs.map(job => 
      job.id === jobId 
        ? { ...job, lineItems: job.lineItems.filter(i => i.id !== itemId) }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    });
  };

  const handleEditItem = (jobId: string, item: LineItem) => {
    setEditingItem({ jobId, item });
    setEditForm({
      description: item.description,
      type: item.type,
      quantity: item.quantity,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    const updatedJobs = jobs.map(job => 
      job.id === editingItem.jobId 
        ? { 
            ...job, 
            lineItems: job.lineItems.map(i => 
              i.id === editingItem.item.id 
                ? { ...i, ...editForm }
                : i
            )
          }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    }, {
      onSuccess: () => {
        setEditingItem(null);
        setEditForm({});
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/ros">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">RO #{ro.roNumber}</h1>
              <Badge variant="outline" className="text-sm uppercase">
                {ro.status.replace(/-/g, ' ')}
              </Badge>
              {activeWorkflow && (
                <Badge variant="secondary" className="text-xs">
                  {activeWorkflow.name}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Created {format(new Date(ro.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-print">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-share">
              <Send className="w-4 h-4" /> Share
            </Button>
            <Button 
              className="gap-2" 
              disabled={currentStepIndex >= activeStages.length - 1 || updateRO.isPending}
              onClick={advanceStatus}
              data-testid="button-advance-status"
            >
              {currentStepIndex < activeStages.length - 1 
                ? `Move to ${activeStages[currentStepIndex + 1]?.label}` 
                : 'Completed'}
            </Button>
          </div>
        </div>

        {activeStages.length > 0 && (
          <div className="w-full bg-card border rounded-lg p-4 overflow-x-auto">
            <div className="flex justify-between items-center min-w-[600px]">
              {activeStages.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold shrink-0 transition-colors",
                    idx <= currentStepIndex 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground border-muted-foreground/20"
                  )}>
                    {idx < currentStepIndex ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-sm font-medium whitespace-nowrap",
                    idx <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  {idx < activeStages.length - 1 && (
                    <div className={cn(
                      "h-[2px] flex-1 mx-2 transition-colors",
                      idx < currentStepIndex ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">Customer</h3>
                    <div className="font-medium text-lg">{customer?.firstName} {customer?.lastName}</div>
                    <div className="text-sm text-muted-foreground">{customer?.phone}</div>
                    <div className="text-sm text-muted-foreground">{customer?.email}</div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">Vehicle</h3>
                    <div className="font-medium text-lg">{vehicle?.year} {vehicle?.make} {vehicle?.model}</div>
                    <div className="text-sm text-muted-foreground">VIN: {vehicle?.vin}</div>
                    <div className="text-sm text-muted-foreground">Mileage: {ro.odometerIn?.toLocaleString()} mi</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="estimate" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="estimate" className="gap-2">
                   <FileText className="w-4 h-4" /> Estimate & Parts
                </TabsTrigger>
                <TabsTrigger value="inspection" className="gap-2">
                   <LayoutList className="w-4 h-4" /> Inspection (DVI)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="estimate" className="mt-6 space-y-6">
                <div className="flex justify-end">
                  <Dialog open={isAddJobDialogOpen} onOpenChange={setIsAddJobDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2" data-testid="button-add-job">
                        <Briefcase className="w-4 h-4" /> Add Job
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Job</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Job Name</label>
                          <Input 
                            placeholder="e.g. Brake Service, Oil Change..." 
                            value={newJobName}
                            onChange={(e) => setNewJobName(e.target.value)}
                            data-testid="input-job-name"
                          />
                        </div>
                        <Button 
                          onClick={handleAddJob} 
                          disabled={!newJobName || updateRO.isPending} 
                          className="w-full"
                          data-testid="button-create-job"
                        >
                          Create Job
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {jobs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No Jobs Added</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm">
                        Create a job (package) to start adding parts and labor.
                      </p>
                      <Button variant="outline" onClick={() => setIsAddJobDialogOpen(true)}>
                        Add First Job
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  jobs.map((job) => (
                    <Card key={job.id} className="overflow-hidden border-l-4 border-l-blue-500" data-testid={`card-job-${job.id}`}>
                      <CardHeader className="bg-muted/10 pb-4 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{job.name}</CardTitle>
                            {job.description && <p className="text-sm text-muted-foreground mt-1">{job.description}</p>}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="gap-2" 
                              onClick={() => openLaborGuide(job.id)}
                              disabled={updateRO.isPending || !vehicle}
                              data-testid={`button-labor-guide-${job.id}`}
                            >
                              <BookOpen className="w-3 h-3" /> Labor Guide
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2" 
                              onClick={() => handleAddLabor(job.id)}
                              disabled={updateRO.isPending}
                              data-testid={`button-add-labor-${job.id}`}
                            >
                              <Plus className="w-3 h-3" /> Labor
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-2" 
                              onClick={() => handleAddPart(job.id)}
                              disabled={updateRO.isPending}
                              data-testid={`button-add-part-${job.id}`}
                            >
                              <Plus className="w-3 h-3" /> Part
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-medium">
                              <tr>
                                <th className="px-4 py-3 text-left">Description</th>
                                <th className="px-4 py-3 text-center">Type</th>
                                <th className="px-4 py-3 text-center">Qty</th>
                                <th className="px-4 py-3 text-right">Unit Price</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="w-[80px]"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {job.lineItems.map((item) => (
                                <tr key={item.id} className="group hover:bg-muted/30" data-testid={`row-item-${item.id}`}>
                                  <td className="px-4 py-3 font-medium">
                                    {item.description}
                                    {item.type === 'TIRE' && <Badge variant="secondary" className="ml-2 text-[10px]">In Stock</Badge>}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                                  </td>
                                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                                  <td className="px-4 py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-medium">
                                    ${(item.unitPrice * item.quantity).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8"
                                        onClick={() => handleEditItem(job.id, item)}
                                        disabled={updateRO.isPending}
                                        data-testid={`button-edit-${item.id}`}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-destructive"
                                        onClick={() => handleDeleteItem(job.id, item.id)}
                                        disabled={updateRO.isPending}
                                        data-testid={`button-delete-${item.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {job.lineItems.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                                    No items in this job.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="inspection" className="mt-6">
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <LayoutList className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Inspection Module</h3>
                    <p className="text-muted-foreground mb-6 max-w-sm">
                      Digital vehicle inspection will be available in a future update.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labor</span>
                  <span>${laborTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parts & Tires</span>
                  <span>${partsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shop Supplies</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold tracking-tight text-primary" data-testid="text-total">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {ro.notes && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-xs text-muted-foreground">{ro.notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Line Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                data-testid="input-edit-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={editForm.type || 'LABOR'}
                onValueChange={(value) => setEditForm({ ...editForm, type: value as LineItem['type'] })}
              >
                <SelectTrigger data-testid="select-edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LABOR">Labor</SelectItem>
                  <SelectItem value="PART">Part</SelectItem>
                  <SelectItem value="TIRE">Tire</SelectItem>
                  <SelectItem value="FEE">Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={editForm.quantity || 1}
                  onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 1 })}
                  data-testid="input-edit-quantity"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit-price">Unit Price ($)</Label>
                <Input
                  id="edit-unit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.unitPrice || 0}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  data-testid="input-edit-unit-price"
                />
              </div>
            </div>
            {editForm.type !== 'LABOR' && (
              <div className="space-y-2">
                <Label htmlFor="edit-unit-cost">Unit Cost ($)</Label>
                <Input
                  id="edit-unit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.unitCost || 0}
                  onChange={(e) => setEditForm({ ...editForm, unitCost: parseFloat(e.target.value) || 0 })}
                  data-testid="input-edit-unit-cost"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateRO.isPending} data-testid="button-save-edit">
              {updateRO.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLaborGuideOpen && vehicle && (
        <LaborGuideDialog
          isOpen={isLaborGuideOpen}
          onClose={() => {
            setIsLaborGuideOpen(false);
            setLaborGuideJobId(null);
          }}
          vehicle={{ year: vehicle.year, make: vehicle.make, model: vehicle.model }}
          onSelect={handleAddFromLaborGuide}
        />
      )}
    </AppLayout>
  );
}
