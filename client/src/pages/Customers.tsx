import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useVehiclesByCustomer, useDeferredWorkByVehicle, useUpdateDeferredWork, useRepairOrdersByVehicle } from '@/lib/hooks';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Phone, Mail, MapPin, Loader2, Pencil, ChevronDown, ChevronRight, Car, AlertTriangle, Wrench, DollarSign, Calendar, CheckCircle, X, Clock, FileText, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Customer, Vehicle, DeferredWork, RepairOrder } from '@shared/schema';

function VehicleDeferredWork({ vehicleId }: { vehicleId: string }) {
  const { data: deferredWork = [], isLoading } = useDeferredWorkByVehicle(vehicleId);
  const updateDeferredWork = useUpdateDeferredWork();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pendingWork = deferredWork.filter((dw: DeferredWork) => dw.status === 'PENDING');
  
  if (isLoading || pendingWork.length === 0) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'CONTACTED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Phone className="w-3 h-3 mr-1" />Contacted</Badge>;
      case 'CONVERTED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Converted</Badge>;
      case 'DISMISSED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200"><X className="w-3 h-3 mr-1" />Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const parseLineItems = (notes: string | null): any[] => {
    if (!notes) return [];
    try {
      return JSON.parse(notes);
    } catch {
      return [];
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-orange-200">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-orange-700">
        <AlertTriangle className="w-4 h-4" />
        Deferred Work ({pendingWork.length})
      </div>
      <div className="space-y-2">
        {pendingWork.map((dw: DeferredWork) => {
          const lineItems = parseLineItems(dw.notes);
          return (
            <div
              key={dw.id}
              className="bg-orange-50 border border-orange-200 rounded-md p-3"
              data-testid={`deferred-work-${dw.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-sm">{dw.serviceName}</span>
                    {getStatusBadge(dw.status)}
                  </div>
                  {dw.reason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      "{dw.reason}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${parseFloat(dw.estimatedPrice || '0').toFixed(2)}
                    </span>
                    {dw.declinedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Declined: {format(new Date(dw.declinedAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => updateDeferredWork.mutate({ id: dw.id, updates: { status: 'CONTACTED' } })}
                    data-testid={`btn-contact-${dw.id}`}
                  >
                    Mark Contacted
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    onClick={() => updateDeferredWork.mutate({ id: dw.id, updates: { status: 'DISMISSED' } })}
                    data-testid={`btn-dismiss-${dw.id}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {expandedId === dw.id && lineItems.length > 0 && (
                <div className="mt-3 pt-2 border-t border-orange-200">
                  <div className="text-xs font-medium mb-1">Line Items:</div>
                  <div className="space-y-1">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.description}</span>
                        <span>${parseFloat(item.total || '0').toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button 
                className="text-xs text-orange-600 hover:text-orange-700 mt-2"
                onClick={() => setExpandedId(expandedId === dw.id ? null : dw.id)}
                data-testid={`btn-expand-${dw.id}`}
              >
                {expandedId === dw.id ? 'Hide details' : 'Show details'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VehicleServiceHistory({ vehicleId }: { vehicleId: string }) {
  const { data: repairOrders = [], isLoading } = useRepairOrdersByVehicle(vehicleId);

  if (isLoading) {
    return (
      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading service history...
      </div>
    );
  }

  if (repairOrders.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
          <History className="w-4 h-4" />
          No service history
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'INVOICED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'IN_PROGRESS':
      case 'WAITING_FOR_PARTS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const calculateTotal = (ro: RepairOrder): number => {
    if (!ro.jobs || !Array.isArray(ro.jobs)) return 0;
    return ro.jobs.reduce((total: number, job: any) => {
      if (!job.lineItems || !Array.isArray(job.lineItems)) return total;
      return total + job.lineItems.reduce((jobTotal: number, item: any) => {
        return jobTotal + (item.quantity * item.unitPrice);
      }, 0);
    }, 0);
  };

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <History className="w-4 h-4 text-primary" />
        Service History ({repairOrders.length})
      </div>
      <div className="space-y-2">
        {repairOrders.map((ro: RepairOrder) => (
          <div
            key={ro.id}
            className="bg-muted/50 border rounded-md p-3"
            data-testid={`service-history-${ro.id}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">RO #{ro.roNumber}</span>
                  <Badge variant="outline" className={getStatusColor(ro.status)}>
                    {ro.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(ro.createdAt), 'MMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${calculateTotal(ro).toFixed(2)}
                  </span>
                  {ro.odometerIn && (
                    <span>
                      {ro.odometerIn.toLocaleString()} mi
                    </span>
                  )}
                </div>
                {ro.jobs && Array.isArray(ro.jobs) && ro.jobs.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Services: </span>
                    {ro.jobs.map((job: any) => job.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerVehicles({ customerId }: { customerId: string }) {
  const { data: vehicles = [], isLoading } = useVehiclesByCustomer(customerId);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading vehicles...
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="p-4 text-muted-foreground text-sm">
        No vehicles on file for this customer.
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30">
      <div className="text-sm font-medium mb-3 flex items-center gap-2">
        <Car className="w-4 h-4" />
        Vehicles ({vehicles.length})
      </div>
      <div className="grid gap-2">
        {vehicles.map((vehicle: Vehicle) => (
          <div 
            key={vehicle.id} 
            className="bg-background p-3 rounded-md border"
            data-testid={`vehicle-card-${vehicle.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-4">
                    {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
                    {vehicle.licensePlate && <span>Plate: {vehicle.licensePlate}</span>}
                    {vehicle.color && <span>Color: {vehicle.color}</span>}
                  </div>
                </div>
              </div>
              {(vehicle.engineCylinders || vehicle.engineDisplacement) && (
                <div className="text-sm text-muted-foreground">
                  {[vehicle.engineCylinders, vehicle.engineDisplacement].filter(Boolean).join(' ')}
                </div>
              )}
            </div>
            <VehicleDeferredWork vehicleId={vehicle.id} />
            <VehicleServiceHistory vehicleId={vehicle.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Debounce search to prevent focus loss and excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data: customers = [], isLoading } = useCustomers(debouncedSearch || undefined);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    marketingConsent: false,
  });

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    try {
      await updateCustomer.mutateAsync({
        id: editingCustomer.id,
        updates: {
          firstName: editingCustomer.firstName,
          lastName: editingCustomer.lastName,
          email: editingCustomer.email || undefined,
          phone: editingCustomer.phone || undefined,
          address: editingCustomer.address || undefined,
          marketingConsent: editingCustomer.marketingConsent,
        },
      });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      await createCustomer.mutateAsync(newCustomer as any);
      setIsDialogOpen(false);
      setNewCustomer({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        marketingConsent: false,
      });
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const toggleCustomerExpand = (customerId: string) => {
    setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId);
  };

  if (isLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Directory of all customers and their fleet. Click a row to see vehicles.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-customer">
              <Plus className="w-4 h-4" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Enter customer information to add them to your database.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    data-testid="input-first-name"
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    data-testid="input-last-name"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  data-testid="input-address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketingConsent"
                  data-testid="checkbox-marketing"
                  checked={newCustomer.marketingConsent}
                  onCheckedChange={(checked) => setNewCustomer({ ...newCustomer, marketingConsent: !!checked })}
                />
                <Label htmlFor="marketingConsent">Consent to marketing communications</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateCustomer} 
                disabled={createCustomer.isPending}
                data-testid="button-save-customer"
              >
                {createCustomer.isPending ? 'Saving...' : 'Save Customer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search name, email, phone..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-customers"
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No customers found. Add your first customer!
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <React.Fragment key={customer.id}>
                  <TableRow 
                    data-testid={`row-customer-${customer.id}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleCustomerExpand(customer.id)}
                  >
                    <TableCell className="w-8">
                      {expandedCustomerId === customer.id ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.firstName} {customer.lastName}</span>
                        {customer.marketingConsent && (
                          <span className="text-[10px] text-green-600 bg-green-50 w-fit px-1.5 rounded">Marketing Opt-In</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {customer.phone || '-'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {customer.email || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {customer.address || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCustomer(customer);
                        }}
                        data-testid={`button-edit-${customer.id}`}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedCustomerId === customer.id && (
                    <TableRow key={`${customer.id}-vehicles`}>
                      <TableCell colSpan={6} className="p-0">
                        <CustomerVehicles customerId={customer.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information.
            </DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    data-testid="input-edit-first-name"
                    value={editingCustomer.firstName}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    data-testid="input-edit-last-name"
                    value={editingCustomer.lastName}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  data-testid="input-edit-email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  data-testid="input-edit-phone"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  data-testid="input-edit-address"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-marketingConsent"
                  data-testid="checkbox-edit-marketing"
                  checked={editingCustomer.marketingConsent}
                  onCheckedChange={(checked) => setEditingCustomer({ ...editingCustomer, marketingConsent: !!checked })}
                />
                <Label htmlFor="edit-marketingConsent">Consent to marketing communications</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateCustomer} 
              disabled={updateCustomer.isPending}
              data-testid="button-save-edit-customer"
            >
              {updateCustomer.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
