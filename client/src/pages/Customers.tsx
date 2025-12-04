import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useVehiclesByCustomer } from '@/lib/hooks';
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
import { Plus, Search, Phone, Mail, MapPin, Loader2, Pencil, ChevronDown, ChevronRight, Car } from 'lucide-react';
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
import type { Customer, Vehicle } from '@shared/schema';

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
            className="bg-background p-3 rounded-md border flex items-center justify-between"
            data-testid={`vehicle-card-${vehicle.id}`}
          >
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
            {vehicle.engine && (
              <div className="text-sm text-muted-foreground">
                {vehicle.engine}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const { data: customers = [], isLoading } = useCustomers(search || undefined);
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
                <>
                  <TableRow 
                    key={customer.id} 
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
                </>
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
