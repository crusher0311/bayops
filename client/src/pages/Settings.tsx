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
  Save
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface WorkflowStage {
  id: string;
  label: string;
  color: string;
  type: 'SYSTEM' | 'CUSTOM';
  order: number;
}

type SettingsTab = 'shop' | 'ro' | 'markups' | 'marketing' | 'branding' | 'workflows';

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
        <TabsList className="grid w-full grid-cols-6 bg-slate-100 p-1 rounded-lg">
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
          <TabsTrigger value="workflows" className="flex gap-2 data-[state=active]:bg-white" data-testid="tab-workflows">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Workflows</span>
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

        <TabsContent value="workflows" className="space-y-6">
          <WorkflowsTab workflows={workflows} />
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
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input 
              id="logoUrl"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://your-domain.com/logo.png"
              data-testid="input-logo-url"
            />
            <p className="text-xs text-muted-foreground">Recommended size: 200x50 pixels, PNG or SVG format</p>
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
  const [activeWorkflowId, setActiveWorkflowId] = useState('');
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');

  useEffect(() => {
    if (workflows.length > 0 && !activeWorkflowId) {
      setActiveWorkflowId(workflows[0].id);
    }
  }, [workflows, activeWorkflowId]);

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
  const stages = (activeWorkflow?.stages || []) as WorkflowStage[];

  const startEditing = (stage: WorkflowStage) => {
    setEditingStage(stage.id);
    setEditValue(stage.label);
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
        <Dialog>
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
              <Button disabled={!newWorkflowName} className="w-full" data-testid="button-create-workflow">
                Create Workflow
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
                                disabled={index === 0}
                              >
                                ▲
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4"
                                disabled={index === stages.length - 1}
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
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingStage(null)}>
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
                              {stage.type === 'CUSTOM' && (
                                <Button variant="ghost" size="icon">
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
                  <Button disabled={!newStageLabel} data-testid="button-add-stage">
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
