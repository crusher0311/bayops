import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useLocations } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Loader2,
  Search,
  Trash2,
  Edit,
  Package,
  Building2,
  Phone,
  Mail,
  DollarSign,
  CheckCircle,
  ShoppingCart,
  Eye,
  Send,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Vendor {
  id: string;
  orgId: string;
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  accountNumber?: string;
  address?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface PartOrder {
  id: string;
  locationId: string;
  vendorId: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  notes?: string;
  orderedAt?: string;
  expectedAt?: string;
  receivedAt?: string;
  createdAt: string;
  items?: PartOrderItem[];
}

interface PartOrderItem {
  id: string;
  partOrderId: string;
  repairOrderId?: string;
  jobId?: string;
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: string;
  unitPrice: string;
  coreCharge: string;
  status: string;
}

const ORDER_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-slate-500' },
  { value: 'ORDERED', label: 'Ordered', color: 'bg-blue-500' },
  { value: 'SHIPPED', label: 'Shipped', color: 'bg-purple-500' },
  { value: 'PARTIAL', label: 'Partial', color: 'bg-amber-500' },
  { value: 'RECEIVED', label: 'Received', color: 'bg-green-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
];

const ITEM_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'BACKORDERED', label: 'Backordered' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'RETURNED', label: 'Returned' },
];

export default function Parts() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'vendors'>('orders');
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PartOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [vendorForm, setVendorForm] = useState({
    name: '',
    code: '',
    contactName: '',
    email: '',
    phone: '',
    website: '',
    accountNumber: '',
    address: '',
    paymentTerms: '',
    notes: '',
    isActive: true,
  });

  const [orderForm, setOrderForm] = useState({
    vendorId: '',
    orderNumber: '',
    notes: '',
    expectedAt: '',
    items: [] as { partNumber: string; description: string; quantity: number; unitCost: string; unitPrice: string; coreCharge: string }[],
  });

  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/vendors', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    },
  });

  const { data: partOrders = [], isLoading: ordersLoading } = useQuery<PartOrder[]>({
    queryKey: ['part-orders', currentLocationId],
    queryFn: async () => {
      const res = await fetch(`/api/part-orders/${currentLocationId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch part orders');
      return res.json();
    },
    enabled: !!currentLocationId,
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof vendorForm) => {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create vendor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsVendorDialogOpen(false);
      resetVendorForm();
      toast({ title: 'Vendor created', description: 'The vendor has been added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof vendorForm> }) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update vendor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsVendorDialogOpen(false);
      setSelectedVendor(null);
      resetVendorForm();
      toast({ title: 'Vendor updated', description: 'The vendor has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete vendor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsVendorDialogOpen(false);
      setSelectedVendor(null);
      toast({ title: 'Vendor deleted', description: 'The vendor has been removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: typeof orderForm) => {
      const items = data.items.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 1,
        unitCost: item.unitCost || '0',
        unitPrice: item.unitPrice || '0',
        coreCharge: item.coreCharge || '0',
        status: 'PENDING',
      }));
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.unitCost) * item.quantity), 0);
      
      const res = await fetch('/api/part-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          locationId: currentLocationId,
          vendorId: data.vendorId,
          orderNumber: data.orderNumber || `PO-${Date.now()}`,
          status: 'DRAFT',
          subtotal: subtotal.toString(),
          tax: '0',
          total: subtotal.toString(),
          notes: data.notes,
          expectedAt: data.expectedAt ? new Date(data.expectedAt).toISOString() : null,
          items,
        }),
      });
      if (!res.ok) throw new Error('Failed to create part order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['part-orders', currentLocationId] });
      setIsOrderDialogOpen(false);
      resetOrderForm();
      toast({ title: 'Order created', description: 'The parts order has been created as a draft.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PartOrder> }) => {
      const res = await fetch(`/api/part-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update order');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['part-orders', currentLocationId] });
      queryClient.invalidateQueries({ queryKey: ['part-order-detail', variables.id] });
      if (variables.data.status === 'ORDERED') {
        toast({ title: 'Order placed', description: 'The order has been sent to the vendor.' });
      } else if (variables.data.status === 'RECEIVED') {
        toast({ title: 'Order received', description: 'All items have been marked as received.' });
      } else {
        toast({ title: 'Order updated', description: 'The order has been updated successfully.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const { data: orderDetail } = useQuery<PartOrder>({
    queryKey: ['part-order-detail', selectedOrder?.id],
    queryFn: async () => {
      const res = await fetch(`/api/part-orders/detail/${selectedOrder!.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch order details');
      return res.json();
    },
    enabled: !!selectedOrder?.id && isOrderDetailOpen,
  });

  const resetVendorForm = () => {
    setVendorForm({
      name: '',
      code: '',
      contactName: '',
      email: '',
      phone: '',
      website: '',
      accountNumber: '',
      address: '',
      paymentTerms: '',
      notes: '',
      isActive: true,
    });
  };

  const resetOrderForm = () => {
    setOrderForm({
      vendorId: '',
      orderNumber: '',
      notes: '',
      expectedAt: '',
      items: [],
    });
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorForm({
      name: vendor.name,
      code: vendor.code || '',
      contactName: vendor.contactName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      accountNumber: vendor.accountNumber || '',
      address: vendor.address || '',
      paymentTerms: vendor.paymentTerms || '',
      notes: vendor.notes || '',
      isActive: vendor.isActive,
    });
    setIsVendorDialogOpen(true);
  };

  const handleSubmitVendor = () => {
    if (selectedVendor) {
      updateVendorMutation.mutate({ id: selectedVendor.id, data: vendorForm });
    } else {
      createVendorMutation.mutate(vendorForm);
    }
  };

  const addOrderItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { partNumber: '', description: '', quantity: 1, unitCost: '', unitPrice: '', coreCharge: '0' }],
    }));
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const removeOrderItem = (index: number) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    return (
      <Badge className={`${statusConfig?.color || 'bg-slate-500'} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = partOrders.filter(o => {
    const vendor = vendors.find(v => v.id === o.vendorId);
    return o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (locationsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const currentLocation = locations.find(l => l.id === currentLocationId);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Ordering</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendors and track parts orders for {currentLocation?.name || 'your location'}
          </p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'vendors' ? (
            <Button onClick={() => { resetVendorForm(); setSelectedVendor(null); setIsVendorDialogOpen(true); }} className="gap-2" data-testid="button-new-vendor">
              <Plus className="w-4 h-4" />
              Add Vendor
            </Button>
          ) : (
            <Button onClick={() => { resetOrderForm(); setIsOrderDialogOpen(true); }} className="gap-2" data-testid="button-new-order">
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'orders' | 'vendors')} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
              <ShoppingCart className="w-4 h-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2" data-testid="tab-vendors">
              <Building2 className="w-4 h-4" />
              Vendors
            </TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'vendors' ? 'Search vendors...' : 'Search orders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <TabsContent value="orders" className="space-y-4">
          {ordersLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Part Orders</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Create your first parts order to start tracking vendor purchases
                </p>
                <Button onClick={() => { resetOrderForm(); setIsOrderDialogOpen(true); }} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  New Order
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => {
                    const vendor = vendors.find(v => v.id === order.vendorId);
                    return (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{vendor?.name || 'Unknown'}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>${parseFloat(order.total).toFixed(2)}</TableCell>
                        <TableCell>{order.expectedAt ? format(new Date(order.expectedAt), 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell>{format(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => { setSelectedOrder(order); setIsOrderDetailOpen(true); }}
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'DRAFT' && (
                              <Button 
                                size="sm" 
                                onClick={() => updateOrderMutation.mutate({ id: order.id, data: { status: 'ORDERED', orderedAt: new Date().toISOString() } })}
                                disabled={updateOrderMutation.isPending}
                                data-testid={`button-place-order-${order.id}`}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Place Order
                              </Button>
                            )}
                            {(order.status === 'ORDERED' || order.status === 'SHIPPED') && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateOrderMutation.mutate({ id: order.id, data: { status: 'RECEIVED', receivedAt: new Date().toISOString() } })}
                                disabled={updateOrderMutation.isPending}
                                data-testid={`button-receive-order-${order.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Receive
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          {vendorsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Vendors</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Add your first vendor to start ordering parts
                </p>
                <Button onClick={() => { resetVendorForm(); setSelectedVendor(null); setIsVendorDialogOpen(true); }} className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Vendor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map(vendor => (
                <Card key={vendor.id} className={!vendor.isActive ? 'opacity-60' : ''} data-testid={`vendor-card-${vendor.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{vendor.name}</CardTitle>
                        {vendor.code && (
                          <CardDescription>Code: {vendor.code}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditVendor(vendor)} data-testid={`button-edit-vendor-${vendor.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {vendor.contactName && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.contactName}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{vendor.email}</span>
                      </div>
                    )}
                    {vendor.accountNumber && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>Acct: {vendor.accountNumber}</span>
                      </div>
                    )}
                    {!vendor.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isVendorDialogOpen} onOpenChange={(open) => { setIsVendorDialogOpen(open); if (!open) { setSelectedVendor(null); resetVendorForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
            <DialogDescription>
              {selectedVendor ? 'Update vendor information' : 'Add a new parts vendor to your organization'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor Name *</Label>
                <Input 
                  placeholder="AutoZone"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-vendor-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input 
                  placeholder="AZ"
                  value={vendorForm.code}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, code: e.target.value }))}
                  data-testid="input-vendor-code"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input 
                  placeholder="John Smith"
                  value={vendorForm.contactName}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, contactName: e.target.value }))}
                  data-testid="input-vendor-contact"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  placeholder="(555) 123-4567"
                  value={vendorForm.phone}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, phone: e.target.value }))}
                  data-testid="input-vendor-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  placeholder="orders@vendor.com"
                  value={vendorForm.email}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-vendor-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input 
                  placeholder="https://vendor.com"
                  value={vendorForm.website}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, website: e.target.value }))}
                  data-testid="input-vendor-website"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input 
                  placeholder="ACC-12345"
                  value={vendorForm.accountNumber}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  data-testid="input-vendor-account"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input 
                  placeholder="Net 30"
                  value={vendorForm.paymentTerms}
                  onChange={(e) => setVendorForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                  data-testid="input-vendor-terms"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea 
                placeholder="123 Main St, City, State 12345"
                value={vendorForm.address}
                onChange={(e) => setVendorForm(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                data-testid="input-vendor-address"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Additional notes..."
                value={vendorForm.notes}
                onChange={(e) => setVendorForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                data-testid="input-vendor-notes"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {selectedVendor && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={deleteVendorMutation.isPending}
                    data-testid="button-delete-vendor"
                  >
                    {deleteVendorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{selectedVendor.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteVendorMutation.mutate(selectedVendor.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitVendor}
              disabled={!vendorForm.name || createVendorMutation.isPending || updateVendorMutation.isPending}
              data-testid="button-save-vendor"
            >
              {(createVendorMutation.isPending || updateVendorMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectedVendor ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderDialogOpen} onOpenChange={(open) => { setIsOrderDialogOpen(open); if (!open) resetOrderForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Parts Order</DialogTitle>
            <DialogDescription>
              Create a new parts order to send to a vendor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select
                  value={orderForm.vendorId}
                  onValueChange={(v) => setOrderForm(prev => ({ ...prev, vendorId: v }))}
                >
                  <SelectTrigger data-testid="select-vendor">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => v.isActive).map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input 
                  placeholder="Auto-generated"
                  value={orderForm.orderNumber}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                  data-testid="input-order-number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <Input 
                type="date"
                value={orderForm.expectedAt}
                onChange={(e) => setOrderForm(prev => ({ ...prev, expectedAt: e.target.value }))}
                data-testid="input-expected-date"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOrderItem} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              {orderForm.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No items added. Click "Add Item" to add parts to this order.
                </div>
              ) : (
                <div className="space-y-3">
                  {orderForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Part #</Label>
                        <Input 
                          placeholder="ABC123"
                          value={item.partNumber}
                          onChange={(e) => updateOrderItem(index, 'partNumber', e.target.value)}
                          data-testid={`input-part-number-${index}`}
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input 
                          placeholder="Brake pad set"
                          value={item.description}
                          onChange={(e) => updateOrderItem(index, 'description', e.target.value)}
                          data-testid={`input-description-${index}`}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input 
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Unit Cost</Label>
                        <Input 
                          placeholder="0.00"
                          value={item.unitCost}
                          onChange={(e) => updateOrderItem(index, 'unitCost', e.target.value)}
                          data-testid={`input-unit-cost-${index}`}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Sell Price</Label>
                        <Input 
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => updateOrderItem(index, 'unitPrice', e.target.value)}
                          data-testid={`input-unit-price-${index}`}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeOrderItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Special instructions, notes..."
                value={orderForm.notes}
                onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                data-testid="input-order-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)} data-testid="button-cancel-order">
              Cancel
            </Button>
            <Button 
              onClick={() => createOrderMutation.mutate(orderForm)}
              disabled={!orderForm.vendorId || orderForm.items.length === 0 || createOrderMutation.isPending}
              data-testid="button-create-order"
            >
              {createOrderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOrderDetailOpen} onOpenChange={(open) => { setIsOrderDetailOpen(open); if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Details - {orderDetail?.orderNumber || selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              {orderDetail && vendors.find(v => v.id === orderDetail.vendorId)?.name}
            </DialogDescription>
          </DialogHeader>

          {orderDetail && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(orderDetail.status)}
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">${parseFloat(orderDetail.total).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{format(new Date(orderDetail.createdAt), 'MMM d, yyyy')}</p>
                </div>
                {orderDetail.orderedAt && (
                  <div>
                    <p className="text-muted-foreground">Ordered</p>
                    <p>{format(new Date(orderDetail.orderedAt), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {orderDetail.expectedAt && (
                  <div>
                    <p className="text-muted-foreground">Expected</p>
                    <p>{format(new Date(orderDetail.expectedAt), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {orderDetail.receivedAt && (
                  <div>
                    <p className="text-muted-foreground">Received</p>
                    <p>{format(new Date(orderDetail.receivedAt), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {orderDetail.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{orderDetail.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Items ({orderDetail.items?.length || 0})</p>
                {orderDetail.items && orderDetail.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetail.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">{item.partNumber}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">${parseFloat(item.unitCost).toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(parseFloat(item.unitCost) * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ITEM_STATUSES.find(s => s.value === item.status)?.label || item.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No items in this order</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderDetailOpen(false)}>
              Close
            </Button>
            {orderDetail?.status === 'DRAFT' && (
              <Button 
                onClick={() => {
                  updateOrderMutation.mutate({ id: orderDetail.id, data: { status: 'ORDERED', orderedAt: new Date().toISOString() } });
                  setIsOrderDetailOpen(false);
                }}
                disabled={updateOrderMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Place Order
              </Button>
            )}
            {(orderDetail?.status === 'ORDERED' || orderDetail?.status === 'SHIPPED') && (
              <Button 
                onClick={() => {
                  updateOrderMutation.mutate({ id: orderDetail.id, data: { status: 'RECEIVED', receivedAt: new Date().toISOString() } });
                  setIsOrderDetailOpen(false);
                }}
                disabled={updateOrderMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Received
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
