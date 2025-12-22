import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useWorkflows, useLocations } from '@/lib/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Pencil,
  Check,
  X,
  Loader2,
  Building2,
  Settings as SettingsIcon,
  DollarSign,
  Megaphone,
  Palette,
  Wrench,
  Save,
  Package,
  Clock,
  Upload,
  Database,
  ArrowRight,
  Plug,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { ObjectUploader } from '@/components/ObjectUploader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ProtractorIntegration } from '@/components/ProtractorIntegration';

interface WorkflowStage {
  id: string;
  label: string;
  color: string;
  type: 'SYSTEM' | 'CUSTOM';
  order: number;
  isEnabled?: boolean;
}

type SettingsTab = 'shop' | 'ro' | 'markups' | 'marketing' | 'branding' | 'workflows' | 'cannedjobs' | 'integrations' | 'import';

export default function Settings() {
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows();
  const [activeTab, setActiveTab] = useState<SettingsTab>('shop');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const { data: allSettings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery({
    queryKey: ['settings', 'all', selectedLocationId],
    queryFn: () => apiRequest(`/api/settings/all/${selectedLocationId}`),
    enabled: !!selectedLocationId,
  });

  const isLoading = locationsLoading || workflowsLoading;

  if (isLoading || !locations.length) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const selectedLocation = locations.find(l => l.id === selectedLocationId) || locations[0];

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure shop preferences and system options.
          </p>
        </div>

        {locations.length > 1 && (
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[280px]" data-testid="select-location">
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
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9 bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="shop" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-shop-profile">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Shop Profile</span>
          </TabsTrigger>
          <TabsTrigger value="ro" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-ro-settings">
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">RO Settings</span>
          </TabsTrigger>
          <TabsTrigger value="markups" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-markups">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Markups</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-marketing">
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">Marketing</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-branding">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="cannedjobs" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-canned-jobs">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Canned Jobs</span>
          </TabsTrigger>
          <TabsTrigger value="workflows" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-workflows">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Workflows</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-integrations">
            <Plug className="w-4 h-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-import">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-6">
          <ShopProfileTab 
            location={selectedLocation} 
            onSave={() => refetchSettings()} 
          />
        </TabsContent>

        <TabsContent value="ro" className="space-y-6">
          <ROSettingsTab 
            locationId={selectedLocationId}
            settings={allSettings}
            onRefresh={() => refetchSettings()}
          />
        </TabsContent>

        <TabsContent value="markups" className="space-y-6">
          <MarkupsTab 
            locationId={selectedLocationId}
            settings={allSettings}
            onRefresh={() => refetchSettings()}
          />
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <MarketingTab 
            locationId={selectedLocationId}
            settings={allSettings}
            onRefresh={() => refetchSettings()}
          />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <BrandingTab 
            settings={allSettings}
            onRefresh={() => refetchSettings()}
          />
        </TabsContent>

        <TabsContent value="cannedjobs" className="space-y-6">
          <CannedJobsTab 
            locationId={selectedLocationId}
            settings={allSettings}
          />
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <WorkflowsTab workflows={workflows} />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsTab locationId={selectedLocationId} />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <DataImportTab locationId={selectedLocationId} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function ShopProfileTab({ location, onSave }: { location: any; onSave: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: location.name || '',
    address: location.address || '',
    city: location.city || '',
    state: location.state || '',
    zip: location.zip || '',
    phone: location.phone || '',
    email: location.email || '',
    website: location.website || '',
    taxId: location.taxId || '',
    licenseNumber: location.licenseNumber || '',
    hoursOfOperation: location.hoursOfOperation || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/locations/${location.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Shop profile updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onSave();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating shop profile', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Shop Information</CardTitle>
          <CardDescription>Basic information about your shop location.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name</Label>
              <Input 
                id="name" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-shop-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                data-testid="input-shop-phone"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input 
              id="address" 
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              data-testid="input-shop-address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input 
                id="city" 
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                data-testid="input-shop-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input 
                id="state" 
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                data-testid="input-shop-state"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input 
                id="zip" 
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                data-testid="input-shop-zip"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-shop-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input 
                id="website" 
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://"
                data-testid="input-shop-website"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / EIN</Label>
              <Input 
                id="taxId" 
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                data-testid="input-shop-tax-id"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Business License #</Label>
              <Input 
                id="licenseNumber" 
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                data-testid="input-shop-license"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Hours of Operation</Label>
            <Textarea 
              id="hours" 
              value={formData.hoursOfOperation}
              onChange={(e) => setFormData({ ...formData, hoursOfOperation: e.target.value })}
              placeholder="Mon-Fri: 8am-6pm&#10;Sat: 9am-3pm&#10;Sun: Closed"
              rows={4}
              data-testid="input-shop-hours"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-shop-profile">
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ROSettingsTab({ locationId, settings, onRefresh }: { locationId: string; settings: any; onRefresh: () => void }) {
  const { toast } = useToast();

  return (
    <div className="grid gap-6">
      <LaborRatesSection locationId={locationId} rates={settings?.laborRates || []} onRefresh={onRefresh} />
      <ShopFeesSection locationId={locationId} fees={settings?.shopFees || []} onRefresh={onRefresh} />
      <DiscountsSection locationId={locationId} discounts={settings?.discounts || []} onRefresh={onRefresh} />
      <TaxSettingsSection locationId={locationId} settings={settings?.taxSettings} onRefresh={onRefresh} />
      <JobCategoriesSection locationId={locationId} categories={settings?.jobCategories || []} onRefresh={onRefresh} />
      <PaymentTypesSection locationId={locationId} types={settings?.paymentTypes || []} onRefresh={onRefresh} />
    </div>
  );
}

function LaborRatesSection({ locationId, rates, onRefresh }: { locationId: string; rates: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState({ name: '', rate: '', isDefault: false });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/labor-rates', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Labor rate added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewRate({ name: '', rate: '', isDefault: false });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding labor rate', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/labor-rates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Labor rate deleted' });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting labor rate', description: error.message, variant: 'destructive' });
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newRate.name,
      rate: parseFloat(newRate.rate) || 0,
      isDefault: newRate.isDefault,
      sortOrder: rates.length,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Labor Rates</CardTitle>
          <CardDescription>Configure different labor rate tiers for your shop.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-labor-rate">
              <Plus className="w-4 h-4" /> Add Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Labor Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rate Name</Label>
                <Input 
                  placeholder="e.g. Standard, Diagnostic, Heavy Line"
                  value={newRate.name}
                  onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                  data-testid="input-labor-rate-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Rate ($/hr)</Label>
                <Input 
                  type="number"
                  placeholder="125.00"
                  value={newRate.rate}
                  onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                  data-testid="input-labor-rate-value"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="isDefault" 
                  checked={newRate.isDefault}
                  onCheckedChange={(checked) => setNewRate({ ...newRate, isDefault: checked })}
                />
                <Label htmlFor="isDefault">Set as default rate</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newRate.name || !newRate.rate || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Rate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {rates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No labor rates configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id} data-testid={`row-labor-rate-${rate.id}`}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell>${Number(rate.rate).toFixed(2)}/hr</TableCell>
                  <TableCell>
                    {rate.isDefault && <Badge variant="secondary">Default</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(rate.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ShopFeesSection({ locationId, fees, onRefresh }: { locationId: string; fees: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFee, setNewFee] = useState({ name: '', type: 'percentage', value: '', appliesTo: 'labor', taxable: true, autoApply: true });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/shop-fees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Shop fee added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewFee({ name: '', type: 'percentage', value: '', appliesTo: 'labor', taxable: true, autoApply: true });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding shop fee', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/shop-fees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Shop fee deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newFee.name,
      type: newFee.type,
      value: parseFloat(newFee.value) || 0,
      appliesTo: newFee.appliesTo,
      isTaxable: newFee.taxable,
      autoApply: newFee.autoApply,
      sortOrder: fees.length,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Shop Fees</CardTitle>
          <CardDescription>Configure automatic fees like shop supplies, EPA, or hazmat fees.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-shop-fee">
              <Plus className="w-4 h-4" /> Add Fee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Shop Fee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Fee Name</Label>
                <Input 
                  placeholder="e.g. Shop Supplies, EPA Fee"
                  value={newFee.name}
                  onChange={(e) => setNewFee({ ...newFee, name: e.target.value })}
                  data-testid="input-shop-fee-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newFee.type} onValueChange={(v) => setNewFee({ ...newFee, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{newFee.type === 'percentage' ? 'Percentage' : 'Amount'}</Label>
                  <Input 
                    type="number"
                    placeholder={newFee.type === 'percentage' ? '3' : '25.00'}
                    value={newFee.value}
                    onChange={(e) => setNewFee({ ...newFee, value: e.target.value })}
                    data-testid="input-shop-fee-value"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={newFee.appliesTo} onValueChange={(v) => setNewFee({ ...newFee, appliesTo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor Only</SelectItem>
                    <SelectItem value="parts">Parts Only</SelectItem>
                    <SelectItem value="subtotal">Total Subtotal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="taxable" 
                    checked={newFee.taxable}
                    onCheckedChange={(checked) => setNewFee({ ...newFee, taxable: checked })}
                  />
                  <Label htmlFor="taxable">Taxable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="autoApply" 
                    checked={newFee.autoApply}
                    onCheckedChange={(checked) => setNewFee({ ...newFee, autoApply: checked })}
                  />
                  <Label htmlFor="autoApply">Auto Apply</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newFee.name || !newFee.value || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Fee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {fees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No shop fees configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>Auto Apply</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id} data-testid={`row-shop-fee-${fee.id}`}>
                  <TableCell className="font-medium">{fee.name}</TableCell>
                  <TableCell>
                    {fee.type === 'percentage' ? `${Number(fee.value)}%` : `$${Number(fee.value).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="capitalize">{fee.appliesTo}</TableCell>
                  <TableCell>{fee.isTaxable ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{fee.autoApply ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(fee.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DiscountsSection({ locationId, discounts, onRefresh }: { locationId: string; discounts: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDiscount, setNewDiscount] = useState({ name: '', code: '', type: 'percentage', value: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/discounts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Discount added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewDiscount({ name: '', code: '', type: 'percentage', value: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding discount', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/discounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Discount deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newDiscount.name,
      code: newDiscount.code || null,
      type: newDiscount.type,
      value: parseFloat(newDiscount.value) || 0,
      isActive: true,
      sortOrder: discounts.length,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Discounts</CardTitle>
          <CardDescription>Create discount presets for quick application on invoices.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-discount">
              <Plus className="w-4 h-4" /> Add Discount
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Discount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Discount Name</Label>
                <Input 
                  placeholder="e.g. Senior Discount, Military"
                  value={newDiscount.name}
                  onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                  data-testid="input-discount-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Code (optional)</Label>
                <Input 
                  placeholder="e.g. SENIOR10"
                  value={newDiscount.code}
                  onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value })}
                  data-testid="input-discount-code"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newDiscount.type} onValueChange={(v) => setNewDiscount({ ...newDiscount, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{newDiscount.type === 'percentage' ? 'Percentage' : 'Amount'}</Label>
                  <Input 
                    type="number"
                    placeholder={newDiscount.type === 'percentage' ? '10' : '25.00'}
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                    data-testid="input-discount-value"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newDiscount.name || !newDiscount.value || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Discount
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {discounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No discounts configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.map((discount) => (
                <TableRow key={discount.id} data-testid={`row-discount-${discount.id}`}>
                  <TableCell className="font-medium">{discount.name}</TableCell>
                  <TableCell>{discount.code || '-'}</TableCell>
                  <TableCell>
                    {discount.type === 'percentage' ? `${Number(discount.value)}%` : `$${Number(discount.value).toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={discount.isActive ? 'default' : 'secondary'}>
                      {discount.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(discount.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function TaxSettingsSection({ locationId, settings, onRefresh }: { locationId: string; settings: any; onRefresh: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    salesTaxRate: settings?.salesTaxRate || '0',
    tireTaxRate: settings?.tireTaxRate || '0',
    taxLabor: settings?.taxLabor ?? true,
    taxParts: settings?.taxParts ?? true,
    taxTires: settings?.taxTires ?? true,
    taxFees: settings?.taxFees ?? false,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/tax', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Tax settings saved' });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving tax settings', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      locationId,
      salesTaxRate: parseFloat(formData.salesTaxRate) || 0,
      tireTaxRate: parseFloat(formData.tireTaxRate) || 0,
      taxLabor: formData.taxLabor,
      taxParts: formData.taxParts,
      taxTires: formData.taxTires,
      taxFees: formData.taxFees,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Settings</CardTitle>
        <CardDescription>Configure sales tax rates and what items are taxable.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="salesTax">Sales Tax Rate (%)</Label>
            <Input 
              id="salesTax"
              type="number"
              step="0.001"
              value={formData.salesTaxRate}
              onChange={(e) => setFormData({ ...formData, salesTaxRate: e.target.value })}
              data-testid="input-sales-tax-rate"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tireTax">Tire Tax Rate (%)</Label>
            <Input 
              id="tireTax"
              type="number"
              step="0.001"
              value={formData.tireTaxRate}
              onChange={(e) => setFormData({ ...formData, tireTaxRate: e.target.value })}
              data-testid="input-tire-tax-rate"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Taxable Items</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="taxLabor"
                checked={formData.taxLabor}
                onCheckedChange={(checked) => setFormData({ ...formData, taxLabor: checked })}
              />
              <Label htmlFor="taxLabor">Labor</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="taxParts"
                checked={formData.taxParts}
                onCheckedChange={(checked) => setFormData({ ...formData, taxParts: checked })}
              />
              <Label htmlFor="taxParts">Parts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="taxTires"
                checked={formData.taxTires}
                onCheckedChange={(checked) => setFormData({ ...formData, taxTires: checked })}
              />
              <Label htmlFor="taxTires">Tires</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="taxFees"
                checked={formData.taxFees}
                onCheckedChange={(checked) => setFormData({ ...formData, taxFees: checked })}
              />
              <Label htmlFor="taxFees">Fees</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-tax-settings">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Tax Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function JobCategoriesSection({ locationId, categories, onRefresh }: { locationId: string; categories: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ code: '', name: '', description: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/job-categories', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Job category added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewCategory({ code: '', name: '', description: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding job category', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/job-categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Job category deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      code: newCategory.code,
      name: newCategory.name,
      description: newCategory.description || null,
      sortOrder: categories.length,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Job Categories</CardTitle>
          <CardDescription>Categorize jobs for reporting and organization.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-job-category">
              <Plus className="w-4 h-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Job Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input 
                    placeholder="e.g. MAINT"
                    value={newCategory.code}
                    onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value.toUpperCase() })}
                    data-testid="input-category-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    placeholder="e.g. Maintenance"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    data-testid="input-category-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input 
                  placeholder="Routine maintenance services..."
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  data-testid="input-category-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newCategory.code || !newCategory.name || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No job categories configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} data-testid={`row-job-category-${cat.id}`}>
                  <TableCell>
                    <Badge variant="outline">{cat.code}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentTypesSection({ locationId, types, onRefresh }: { locationId: string; types: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newType, setNewType] = useState({ name: '', processingFee: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/payment-types', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Payment type added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewType({ name: '', processingFee: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding payment type', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/payment-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Payment type deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newType.name,
      processingFee: parseFloat(newType.processingFee) || 0,
      isActive: true,
      sortOrder: types.length,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payment Types</CardTitle>
          <CardDescription>Configure accepted payment methods and processing fees.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-payment-type">
              <Plus className="w-4 h-4" /> Add Payment Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Payment Type Name</Label>
                <Input 
                  placeholder="e.g. Cash, Credit Card, Check"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  data-testid="input-payment-type-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Processing Fee (%)</Label>
                <Input 
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.9 for credit cards"
                  value={newType.processingFee}
                  onChange={(e) => setNewType({ ...newType, processingFee: e.target.value })}
                  data-testid="input-payment-type-fee"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newType.name || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Payment Type
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {types.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No payment types configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Processing Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id} data-testid={`row-payment-type-${type.id}`}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{Number(type.processingFee) > 0 ? `${type.processingFee}%` : 'None'}</TableCell>
                  <TableCell>
                    <Badge variant={type.isActive ? 'default' : 'secondary'}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(type.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MarkupsTab({ locationId, settings, onRefresh }: { locationId: string; settings: any; onRefresh: () => void }) {
  return (
    <div className="grid gap-6">
      <PartsMatrixSection locationId={locationId} matrices={settings?.partsMatrices || []} onRefresh={onRefresh} />
      <LaborMatrixSection locationId={locationId} matrices={settings?.laborMatrices || []} onRefresh={onRefresh} />
    </div>
  );
}

function PartsMatrixSection({ locationId, matrices, onRefresh }: { locationId: string; matrices: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMatrix, setNewMatrix] = useState({ name: '', costMin: '', costMax: '', markup: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/parts-matrix', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Parts markup tier added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewMatrix({ name: '', costMin: '', costMax: '', markup: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding parts markup', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/parts-matrix/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Parts markup tier deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newMatrix.name,
      costMin: parseFloat(newMatrix.costMin) || 0,
      costMax: parseFloat(newMatrix.costMax) || null,
      markupPercent: parseFloat(newMatrix.markup) || 0,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Parts Markup Matrix</CardTitle>
          <CardDescription>Configure automatic markup percentages based on part cost ranges.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-parts-markup">
              <Plus className="w-4 h-4" /> Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Parts Markup Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tier Name</Label>
                <Input 
                  placeholder="e.g. Low Cost Parts"
                  value={newMatrix.name}
                  onChange={(e) => setNewMatrix({ ...newMatrix, name: e.target.value })}
                  data-testid="input-parts-tier-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost From ($)</Label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    value={newMatrix.costMin}
                    onChange={(e) => setNewMatrix({ ...newMatrix, costMin: e.target.value })}
                    data-testid="input-parts-cost-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cost To ($)</Label>
                  <Input 
                    type="number"
                    placeholder="25.00"
                    value={newMatrix.costMax}
                    onChange={(e) => setNewMatrix({ ...newMatrix, costMax: e.target.value })}
                    data-testid="input-parts-cost-max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Markup Percentage (%)</Label>
                <Input 
                  type="number"
                  placeholder="50"
                  value={newMatrix.markup}
                  onChange={(e) => setNewMatrix({ ...newMatrix, markup: e.target.value })}
                  data-testid="input-parts-markup"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newMatrix.name || !newMatrix.markup || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Tier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {matrices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No parts markup tiers configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier Name</TableHead>
                <TableHead>Cost Range</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrices.map((matrix) => (
                <TableRow key={matrix.id} data-testid={`row-parts-matrix-${matrix.id}`}>
                  <TableCell className="font-medium">{matrix.name}</TableCell>
                  <TableCell>
                    ${Number(matrix.costMin).toFixed(2)} - {matrix.costMax ? `$${Number(matrix.costMax).toFixed(2)}` : 'No limit'}
                  </TableCell>
                  <TableCell>{matrix.markupPercent}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(matrix.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LaborMatrixSection({ locationId, matrices, onRefresh }: { locationId: string; matrices: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMatrix, setNewMatrix] = useState({ name: '', hoursMin: '', hoursMax: '', markup: '' });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/labor-matrix', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Labor markup tier added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewMatrix({ name: '', hoursMin: '', hoursMax: '', markup: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding labor markup', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/labor-matrix/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Labor markup tier deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newMatrix.name,
      hoursMin: parseFloat(newMatrix.hoursMin) || 0,
      hoursMax: parseFloat(newMatrix.hoursMax) || null,
      markupPercent: parseFloat(newMatrix.markup) || 0,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Labor Markup Matrix</CardTitle>
          <CardDescription>Configure automatic markup percentages based on labor hours.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-labor-markup">
              <Plus className="w-4 h-4" /> Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Labor Markup Tier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tier Name</Label>
                <Input 
                  placeholder="e.g. Quick Jobs"
                  value={newMatrix.name}
                  onChange={(e) => setNewMatrix({ ...newMatrix, name: e.target.value })}
                  data-testid="input-labor-tier-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hours From</Label>
                  <Input 
                    type="number"
                    step="0.5"
                    placeholder="0"
                    value={newMatrix.hoursMin}
                    onChange={(e) => setNewMatrix({ ...newMatrix, hoursMin: e.target.value })}
                    data-testid="input-labor-hours-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hours To</Label>
                  <Input 
                    type="number"
                    step="0.5"
                    placeholder="2.0"
                    value={newMatrix.hoursMax}
                    onChange={(e) => setNewMatrix({ ...newMatrix, hoursMax: e.target.value })}
                    data-testid="input-labor-hours-max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Markup Percentage (%)</Label>
                <Input 
                  type="number"
                  placeholder="20"
                  value={newMatrix.markup}
                  onChange={(e) => setNewMatrix({ ...newMatrix, markup: e.target.value })}
                  data-testid="input-labor-markup"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newMatrix.name || !newMatrix.markup || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Tier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {matrices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No labor markup tiers configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier Name</TableHead>
                <TableHead>Hours Range</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrices.map((matrix) => (
                <TableRow key={matrix.id} data-testid={`row-labor-matrix-${matrix.id}`}>
                  <TableCell className="font-medium">{matrix.name}</TableCell>
                  <TableCell>
                    {matrix.hoursMin} - {matrix.hoursMax ? `${matrix.hoursMax} hrs` : 'No limit'}
                  </TableCell>
                  <TableCell>{matrix.markupPercent}%</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(matrix.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MarketingTab({ locationId, settings, onRefresh }: { locationId: string; settings: any; onRefresh: () => void }) {
  return (
    <div className="grid gap-6">
      <LeadSourcesSection locationId={locationId} sources={settings?.leadSources || []} onRefresh={onRefresh} />
    </div>
  );
}

function LeadSourcesSection({ locationId, sources, onRefresh }: { locationId: string; sources: any[]; onRefresh: () => void }) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', type: 'referral' });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/lead-sources', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Lead source added' });
      onRefresh();
      setIsAddDialogOpen(false);
      setNewSource({ name: '', type: 'referral' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding lead source', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/settings/lead-sources/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Lead source deleted' });
      onRefresh();
    },
  });

  const handleAdd = () => {
    createMutation.mutate({
      locationId,
      name: newSource.name,
      type: newSource.type,
      isActive: true,
      sortOrder: sources.length,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lead Sources</CardTitle>
          <CardDescription>Track where your customers are coming from for marketing analysis.</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-lead-source">
              <Plus className="w-4 h-4" /> Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Lead Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Source Name</Label>
                <Input 
                  placeholder="e.g. Google Ads, Referral - John Smith"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  data-testid="input-lead-source-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newSource.type} onValueChange={(v) => setNewSource({ ...newSource, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="online">Online Advertising</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="print">Print/Traditional</SelectItem>
                    <SelectItem value="walkin">Walk-in</SelectItem>
                    <SelectItem value="repeat">Repeat Customer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newSource.name || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No lead sources configured yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id} data-testid={`row-lead-source-${source.id}`}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell className="capitalize">{source.type}</TableCell>
                  <TableCell>
                    <Badge variant={source.isActive ? 'default' : 'secondary'}>
                      {source.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(source.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BrandingTab({ settings, onRefresh }: { settings: any; onRefresh: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    logoUrl: settings?.orgBranding?.logoUrl || '',
    primaryColor: settings?.orgBranding?.primaryColor || '#2563EB',
    secondaryColor: settings?.orgBranding?.secondaryColor || '#1e293b',
    termsOfService: settings?.orgBranding?.termsOfService || '',
    enableWhiteLabel: settings?.orgBranding?.enableWhiteLabel || false,
    customDomain: settings?.orgBranding?.customDomain || '',
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/settings/branding', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: 'Branding settings saved' });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({ title: 'Error saving branding settings', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Branding</CardTitle>
          <CardDescription>Customize the look and feel of your BayOPS instance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Logo</Label>
            <div className="flex items-start gap-4">
              {formData.logoUrl && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <img 
                    src={formData.logoUrl.startsWith('/objects/') ? formData.logoUrl : formData.logoUrl} 
                    alt="Current logo" 
                    className="h-12 max-w-[200px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="space-y-2 flex-1">
                <ObjectUploader
                  maxFileSize={5242880}
                  allowedFileTypes={['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']}
                  onUpload={async (file) => {
                    const reader = new FileReader();
                    const base64Data = await new Promise<string>((resolve, reject) => {
                      reader.onload = () => {
                        const result = reader.result as string;
                        resolve(result.split(',')[1]);
                      };
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                    });
                    
                    const res = await apiRequest('/api/settings/branding/logo', {
                      method: 'POST',
                      body: JSON.stringify({ 
                        fileData: base64Data, 
                        contentType: file.type 
                      }),
                    });
                    setFormData({ ...formData, logoUrl: res.objectPath });
                    toast({ title: 'Logo uploaded successfully' });
                    onRefresh();
                  }}
                  buttonVariant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </ObjectUploader>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP. Max 5MB. Recommended: 200x50px</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl" className="text-sm text-muted-foreground">Or enter a logo URL directly</Label>
              <Input 
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://your-domain.com/logo.png"
                data-testid="input-logo-url"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input 
                  id="primaryColor"
                  type="color"
                  className="w-16 h-10 p-1"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  data-testid="input-primary-color"
                />
                <Input 
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input 
                  id="secondaryColor"
                  type="color"
                  className="w-16 h-10 p-1"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  data-testid="input-secondary-color"
                />
                <Input 
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms of Service / Invoice Footer</Label>
            <Textarea 
              id="terms"
              value={formData.termsOfService}
              onChange={(e) => setFormData({ ...formData, termsOfService: e.target.value })}
              placeholder="All work guaranteed for 12 months/12,000 miles. Payment due upon completion..."
              rows={4}
              data-testid="input-terms"
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">White Label Options</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableWhiteLabel"
                  checked={formData.enableWhiteLabel}
                  onCheckedChange={(checked) => setFormData({ ...formData, enableWhiteLabel: checked })}
                />
                <Label htmlFor="enableWhiteLabel">Enable White Label Mode</Label>
              </div>

              {formData.enableWhiteLabel && (
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Custom Domain</Label>
                  <Input 
                    id="customDomain"
                    value={formData.customDomain}
                    onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                    placeholder="shop.yourdomain.com"
                    data-testid="input-custom-domain"
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to configure DNS settings for your custom domain.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-branding">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Branding
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WorkflowsTab({ workflows }: { workflows: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeWorkflowId, setActiveWorkflowId] = useState('');
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (workflows.length > 0 && !activeWorkflowId) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, activeWorkflowId]);

  const createWorkflowMutation = useMutation({
    mutationFn: (name: string) => apiRequest('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: '',
        isDefault: workflows.length === 0,
        stages: [
          { id: 'check-in', label: 'Check-In', color: '#94a3b8', type: 'SYSTEM', order: 0, isEnabled: true },
          { id: 'waiting-approval', label: 'Waiting Approval', color: '#fbbf24', type: 'SYSTEM', order: 1, isEnabled: true },
          { id: 'in-progress', label: 'In Progress', color: '#2563eb', type: 'SYSTEM', order: 2, isEnabled: true },
          { id: 'ready-for-pickup', label: 'Ready for Pickup', color: '#10b981', type: 'SYSTEM', order: 3, isEnabled: true },
          { id: 'completed', label: 'Completed', color: '#6b7280', type: 'SYSTEM', order: 4, isEnabled: true },
        ],
      }),
    }),
    onSuccess: (data) => {
      toast({ title: 'Workflow created successfully' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setNewWorkflowName('');
      setIsCreateDialogOpen(false);
      if (data?.id) {
        setActiveWorkflowId(data.id);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating workflow', description: error.message, variant: 'destructive' });
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, stages }: { id: number; stages: WorkflowStage[] }) => apiRequest(`/api/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stages }),
    }),
    onSuccess: () => {
      toast({ title: 'Workflow updated' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating workflow', description: error.message, variant: 'destructive' });
    },
  });

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
  const stages = (activeWorkflow?.stages || []) as WorkflowStage[];

  const startEditing = (stage: WorkflowStage) => {
    setEditingStage(stage.id);
    setEditValue(stage.label);
  };

  const handleCreateWorkflow = () => {
    if (!newWorkflowName.trim()) return;
    createWorkflowMutation.mutate(newWorkflowName.trim());
  };

  const handleDeleteStage = (stageId: string) => {
    if (!activeWorkflow) return;
    const updatedStages = stages
      .filter(s => s.id !== stageId)
      .map((s, idx) => ({ ...s, order: idx }));
    updateWorkflowMutation.mutate({ id: activeWorkflow.id, stages: updatedStages });
  };

  const handleMoveStage = (stageId: string, direction: 'up' | 'down') => {
    if (!activeWorkflow) return;
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);
    const idx = sortedStages.findIndex(s => s.id === stageId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sortedStages.length) return;
    
    const temp = sortedStages[idx];
    sortedStages[idx] = sortedStages[newIdx];
    sortedStages[newIdx] = temp;
    
    const updatedStages = sortedStages.map((s, i) => ({ ...s, order: i }));
    updateWorkflowMutation.mutate({ id: activeWorkflow.id, stages: updatedStages });
  };

  const handleSaveStageLabel = (stageId: string) => {
    if (!activeWorkflow || !editValue.trim()) return;
    const updatedStages = stages.map(s => 
      s.id === stageId ? { ...s, label: editValue.trim() } : s
    );
    updateWorkflowMutation.mutate({ id: activeWorkflow.id, stages: updatedStages });
    setEditingStage(null);
  };

  const handleAddStage = () => {
    if (!activeWorkflow || !newStageLabel.trim()) return;
    const newStage: WorkflowStage = {
      id: `custom-${Date.now()}`,
      label: newStageLabel.trim(),
      color: '#8b5cf6',
      type: 'CUSTOM',
      order: stages.length,
      isEnabled: true,
    };
    updateWorkflowMutation.mutate({ id: activeWorkflow.id, stages: [...stages, newStage] });
    setNewStageLabel('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Workflow Editor</CardTitle>
          <CardDescription>
            Manage different workflows for different job types (e.g., Standard Repair, Quick Lube).
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="button-new-workflow">
              <Plus className="w-4 h-4" /> New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Workflow Name</label>
                <Input 
                  placeholder="e.g. Drop Off Service" 
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  data-testid="input-workflow-name"
                />
              </div>
              <Button 
                disabled={!newWorkflowName.trim() || createWorkflowMutation.isPending} 
                className="w-full" 
                onClick={handleCreateWorkflow}
                data-testid="button-create-workflow"
              >
                {createWorkflowMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  'Create Workflow'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {workflows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No workflows configured. Create your first workflow!
          </div>
        ) : (
          <Tabs value={activeWorkflowId} onValueChange={setActiveWorkflowId} className="space-y-6">
            <TabsList>
              {workflows.map(wf => (
                <TabsTrigger key={wf.id} value={wf.id} data-testid={`tab-workflow-${wf.id}`}>
                  {wf.name}
                  {wf.isDefault && <span className="ml-2 text-[10px] opacity-50">(Default)</span>}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeWorkflow && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
                   <div>
                     <h3 className="font-semibold">{activeWorkflow.name}</h3>
                     <p className="text-sm text-muted-foreground">{activeWorkflow.description}</p>
                   </div>
                   <Badge variant="outline">{stages.length} Stages</Badge>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Stage Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stages].sort((a, b) => a.order - b.order).map((stage, index) => (
                        <TableRow key={stage.id} data-testid={`row-stage-${stage.id}`}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4" 
                                disabled={index === 0 || updateWorkflowMutation.isPending}
                                onClick={() => handleMoveStage(stage.id, 'up')}
                              >
                                ▲
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4"
                                disabled={index === stages.length - 1 || updateWorkflowMutation.isPending}
                                onClick={() => handleMoveStage(stage.id, 'down')}
                              >
                                ▼
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {editingStage === stage.id ? (
                              <div className="flex items-center gap-2">
                                <Input 
                                  value={editValue} 
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-8 w-48"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveStageLabel(stage.id)}>
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStage(null)}>
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: stage.color || '#94a3b8' }}
                                />
                                {stage.label}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={stage.type === 'SYSTEM' ? 'secondary' : 'outline'}>
                              {stage.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => startEditing(stage)}>
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              {stages.length > 2 && index !== 0 && index !== stages.length - 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteStage(stage.id)}
                                  disabled={updateWorkflowMutation.isPending}
                                  data-testid={`button-delete-stage-${stage.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-4 items-end border-t pt-4">
                  <div className="grid gap-2 flex-1">
                    <label className="text-sm font-medium">Add New Stage to {activeWorkflow.name}</label>
                    <Input 
                      placeholder="e.g. Parts Ordered, Quality Check..." 
                      value={newStageLabel}
                      onChange={(e) => setNewStageLabel(e.target.value)}
                      data-testid="input-stage-name"
                    />
                  </div>
                  <Button 
                    disabled={!newStageLabel.trim() || updateWorkflowMutation.isPending} 
                    onClick={handleAddStage}
                    data-testid="button-add-stage"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Stage
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

interface CannedJobTemplate {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  categoryId?: string;
  laborHours: string;
  laborRate?: string;
  defaultNotes?: string;
  isActive: boolean;
  sortOrder: number;
  parts: CannedJobPart[];
}

interface CannedJobPart {
  id: string;
  templateId: string;
  description: string;
  partNumber?: string;
  quantity: string;
  unitCost?: string;
  unitPrice?: string;
  inventoryItemId?: string;
}

function CannedJobsTab({ locationId, settings }: { locationId: string; settings: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CannedJobTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    laborHours: '1.0',
    laborRate: '',
    defaultNotes: '',
    isActive: true,
    parts: [] as { description: string; partNumber: string; quantity: string; unitPrice: string }[],
  });

  const { data: templates = [], isLoading } = useQuery<CannedJobTemplate[]>({
    queryKey: ['canned-jobs', locationId],
    queryFn: () => apiRequest(`/api/locations/${locationId}/canned-jobs`),
    enabled: !!locationId,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['job-categories', locationId],
    queryFn: () => apiRequest(`/api/settings/job-categories/${locationId}`),
    enabled: !!locationId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/locations/${locationId}/canned-jobs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: 'Service package created successfully' });
      queryClient.invalidateQueries({ queryKey: ['canned-jobs', locationId] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating service package', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/canned-jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: 'Service package updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['canned-jobs', locationId] });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating service package', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/canned-jobs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Service package deleted' });
      queryClient.invalidateQueries({ queryKey: ['canned-jobs', locationId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting service package', description: error.message, variant: 'destructive' });
    },
  });

  const openDialog = (template?: CannedJobTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        categoryId: template.categoryId || '',
        laborHours: template.laborHours,
        laborRate: template.laborRate || '',
        defaultNotes: template.defaultNotes || '',
        isActive: template.isActive,
        parts: template.parts.map(p => ({
          description: p.description,
          partNumber: p.partNumber || '',
          quantity: p.quantity,
          unitPrice: p.unitPrice || '',
        })),
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        laborHours: '1.0',
        laborRate: '',
        defaultNotes: '',
        isActive: true,
        parts: [],
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = () => {
    const payload = {
      ...formData,
      categoryId: formData.categoryId || null,
    };
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addPart = () => {
    setFormData({
      ...formData,
      parts: [...formData.parts, { description: '', partNumber: '', quantity: '1', unitPrice: '' }],
    });
  };

  const updatePart = (index: number, field: string, value: string) => {
    const updated = [...formData.parts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, parts: updated });
  };

  const removePart = (index: number) => {
    setFormData({
      ...formData,
      parts: formData.parts.filter((_, i) => i !== index),
    });
  };

  const calculateTotal = () => {
    const laborTotal = parseFloat(formData.laborHours || '0') * parseFloat(formData.laborRate || '0');
    const partsTotal = formData.parts.reduce((sum, p) => {
      return sum + (parseFloat(p.quantity || '0') * parseFloat(p.unitPrice || '0'));
    }, 0);
    return (laborTotal + partsTotal).toFixed(2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Service Packages / Canned Jobs
          </CardTitle>
          <CardDescription>
            Pre-built service templates with labor and parts for quick RO creation.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} data-testid="button-add-canned-job">
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Service Package' : 'Create Service Package'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Package Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Oil Change - Conventional"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-canned-job-name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the service..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-canned-job-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
                  >
                    <SelectTrigger data-testid="select-canned-job-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(categories) && categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="laborHours">Labor Hours *</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.laborHours}
                    onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
                    data-testid="input-canned-job-hours"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="laborRate">Custom Labor Rate (optional)</Label>
                  <Input
                    id="laborRate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Uses shop default if blank"
                    value={formData.laborRate}
                    onChange={(e) => setFormData({ ...formData, laborRate: e.target.value })}
                    data-testid="input-canned-job-rate"
                  />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      data-testid="switch-canned-job-active"
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultNotes">Default Technician Notes</Label>
                <Textarea
                  id="defaultNotes"
                  placeholder="Notes that will appear on the RO..."
                  value={formData.defaultNotes}
                  onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                  data-testid="input-canned-job-notes"
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Parts Included</Label>
                  <Button variant="outline" size="sm" onClick={addPart} data-testid="button-add-part">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                </div>

                {formData.parts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No parts added. Click "Add Part" to include parts in this package.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.parts.map((part, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg">
                        <div className="col-span-4">
                          <Label className="text-xs">Description</Label>
                          <Input
                            placeholder="Part description"
                            value={part.description}
                            onChange={(e) => updatePart(index, 'description', e.target.value)}
                            data-testid={`input-part-description-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Part #</Label>
                          <Input
                            placeholder="Part #"
                            value={part.partNumber}
                            onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                            data-testid={`input-part-number-${index}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(index, 'quantity', e.target.value)}
                            data-testid={`input-part-quantity-${index}`}
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="$0.00"
                            value={part.unitPrice}
                            onChange={(e) => updatePart(index, 'unitPrice', e.target.value)}
                            data-testid={`input-part-price-${index}`}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePart(index)}
                            data-testid={`button-remove-part-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(formData.laborRate || formData.parts.length > 0) && (
                <div className="border-t pt-4 flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Estimated Package Total</p>
                    <p className="text-2xl font-bold">${calculateTotal()}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.laborHours || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-canned-job"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTemplate ? 'Update Package' : 'Create Package'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No service packages yet</h3>
            <p className="text-muted-foreground mb-4">
              Create pre-built service packages to speed up repair order creation.
            </p>
            <Button onClick={() => openDialog()} data-testid="button-create-first-package">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Package
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Labor Hours</TableHead>
                <TableHead className="text-right">Parts</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const category = categories.find((c: any) => c.id === template.categoryId);
                return (
                  <TableRow key={template.id} data-testid={`row-canned-job-${template.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {category ? (
                        <Badge variant="outline">{category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {template.laborHours}h
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {template.parts.length > 0 ? (
                        <Badge variant="secondary">{template.parts.length} parts</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(template)}
                          data-testid={`button-edit-canned-job-${template.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(template.id)}
                          data-testid={`button-delete-canned-job-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Available integration types
const AVAILABLE_INTEGRATIONS = [
  { id: 'partstech', name: 'PartsTech', description: 'Parts ordering and supplier integration', icon: 'package' },
  { id: 'protractor', name: 'Protractor', description: 'Import customers, vehicles, and repair orders from Protractor', icon: 'database' },
  // Future integrations can be added here:
  // { id: 'quickbooks', name: 'QuickBooks', description: 'Sync invoices and payments' },
  // { id: 'carfax', name: 'CARFAX', description: 'Service history integration' },
];

// PartsTech integration card component
function PartstechIntegrationCard() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-semibold">PartsTech Integration</h3>
            <p className="text-sm text-muted-foreground">Parts ordering and supplier management</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Active
        </Badge>
      </div>
      
      <div className="bg-slate-50 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-orange-600 text-xs font-bold">PT</span>
          </div>
          <div>
            <h4 className="font-medium text-slate-900">How It Works</h4>
            <p className="text-slate-600 mt-1">
              PartsTech opens in a popup window directly from your repair orders. 
              Log in with your existing PartsTech shop account to search parts, 
              check availability, and place orders with your connected suppliers.
            </p>
            <ul className="mt-3 space-y-1.5 text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Search parts with vehicle VIN context
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                View real-time pricing from your suppliers
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Place orders directly from repair orders
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                Browser remembers your login session
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Need a PartsTech account? Visit{' '}
          <a 
            href="https://www.partstech.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-600 hover:underline"
          >
            partstech.com
          </a>
          {' '}to sign up and connect your parts suppliers.
        </p>
      </div>
    </div>
  );
}

function IntegrationsTab({ locationId }: { locationId: string }) {
  const { data: locations = [] } = useLocations();
  const currentLocation = locations.find(l => l.id === locationId);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('partstech');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Active integrations (PartsTech and Protractor are built-in)
  const activeIntegrations = ['partstech', 'protractor'];
  const availableToAdd = AVAILABLE_INTEGRATIONS.filter(i => !activeIntegrations.includes(i.id));
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                Integrations
              </CardTitle>
              <CardDescription>
                Connect external systems and services to enhance your shop management.
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-integration">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Integration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Integration</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {availableToAdd.length > 0 ? (
                    <div className="space-y-3">
                      {availableToAdd.map(integration => (
                        <div 
                          key={integration.id}
                          className="border rounded-lg p-4 cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            // Handle adding integration
                            setAddDialogOpen(false);
                          }}
                        >
                          <h4 className="font-medium">{integration.name}</h4>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      All available integrations are already configured.
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeIntegrations.length > 1 && (
            <div className="mb-4">
              <Label>Select Integration</Label>
              <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
                <SelectTrigger className="w-[300px] mt-1" data-testid="select-integration">
                  <SelectValue placeholder="Select an integration" />
                </SelectTrigger>
                <SelectContent>
                  {activeIntegrations.map(id => {
                    const integration = AVAILABLE_INTEGRATIONS.find(i => i.id === id);
                    return (
                      <SelectItem key={id} value={id}>
                        {integration?.name || id}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {selectedIntegration === 'partstech' && (
            <PartstechIntegrationCard />
          )}
          
          {selectedIntegration === 'protractor' && (
            <ProtractorIntegration 
              locationId={locationId}
              locationName={currentLocation?.name || 'Current Location'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DataImportTab({ locationId }: { locationId: string }) {
  const [, setLocation] = useLocation();
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            One-Time Migration
          </CardTitle>
          <CardDescription>
            Import all historical data at once from another system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Protractor Migration Wizard</h3>
                <p className="text-sm text-muted-foreground">
                  Full migration of customers, vehicles, and repair order history
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setLocation('/import/protractor')}
              data-testid="button-import-protractor"
            >
              Start Migration
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
