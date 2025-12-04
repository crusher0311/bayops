import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/lib/authStore';
import { 
  useRepairOrder, 
  useCustomer, 
  useVehicle, 
  useWorkflows, 
  useUpdateRepairOrder, 
  useLaborGuide, 
  useGenerateServiceDescription,
  useGenerateAuthorizationRequest,
  useImproveJobDescription,
  type LaborGuideRepair 
} from '@/lib/hooks';
import { InspectionForm } from '@/components/InspectionForm';
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
  DollarSign,
  Sparkles,
  Copy,
  Check,
  ClipboardCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
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
  manufacturer?: string;
  supplier?: string;
  partNumber?: string;
}

interface LaborGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: { year: number; make: string; model: string } | null;
  onSelect: (repair: LaborGuideRepair) => void;
}

interface PartsMatrix {
  id: string;
  name: string;
  minCost: string;
  maxCost: string;
  markupPercent: string;
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
  const { user } = useAuthStore();
  
  const { data: ro, isLoading: roLoading } = useRepairOrder(roId);
  const { data: customer } = useCustomer(ro?.customerId || '');
  const { data: vehicle } = useVehicle(ro?.vehicleId || '');
  const { data: workflows = [] } = useWorkflows();
  const updateRO = useUpdateRepairOrder();
  
  const { data: settings } = useQuery({
    queryKey: ['settings', ro?.locationId],
    queryFn: async () => {
      const res = await fetch(`/api/settings/all/${ro?.locationId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json() as Promise<{ partsMatrices: PartsMatrix[] }>;
    },
    enabled: !!ro?.locationId,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: inspectionTemplates = [] } = useQuery({
    queryKey: ['inspection-templates', ro?.locationId],
    queryFn: async () => {
      const res = await fetch(`/api/inspection-templates?locationId=${ro?.locationId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ro?.locationId,
  });

  const { data: roInspection, isLoading: inspectionLoading } = useQuery({
    queryKey: ['inspections', roId],
    queryFn: async () => {
      const res = await fetch(`/api/inspections/ro/${roId}`, { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!roId,
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const template = inspectionTemplates.find((t: any) => t.id === templateId);
      const initialItems = (template?.items || []).map((item: any) => ({
        itemId: item.id,
        status: null,
        finding: null,
        recommendation: null,
        photos: [],
      }));
      
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roId: roId,
          templateId,
          technicianId: ro?.technicianId || user?.id,
          vehicleId: ro?.vehicleId,
          items: initialItems,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create inspection');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', roId] });
      toast({ title: 'Inspection started' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateInspectionMutation = useMutation({
    mutationFn: async ({ id, items, status }: { id: string; items: any[]; status?: string }) => {
      const res = await fetch(`/api/inspections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items, status }),
      });
      if (!res.ok) throw new Error('Failed to update inspection');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', roId] });
      toast({ title: 'Inspection updated' });
    },
  });

  const shareInspectionMutation = useMutation({
    mutationFn: async (inspectionId: string) => {
      const res = await fetch(`/api/inspections/${inspectionId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to generate share link');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspections', roId] });
      if (data.shareToken) {
        const shareUrl = `${window.location.origin}${data.shareUrl}`;
        navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Share link copied!', description: 'Link copied to clipboard' });
      }
    },
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: async (inspectionId: string) => {
      const res = await fetch(`/api/inspections/${inspectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete inspection');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections', roId] });
      toast({ title: 'Inspection deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('estimate');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  useEffect(() => {
    if (activeTab === 'inspection' && 
        !roInspection && 
        !inspectionLoading && 
        inspectionTemplates.length > 0 && 
        !createInspectionMutation.isPending) {
      const firstTemplate = inspectionTemplates[0];
      if (firstTemplate) {
        createInspectionMutation.mutate(firstTemplate.id);
      }
    }
  }, [activeTab, roInspection, inspectionLoading, inspectionTemplates]);

  const [newJobName, setNewJobName] = useState('');
  const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ jobId: string; item: LineItem } | null>(null);
  const [editForm, setEditForm] = useState<Partial<LineItem>>({});
  const [isLaborGuideOpen, setIsLaborGuideOpen] = useState(false);
  const [laborGuideJobId, setLaborGuideJobId] = useState<string | null>(null);
  
  // AI Service Writer state
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [aiDialogContent, setAIDialogContent] = useState('');
  const [aiDialogTitle, setAIDialogTitle] = useState('');
  const [aiCopied, setAICopied] = useState(false);
  const [aiActiveJobId, setAIActiveJobId] = useState<string | null>(null);
  
  // AI hooks
  const generateDescription = useGenerateServiceDescription();
  const generateAuth = useGenerateAuthorizationRequest();
  const improveDescription = useImproveJobDescription();
  
  const applyPartsMatrix = (cost: number): number => {
    const matrices = settings?.partsMatrices || [];
    for (const matrix of matrices) {
      const minCost = parseFloat(matrix.minCost);
      const maxCost = parseFloat(matrix.maxCost);
      const markup = parseFloat(matrix.markupPercent);
      if (cost >= minCost && cost <= maxCost) {
        return Math.round(cost * (1 + markup / 100) * 100) / 100;
      }
    }
    return cost;
  };

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

  // AI Service Writer functions
  const handleGenerateJobDescription = async (job: ServiceJob) => {
    if (!vehicle) return;
    
    setAIActiveJobId(job.id);
    setAIDialogTitle(`AI Service Description: ${job.name}`);
    setAIDialogContent('');
    setIsAIDialogOpen(true);
    
    try {
      const result = await generateDescription.mutateAsync({
        job: {
          name: job.name,
          description: job.description,
          lineItems: job.lineItems.map(item => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
        vehicle: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          mileage: vehicle.mileage,
        },
      });
      setAIDialogContent(result.description);
    } catch (error: any) {
      setAIDialogContent(`Error: ${error.message}`);
    }
  };

  const handleGenerateAuthorizationRequest = async () => {
    if (!vehicle || jobs.length === 0) return;
    
    setAIDialogTitle('Authorization Request');
    setAIDialogContent('');
    setIsAIDialogOpen(true);
    
    try {
      const result = await generateAuth.mutateAsync({
        vehicle: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          mileage: vehicle.mileage,
        },
        jobs: jobs.map(job => ({
          name: job.name,
          description: job.description,
          lineItems: job.lineItems.map(item => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        })),
        notes: ro.notes || undefined,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
      });
      setAIDialogContent(result.message);
    } catch (error: any) {
      setAIDialogContent(`Error: ${error.message}`);
    }
  };

  const handleCopyAIContent = async () => {
    await navigator.clipboard.writeText(aiDialogContent);
    setAICopied(true);
    setTimeout(() => setAICopied(false), 2000);
  };

  const handleApplyJobDescription = () => {
    if (!aiActiveJobId || !aiDialogContent) return;
    
    const updatedJobs = jobs.map(job => 
      job.id === aiActiveJobId 
        ? { ...job, description: aiDialogContent }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    });
    
    setIsAIDialogOpen(false);
    setAIActiveJobId(null);
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
      description: '',
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
    }, {
      onSuccess: () => {
        setEditingItem({ jobId, item: newItem });
        setEditForm({
          description: newItem.description,
          type: newItem.type,
          quantity: newItem.quantity,
          unitCost: newItem.unitCost,
          unitPrice: newItem.unitPrice,
        });
      }
    });
  };

  const handleAddPart = (jobId: string) => {
    const newItem: LineItem = {
      id: `li-${Date.now()}`,
      type: 'PART',
      description: '',
      quantity: 1,
      unitCost: 0,
      unitPrice: 0,
      approved: true,
      manufacturer: '',
      supplier: '',
      partNumber: '',
    };
    
    const updatedJobs = jobs.map(job => 
      job.id === jobId 
        ? { ...job, lineItems: [...job.lineItems, newItem] }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    }, {
      onSuccess: () => {
        setEditingItem({ jobId, item: newItem });
        setEditForm({
          description: newItem.description,
          type: newItem.type,
          quantity: newItem.quantity,
          unitCost: newItem.unitCost,
          unitPrice: newItem.unitPrice,
          manufacturer: newItem.manufacturer,
          supplier: newItem.supplier,
          partNumber: newItem.partNumber,
        });
      }
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
      manufacturer: item.manufacturer || '',
      supplier: item.supplier || '',
      partNumber: item.partNumber || '',
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
              variant="secondary" 
              size="sm" 
              className="gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 hover:from-purple-500/20 hover:to-blue-500/20" 
              onClick={handleGenerateAuthorizationRequest}
              disabled={generateAuth.isPending || !vehicle || jobs.length === 0}
              data-testid="button-ai-authorization"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              {generateAuth.isPending ? 'Generating...' : 'AI Authorization'}
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                              variant="secondary" 
                              size="sm" 
                              className="gap-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 hover:from-purple-500/20 hover:to-blue-500/20" 
                              onClick={() => handleGenerateJobDescription(job)}
                              disabled={generateDescription.isPending || !vehicle}
                              data-testid={`button-ai-description-${job.id}`}
                            >
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              {generateDescription.isPending && aiActiveJobId === job.id ? 'Writing...' : 'AI Write'}
                            </Button>
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
                {inspectionLoading || createInspectionMutation.isPending ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {createInspectionMutation.isPending ? 'Starting inspection...' : 'Loading...'}
                    </p>
                  </div>
                ) : roInspection ? (
                  <InspectionForm
                    inspectionId={roInspection.id}
                    templateItems={(inspectionTemplates.find((t: any) => t.id === roInspection.templateId)?.items || []) as any}
                    initialItems={roInspection.items || []}
                    vehicle={vehicle ? { year: vehicle.year, make: vehicle.make, model: vehicle.model, mileage: vehicle.mileage } : { year: 0, make: '', model: '' }}
                    customer={customer ? { firstName: customer.firstName, email: customer.email || '', phone: customer.phone || '' } : undefined}
                    onSave={(items) => updateInspectionMutation.mutate({ id: roInspection.id, items })}
                    onComplete={() => updateInspectionMutation.mutate({ id: roInspection.id, items: roInspection.items || [], status: 'COMPLETED' })}
                    onDelete={() => {
                      if (confirm('Are you sure you want to delete this inspection? This cannot be undone.')) {
                        deleteInspectionMutation.mutate(roInspection.id);
                      }
                    }}
                    isCompleted={!!roInspection.completedAt}
                    shareToken={roInspection.shareToken}
                  />
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <ClipboardCheck className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">
                        {inspectionTemplates.length === 0 ? 'No Inspection Templates' : 'Start Vehicle Inspection'}
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-sm">
                        {inspectionTemplates.length === 0 
                          ? 'Create an inspection template first to start inspections.'
                          : 'Select a template to begin the digital vehicle inspection.'}
                      </p>
                      {inspectionTemplates.length === 0 ? (
                        <Link href="/inspections">
                          <Button data-testid="button-create-template">
                            Create Template
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                            <SelectTrigger className="w-full" data-testid="select-inspection-template">
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                              {inspectionTemplates.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name} ({template.items?.length || 0} items)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={() => selectedTemplateId && createInspectionMutation.mutate(selectedTemplateId)}
                            disabled={!selectedTemplateId || createInspectionMutation.isPending}
                            className="w-full"
                            data-testid="button-start-inspection"
                          >
                            {createInspectionMutation.isPending ? 'Starting...' : 'Start Inspection'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editForm.type === 'LABOR' ? 'Edit Labor' : editForm.type === 'PART' ? 'Edit Part' : editForm.type === 'TIRE' ? 'Edit Tire' : 'Edit Fee'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description || ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder={editForm.type === 'PART' ? 'Enter part description' : editForm.type === 'LABOR' ? 'Enter labor description' : 'Enter description'}
                data-testid="input-edit-description"
              />
            </div>
            
            {(editForm.type === 'PART' || editForm.type === 'TIRE') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-part-number">Part Number</Label>
                    <Input
                      id="edit-part-number"
                      value={editForm.partNumber || ''}
                      onChange={(e) => setEditForm({ ...editForm, partNumber: e.target.value })}
                      placeholder="e.g., ABC-12345"
                      data-testid="input-edit-part-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                    <Input
                      id="edit-manufacturer"
                      value={editForm.manufacturer || ''}
                      onChange={(e) => setEditForm({ ...editForm, manufacturer: e.target.value })}
                      placeholder="e.g., ACDelco"
                      data-testid="input-edit-manufacturer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Supplier</Label>
                  <Input
                    id="edit-supplier"
                    value={editForm.supplier || ''}
                    onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                    placeholder="e.g., AutoZone, NAPA, O'Reilly"
                    data-testid="input-edit-supplier"
                  />
                </div>
              </>
            )}
            
            <div className="grid grid-cols-3 gap-4">
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
              {editForm.type !== 'LABOR' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-unit-cost">Cost ($)</Label>
                  <Input
                    id="edit-unit-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.unitCost || 0}
                    onChange={(e) => {
                      const cost = parseFloat(e.target.value) || 0;
                      setEditForm({ ...editForm, unitCost: cost });
                    }}
                    data-testid="input-edit-unit-cost"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-unit-price">Sale ($)</Label>
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
            
            {editForm.type !== 'LABOR' && (editForm.unitCost || 0) > 0 && (
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const salePrice = applyPartsMatrix(editForm.unitCost || 0);
                    setEditForm({ ...editForm, unitPrice: salePrice });
                  }}
                  disabled={!settings?.partsMatrices?.length}
                  data-testid="button-apply-matrix"
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Apply Matrix
                </Button>
                {(editForm.unitPrice || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Margin: {((1 - (editForm.unitCost || 0) / (editForm.unitPrice || 1)) * 100).toFixed(1)}%
                  </span>
                )}
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

      {/* AI Service Writer Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {aiDialogTitle}
            </DialogTitle>
          </DialogHeader>
          
          {generateDescription.isPending || generateAuth.isPending ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
              <p className="text-muted-foreground">AI is writing...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={aiDialogContent}
                onChange={(e) => setAIDialogContent(e.target.value)}
                className="min-h-[200px] text-sm"
                placeholder="AI generated content will appear here..."
                data-testid="textarea-ai-content"
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>You can edit the text above before applying</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={handleCopyAIContent}
                  disabled={!aiDialogContent}
                  data-testid="button-copy-ai"
                >
                  {aiCopied ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAIDialogOpen(false);
                setAIActiveJobId(null);
              }}
            >
              Close
            </Button>
            {aiActiveJobId && aiDialogContent && !aiDialogContent.startsWith('Error:') && (
              <Button 
                onClick={handleApplyJobDescription}
                disabled={updateRO.isPending}
                className="gap-2"
                data-testid="button-apply-ai"
              >
                <Check className="w-4 h-4" />
                Apply to Job
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
