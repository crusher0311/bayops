import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/authStore';
import { 
  ClipboardCheck, 
  Plus, 
  FileText, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  GripVertical,
  Loader2,
  Search,
  Car,
  Calendar,
  User
} from 'lucide-react';
import { Link } from 'wouter';
import { format } from 'date-fns';

interface InspectionTemplateItem {
  id: string;
  label: string;
  category: string;
  sortOrder: number;
}

interface InspectionTemplate {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  items: InspectionTemplateItem[];
  isActive: boolean;
  createdAt: string;
}

interface InspectionResultItem {
  itemId: string;
  status: 'GREEN' | 'YELLOW' | 'RED' | null;
  finding?: string;
  recommendation?: string;
  photos?: string[];
}

interface Inspection {
  id: string;
  roId: string;
  templateId: string;
  technicianId: string;
  vehicleId?: string;
  items: InspectionResultItem[];
  notes?: string;
  customerViewable: boolean;
  shareToken?: string;
  startedAt: string;
  completedAt?: string;
}

const DEFAULT_INSPECTION_ITEMS: InspectionTemplateItem[] = [
  { id: '1', label: 'Engine Oil Level & Condition', category: 'Fluids', sortOrder: 1 },
  { id: '2', label: 'Transmission Fluid', category: 'Fluids', sortOrder: 2 },
  { id: '3', label: 'Brake Fluid', category: 'Fluids', sortOrder: 3 },
  { id: '4', label: 'Power Steering Fluid', category: 'Fluids', sortOrder: 4 },
  { id: '5', label: 'Coolant Level & Condition', category: 'Fluids', sortOrder: 5 },
  { id: '6', label: 'Windshield Washer Fluid', category: 'Fluids', sortOrder: 6 },
  { id: '7', label: 'Front Brake Pads', category: 'Brakes', sortOrder: 7 },
  { id: '8', label: 'Rear Brake Pads', category: 'Brakes', sortOrder: 8 },
  { id: '9', label: 'Front Rotors', category: 'Brakes', sortOrder: 9 },
  { id: '10', label: 'Rear Rotors', category: 'Brakes', sortOrder: 10 },
  { id: '11', label: 'Brake Lines & Hoses', category: 'Brakes', sortOrder: 11 },
  { id: '12', label: 'Parking Brake', category: 'Brakes', sortOrder: 12 },
  { id: '13', label: 'Front Left Tire', category: 'Tires & Wheels', sortOrder: 13 },
  { id: '14', label: 'Front Right Tire', category: 'Tires & Wheels', sortOrder: 14 },
  { id: '15', label: 'Rear Left Tire', category: 'Tires & Wheels', sortOrder: 15 },
  { id: '16', label: 'Rear Right Tire', category: 'Tires & Wheels', sortOrder: 16 },
  { id: '17', label: 'Spare Tire', category: 'Tires & Wheels', sortOrder: 17 },
  { id: '18', label: 'Tire Pressure', category: 'Tires & Wheels', sortOrder: 18 },
  { id: '19', label: 'Air Filter', category: 'Engine', sortOrder: 19 },
  { id: '20', label: 'Cabin Air Filter', category: 'Engine', sortOrder: 20 },
  { id: '21', label: 'Serpentine Belt', category: 'Engine', sortOrder: 21 },
  { id: '22', label: 'Battery & Terminals', category: 'Electrical', sortOrder: 22 },
  { id: '23', label: 'Headlights', category: 'Electrical', sortOrder: 23 },
  { id: '24', label: 'Tail Lights', category: 'Electrical', sortOrder: 24 },
  { id: '25', label: 'Turn Signals', category: 'Electrical', sortOrder: 25 },
  { id: '26', label: 'Brake Lights', category: 'Electrical', sortOrder: 26 },
  { id: '27', label: 'Windshield Wipers', category: 'Exterior', sortOrder: 27 },
  { id: '28', label: 'Windshield Condition', category: 'Exterior', sortOrder: 28 },
  { id: '29', label: 'Front Suspension', category: 'Suspension & Steering', sortOrder: 29 },
  { id: '30', label: 'Rear Suspension', category: 'Suspension & Steering', sortOrder: 30 },
  { id: '31', label: 'Steering Components', category: 'Suspension & Steering', sortOrder: 31 },
  { id: '32', label: 'CV Boots/Axles', category: 'Drivetrain', sortOrder: 32 },
  { id: '33', label: 'Exhaust System', category: 'Exhaust', sortOrder: 33 },
];

export default function Inspections() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('inspections');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InspectionTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    items: DEFAULT_INSPECTION_ITEMS,
  });
  const [newItemForm, setNewItemForm] = useState({ label: '', category: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const { data: templates = [], isLoading: templatesLoading } = useQuery<InspectionTemplate[]>({
    queryKey: ['inspection-templates'],
    queryFn: async () => {
      const res = await fetch('/api/inspection-templates', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  const { data: repairOrders = [] } = useQuery<any[]>({
    queryKey: ['repair-orders'],
    queryFn: async () => {
      const res = await fetch('/api/ros', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch ROs');
      return res.json();
    },
  });

  const { data: allInspections = [], isLoading: inspectionsLoading } = useQuery<Inspection[]>({
    queryKey: ['all-inspections'],
    queryFn: async () => {
      const inspections: Inspection[] = [];
      for (const ro of repairOrders) {
        const res = await fetch(`/api/inspections/ro/${ro.id}`, { credentials: 'include' });
        if (res.ok) {
          const roInspections = await res.json();
          inspections.push(...roInspections);
        }
      }
      return inspections;
    },
    enabled: repairOrders.length > 0,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; items: InspectionTemplateItem[] }) => {
      const res = await fetch('/api/inspection-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgId: user?.orgId,
          ...data,
        }),
      });
      if (!res.ok) throw new Error('Failed to create template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-templates'] });
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      toast({ title: 'Template created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/inspection-templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-templates'] });
      toast({ title: 'Template deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      items: DEFAULT_INSPECTION_ITEMS,
    });
    setEditingTemplate(null);
  };

  const handleAddItem = () => {
    if (!newItemForm.label || !newItemForm.category) return;
    
    const newItem: InspectionTemplateItem = {
      id: crypto.randomUUID(),
      label: newItemForm.label,
      category: newItemForm.category,
      sortOrder: templateForm.items.length + 1,
    };
    
    setTemplateForm({
      ...templateForm,
      items: [...templateForm.items, newItem],
    });
    setNewItemForm({ label: '', category: '' });
  };

  const handleRemoveItem = (itemId: string) => {
    setTemplateForm({
      ...templateForm,
      items: templateForm.items.filter(i => i.id !== itemId),
    });
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name) {
      toast({ title: 'Template name is required', variant: 'destructive' });
      return;
    }
    createTemplateMutation.mutate(templateForm);
  };

  const getStatusIcon = (status: 'GREEN' | 'YELLOW' | 'RED' | null) => {
    switch (status) {
      case 'GREEN':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'YELLOW':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'RED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusCounts = (items: InspectionResultItem[]) => {
    return {
      green: items.filter(i => i.status === 'GREEN').length,
      yellow: items.filter(i => i.status === 'YELLOW').length,
      red: items.filter(i => i.status === 'RED').length,
      pending: items.filter(i => !i.status).length,
    };
  };

  const categories = [...new Set(templateForm.items.map(i => i.category))];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-rajdhani">Digital Vehicle Inspections</h1>
            <p className="text-slate-400 mt-1">Manage inspection templates and view inspection history</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="inspections" className="data-[state=active]:bg-slate-700">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Inspections
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-slate-700">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inspections" className="mt-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Recent Inspections</CardTitle>
                    <CardDescription>View and manage vehicle inspections</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search inspections..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700"
                      data-testid="input-search-inspections"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inspectionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                ) : allInspections.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2">No inspections yet</p>
                    <p className="text-slate-500 text-sm">
                      Start an inspection from a Repair Order
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allInspections.map((inspection) => {
                      const ro = repairOrders.find(r => r.id === inspection.roId);
                      const template = templates.find(t => t.id === inspection.templateId);
                      const counts = getStatusCounts(inspection.items);
                      
                      return (
                        <Card 
                          key={inspection.id} 
                          className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors"
                          data-testid={`inspection-card-${inspection.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                  <Car className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-white">
                                    {ro?.roNumber || 'Unknown RO'}
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    {template?.name || 'Standard Inspection'}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    <span className="text-sm text-slate-400">{counts.green}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm text-slate-400">{counts.yellow}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-sm text-slate-400">{counts.red}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <Calendar className="w-4 h-4" />
                                  {format(new Date(inspection.startedAt), 'MMM d, yyyy')}
                                </div>
                                
                                <Badge variant={inspection.completedAt ? 'default' : 'secondary'}>
                                  {inspection.completedAt ? 'Completed' : 'In Progress'}
                                </Badge>
                                
                                <Link href={`/ros/${inspection.roId}`}>
                                  <Button variant="outline" size="sm" data-testid={`button-view-inspection-${inspection.id}`}>
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Inspection Templates</CardTitle>
                    <CardDescription>Define what items to inspect for each vehicle</CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      resetTemplateForm();
                      setIsTemplateDialogOpen(true);
                    }}
                    data-testid="button-new-template"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-4">No templates yet</p>
                    <Button 
                      onClick={() => {
                        resetTemplateForm();
                        setIsTemplateDialogOpen(true);
                      }}
                      data-testid="button-create-first-template"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Template
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <Card 
                        key={template.id} 
                        className="bg-slate-800 border-slate-700"
                        data-testid={`template-card-${template.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium text-white">{template.name}</h3>
                              {template.description && (
                                <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                {template.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this template? This cannot be undone.')) {
                                    deleteTemplateMutation.mutate(template.id);
                                  }
                                }}
                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-600/20"
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-slate-400">
                            {template.items.length} inspection items
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {[...new Set(template.items.map(i => i.category))].slice(0, 3).map((cat) => (
                              <Badge key={cat} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                            {[...new Set(template.items.map(i => i.category))].length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{[...new Set(template.items.map(i => i.category))].length - 3} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Inspection Template'}
            </DialogTitle>
            <DialogDescription>
              Define the items to inspect during a vehicle inspection
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g., Standard Multi-Point Inspection"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description (Optional)</Label>
                <Input
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Brief description of this template"
                  data-testid="input-template-description"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Inspection Items ({templateForm.items.length})</Label>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Item label (e.g., Front Brake Pads)"
                  value={newItemForm.label}
                  onChange={(e) => setNewItemForm({ ...newItemForm, label: e.target.value })}
                  className="flex-1"
                  data-testid="input-new-item-label"
                />
                <Input
                  placeholder="Category (e.g., Brakes)"
                  value={newItemForm.category}
                  onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                  className="w-48"
                  data-testid="input-new-item-category"
                />
                <Button onClick={handleAddItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg p-4 bg-slate-800/50">
                {categories.map((category) => (
                  <div key={category} className="mb-4">
                    <h4 className="font-medium text-white mb-2">{category}</h4>
                    <div className="space-y-1">
                      {templateForm.items
                        .filter(i => i.category === category)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-slate-500" />
                              <span className="text-sm text-slate-300">{item.label}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              data-testid={`button-remove-item-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate} 
              disabled={createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
