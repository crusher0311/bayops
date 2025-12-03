import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRepairOrder, useCustomer, useVehicle, useWorkflows, useUpdateRepairOrder } from '@/lib/hooks';
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
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
                                <th className="w-[50px]"></th>
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
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                                      onClick={() => handleDeleteItem(job.id, item.id)}
                                      disabled={updateRO.isPending}
                                      data-testid={`button-delete-${item.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
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
    </AppLayout>
  );
}
