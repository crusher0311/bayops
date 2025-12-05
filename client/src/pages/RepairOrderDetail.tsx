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
  usePartstechStatus,
  usePartstechSearch,
  useDeferredWorkByVehicle,
  useUpdateDeferredWork,
  type LaborGuideRepair,
  type PartstechPart
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
  ClipboardCheck,
  ExternalLink,
  Wrench,
  ShoppingCart,
  Package,
  ChevronDown
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

interface PartstechDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: { vin?: string; year?: number; make?: string; model?: string } | null;
  onSelect: (part: PartstechPart) => void;
}

function PartstechDialog({ isOpen, onClose, vehicle, onSelect }: PartstechDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PartstechPart[]>([]);
  const [manualPartNumber, setManualPartNumber] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualBrand, setManualBrand] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const partstechSearch = usePartstechSearch();
  const { data: ptStatus } = usePartstechStatus();
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const result = await partstechSearch.mutateAsync({
        query: searchTerm,
        vin: vehicle?.vin,
        pageSize: 50,
      });
      setSearchResults(result.parts);
    } catch (error) {
      console.error('Search error:', error);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openPartstechPopup = () => {
    const baseUrl = 'https://app.partstech.com';
    let url = baseUrl;
    
    if (vehicle?.vin) {
      url = `${baseUrl}/search?vin=${encodeURIComponent(vehicle.vin)}`;
    }
    
    const popup = window.open(
      url,
      'partstech',
      'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (popup) {
      popup.focus();
    }
  };

  const handleManualPartAdd = () => {
    if (!manualPartNumber.trim() || !manualDescription.trim()) return;
    
    const part: PartstechPart = {
      partNumber: manualPartNumber.trim(),
      description: manualDescription.trim(),
      brand: manualBrand.trim() || 'Unknown',
      price: manualPrice ? parseFloat(manualPrice) : undefined,
    };
    
    onSelect(part);
    setManualPartNumber('');
    setManualDescription('');
    setManualBrand('');
    setManualPrice('');
    onClose();
  };

  if (!ptStatus?.configured) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              PartsTech Parts Ordering
              {vehicle && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900">Open PartsTech Website</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Click below to open PartsTech in a new window. Search and order parts, then enter the part details below to add to this repair order.
                  </p>
                  <Button 
                    onClick={openPartstechPopup}
                    className="mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="button-open-partstech"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open PartsTech {vehicle?.vin ? `(VIN: ${vehicle.vin.slice(-6)})` : ''}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Part to Repair Order
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="partNumber" className="text-xs">Part Number *</Label>
                  <Input
                    id="partNumber"
                    placeholder="e.g. BP-12345"
                    value={manualPartNumber}
                    onChange={(e) => setManualPartNumber(e.target.value)}
                    data-testid="input-manual-part-number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="partBrand" className="text-xs">Brand</Label>
                  <Input
                    id="partBrand"
                    placeholder="e.g. ACDelco"
                    value={manualBrand}
                    onChange={(e) => setManualBrand(e.target.value)}
                    data-testid="input-manual-brand"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="partDescription" className="text-xs">Description *</Label>
                  <Input
                    id="partDescription"
                    placeholder="e.g. Front Brake Pads"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    data-testid="input-manual-description"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="partPrice" className="text-xs">Cost Price ($)</Label>
                  <Input
                    id="partPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    data-testid="input-manual-price"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleManualPartAdd}
                    disabled={!manualPartNumber.trim() || !manualDescription.trim()}
                    className="w-full"
                    data-testid="button-add-manual-part"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            PartsTech Parts Search
            {vehicle && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search parts (e.g. brake pads, oil filter...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
              data-testid="input-partstech-search"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={!searchTerm.trim() || partstechSearch.isPending}
            data-testid="button-partstech-search"
          >
            {partstechSearch.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {partstechSearch.isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Searching PartsTech...</span>
          </div>
        ) : partstechSearch.isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold">Search Failed</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {partstechSearch.error?.message || 'An error occurred while searching'}
            </p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              {searchTerm ? 'No parts found' : 'Search for parts'}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {searchTerm 
                ? 'Try a different search term or part number' 
                : 'Enter a part name, description, or part number to search'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {searchResults.map((part, index) => (
                <Card 
                  key={`${part.partNumber}-${index}`} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    onSelect(part);
                    onClose();
                  }}
                  data-testid={`partstech-part-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{part.description}</h4>
                          {part.available !== false && (
                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-600">
                              In Stock
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">{part.partNumber}</span>
                          <span>•</span>
                          <span>{part.brand}</span>
                          {part.supplier && (
                            <>
                              <span>•</span>
                              <span>{part.supplier}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {part.price != null && part.price > 0 && (
                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <DollarSign className="w-3 h-3" />
                            {part.price.toFixed(2)}
                          </div>
                        )}
                        {part.listPrice != null && part.listPrice !== part.price && (
                          <div className="text-xs text-muted-foreground line-through">
                            ${part.listPrice.toFixed(2)}
                          </div>
                        )}
                        {part.corePrice != null && part.corePrice > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Core: ${part.corePrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
  
  const { data: deferredWork = [] } = useDeferredWorkByVehicle(ro?.vehicleId || '');
  const updateDeferredWork = useUpdateDeferredWork();
  const pendingDeferredWork = deferredWork.filter((dw: any) => dw.status === 'PENDING');
  
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

  const sendAuthorizationMutation = useMutation({
    mutationFn: async (method: 'sms' | 'email') => {
      const res = await fetch(`/api/repair-orders/${roId}/send-authorization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to send');
      }
      return res.json();
    },
    onSuccess: (_, method) => {
      queryClient.invalidateQueries({ queryKey: ['repair-order', roId] });
      toast({ 
        title: 'Authorization Request Sent!', 
        description: `Sent via ${method === 'sms' ? 'text message' : 'email'}` 
      });
      setSendDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to Send', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const [sendDialogOpen, setSendDialogOpen] = useState(false);

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

  const generateJobsFromDVIMutation = useMutation({
    mutationFn: async (inspectionId: string) => {
      const res = await fetch('/api/inspections/ai/generate-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inspectionId, laborRate: 150 }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate jobs');
      }
      return res.json() as Promise<{
        jobs: Array<{
          name: string;
          description: string;
          priority: 'high' | 'medium';
          sourceItemLabel: string;
          lineItems: Array<{
            type: 'LABOR' | 'PART';
            description: string;
            quantity: number;
            unitPrice: number;
          }>;
        }>;
        summary: string;
      }>;
    },
    onSuccess: (data) => {
      if (data.jobs.length === 0) {
        toast({ title: 'No recommended services', description: 'No items requiring attention found in the inspection.' });
        return;
      }
      
      const currentJobs = ro?.jobs || [];
      const newJobs = data.jobs.map((job, index) => ({
        id: `job-${Date.now()}-${index}`,
        name: job.name,
        description: job.description,
        lineItems: job.lineItems.map((li, liIndex) => ({
          id: `li-${Date.now()}-${index}-${liIndex}`,
          type: li.type,
          description: li.description,
          quantity: li.quantity,
          unitCost: li.type === 'PART' ? li.unitPrice * 0.6 : 0,
          unitPrice: li.unitPrice,
          approved: false,
        })),
      }));
      
      updateRO.mutate({
        id: roId,
        jobs: [...currentJobs, ...newJobs],
      });
      
      setActiveTab('estimate');
      toast({ 
        title: 'Work Order Generated!', 
        description: `Added ${data.jobs.length} service(s) from inspection findings.` 
      });
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
  
  // PartsTech state
  const [isPartstechOpen, setIsPartstechOpen] = useState(false);
  const [partstechJobId, setPartstechJobId] = useState<string | null>(null);
  
  // Canned Jobs / Service Packages state
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  
  // Fetch canned job templates
  const { data: cannedJobTemplates = [] } = useQuery<any[]>({
    queryKey: ['canned-jobs', ro?.locationId],
    queryFn: async () => {
      const res = await fetch(`/api/locations/${ro?.locationId}/canned-jobs`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    },
    enabled: !!ro?.locationId,
  });

  // Mutation to add canned job to RO
  const addPackageMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/repair-orders/${roId}/add-canned-job/${templateId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to add package');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-order', roId] });
      toast({ title: 'Service package added successfully' });
      setIsPackageDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
  
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

  // PartsTech handlers
  const openPartstechSearch = (jobId: string) => {
    setPartstechJobId(jobId);
    setIsPartstechOpen(true);
  };

  const handleAddFromPartstech = (part: PartstechPart) => {
    if (!partstechJobId) return;
    
    const partCost = part.price || 0;
    const partPrice = applyPartsMatrix(partCost);
    
    const newItem: LineItem = {
      id: `li-${Date.now()}`,
      type: 'PART',
      description: part.description,
      quantity: 1,
      unitCost: partCost,
      unitPrice: partPrice,
      approved: true,
      partNumber: part.partNumber,
      manufacturer: part.brand,
      supplier: part.supplier,
    };
    
    const updatedJobs = jobs.map(job => 
      job.id === partstechJobId 
        ? { ...job, lineItems: [...job.lineItems, newItem] }
        : job
    );
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: updatedJobs as any },
    });
    
    setIsPartstechOpen(false);
    setPartstechJobId(null);
    toast({ title: 'Part added', description: `${part.description} added to job` });
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

  const handleAddDeferredToRO = (deferredItem: any) => {
    const normalizeType = (type: string): 'LABOR' | 'PART' | 'TIRE' | 'FEE' => {
      const normalized = type?.toUpperCase() || '';
      if (normalized === 'LABOR') return 'LABOR';
      if (normalized === 'PART' || normalized === 'PARTS') return 'PART';
      if (normalized === 'TIRE' || normalized === 'TIRES') return 'TIRE';
      return 'FEE';
    };
    
    const lineItems: LineItem[] = [];
    
    if (deferredItem.laborHours && parseFloat(deferredItem.laborHours) > 0) {
      lineItems.push({
        id: `li-${Date.now()}-labor`,
        type: 'LABOR',
        description: deferredItem.serviceName,
        quantity: parseFloat(deferredItem.laborHours),
        unitCost: 0,
        unitPrice: parseFloat(deferredItem.estimatedPrice || 0) / parseFloat(deferredItem.laborHours || 1),
        approved: false,
      });
    } else if (deferredItem.estimatedPrice) {
      lineItems.push({
        id: `li-${Date.now()}-labor`,
        type: 'LABOR',
        description: deferredItem.serviceName,
        quantity: 1,
        unitCost: 0,
        unitPrice: parseFloat(deferredItem.estimatedPrice || 0),
        approved: false,
      });
    }
    
    const lineItemsFromNotes: LineItem[] = deferredItem.notes ? (() => {
      try {
        const parsed = JSON.parse(deferredItem.notes);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any, idx: number): LineItem => ({
            id: `li-${Date.now()}-${idx}`,
            type: normalizeType(item.type),
            description: item.description || item.name || '',
            quantity: parseFloat(item.quantity) || 1,
            unitCost: parseFloat(item.unitCost) || 0,
            unitPrice: parseFloat(item.unitPrice) || parseFloat(item.total) || 0,
            approved: false,
            partNumber: item.partNumber || '',
          }));
        }
        return [];
      } catch {
        return [];
      }
    })() : [];
    
    const allLineItems: LineItem[] = lineItemsFromNotes.length > 0 ? lineItemsFromNotes : lineItems;
    
    if (allLineItems.length === 0) {
      lineItems.push({
        id: `li-${Date.now()}-labor`,
        type: 'LABOR',
        description: deferredItem.serviceName,
        quantity: 1,
        unitCost: 0,
        unitPrice: 0,
        approved: false,
      });
    }
    
    const finalLineItems = allLineItems.length > 0 ? allLineItems : lineItems;
    
    const newJob: ServiceJob = {
      id: `job-${Date.now()}`,
      name: deferredItem.serviceName,
      description: deferredItem.serviceDescription || deferredItem.reason || '',
      lineItems: finalLineItems,
    };
    
    updateRO.mutate({
      id: ro.id,
      updates: { jobs: [...jobs, newJob] as any },
    }, {
      onSuccess: () => {
        updateDeferredWork.mutate({
          id: deferredItem.id,
          updates: { status: 'CONVERTED', convertedRoId: ro.id },
        });
        toast({
          title: 'Deferred service added',
          description: `"${deferredItem.serviceName}" has been added to this repair order.`,
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to add deferred service to repair order.',
          variant: 'destructive',
        });
      },
    });
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
              {activeWorkflow && workflows.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2" data-testid="button-change-workflow">
                      {activeWorkflow.name}
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {workflows.map(wf => (
                      <DropdownMenuItem
                        key={wf.id}
                        onClick={() => {
                          if (wf.id !== ro.workflowId) {
                            const newStages = (wf.stages as any[]) || [];
                            const firstStage = newStages.sort((a, b) => a.order - b.order)[0];
                            updateRO.mutate({
                              id: ro.id,
                              updates: { 
                                workflowId: wf.id,
                                status: firstStage?.id || 'check-in',
                              },
                            });
                          }
                        }}
                        data-testid={`workflow-option-${wf.id}`}
                      >
                        {wf.name}
                        {wf.id === ro.workflowId && <Check className="w-4 h-4 ml-2" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : activeWorkflow ? (
                <Badge variant="secondary" className="text-xs">
                  {activeWorkflow.name}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground text-sm">
              Created {format(new Date(ro.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-print">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-send-customer">
                  <Send className="w-4 h-4" /> Send to Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Send Authorization Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Send the service authorization request to the customer so they can review and approve the recommended work.
                  </p>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-14"
                      onClick={() => sendAuthorizationMutation.mutate('sms')}
                      disabled={!customer?.phone || sendAuthorizationMutation.isPending}
                      data-testid="button-send-sms"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                        <Send className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Text Message (SMS)</div>
                        <div className="text-xs text-muted-foreground">
                          {customer?.phone || 'No phone number'}
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-14"
                      onClick={() => sendAuthorizationMutation.mutate('email')}
                      disabled={!customer?.email || sendAuthorizationMutation.isPending}
                      data-testid="button-send-email"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Email</div>
                        <div className="text-xs text-muted-foreground">
                          {customer?.email || 'No email address'}
                        </div>
                      </div>
                    </Button>
                  </div>
                  {sendAuthorizationMutation.isPending && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      VIN: {vehicle?.vin}
                      {vehicle?.vin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            navigator.clipboard.writeText(vehicle.vin);
                            toast({ title: 'VIN copied to clipboard' });
                          }}
                          data-testid="button-copy-vin"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Mileage: {ro.odometerIn?.toLocaleString()} mi</div>
                    {vehicle?.vin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(vehicle.vin);
                          window.open('https://www2.prodemand.com', '_blank');
                          toast({ 
                            title: 'VIN copied to clipboard!', 
                            description: 'Paste in ProDemand vehicle lookup (Ctrl+V)' 
                          });
                        }}
                        data-testid="button-launch-prodemand"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        ProDemand
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
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
                <div className="flex justify-end gap-2">
                  <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2" data-testid="button-add-package">
                        <Package className="w-4 h-4" /> Add Package
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Add Service Package
                        </DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {cannedJobTemplates.length === 0 ? (
                          <div className="text-center py-8">
                            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">No service packages configured yet.</p>
                            <Link href="/settings">
                              <Button variant="outline" size="sm">
                                Configure in Settings
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {cannedJobTemplates.filter((t: any) => t.isActive).map((template: any) => (
                              <div
                                key={template.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                data-testid={`package-option-${template.id}`}
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{template.name}</p>
                                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                                    <span>{template.laborHours}h labor</span>
                                    {template.parts?.length > 0 && (
                                      <span>{template.parts.length} parts</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => addPackageMutation.mutate(template.id)}
                                  disabled={addPackageMutation.isPending}
                                  data-testid={`button-select-package-${template.id}`}
                                >
                                  {addPackageMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
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
                              variant="secondary" 
                              size="sm" 
                              className="gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 border-orange-500/20" 
                              onClick={() => openPartstechSearch(job.id)}
                              disabled={updateRO.isPending}
                              data-testid={`button-partstech-${job.id}`}
                            >
                              <Package className="w-3 h-3" /> PartsTech
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
                    onGenerateJobs={() => generateJobsFromDVIMutation.mutate(roInspection.id)}
                    isGeneratingJobs={generateJobsFromDVIMutation.isPending}
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

            {pendingDeferredWork.length > 0 && (
              <Card className="bg-orange-50/50 border-orange-200">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-4 h-4" />
                    Pending Deferred Work ({pendingDeferredWork.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {pendingDeferredWork.map((dw: any) => (
                    <div 
                      key={dw.id} 
                      className="flex items-center justify-between bg-background rounded-md border border-orange-200 p-3"
                      data-testid={`deferred-item-${dw.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dw.serviceName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {dw.estimatedPrice && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${parseFloat(dw.estimatedPrice).toFixed(2)}
                            </span>
                          )}
                          {dw.laborHours && (
                            <span>{dw.laborHours} hrs</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddDeferredToRO(dw)}
                        className="ml-2 gap-1"
                        data-testid={`btn-add-deferred-${dw.id}`}
                      >
                        <Plus className="w-3 h-3" />
                        Add to RO
                      </Button>
                    </div>
                  ))}
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

      {/* PartsTech Parts Search Dialog */}
      <PartstechDialog
        isOpen={isPartstechOpen}
        onClose={() => {
          setIsPartstechOpen(false);
          setPartstechJobId(null);
        }}
        vehicle={vehicle}
        onSelect={handleAddFromPartstech}
      />

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
