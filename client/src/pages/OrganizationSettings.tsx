import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Building2, 
  CreditCard, 
  MapPin, 
  Plus, 
  Users, 
  Check,
  Store
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function OrganizationSettings() {
  const { organization, locations, users } = useShopStore();
  const [newLocationName, setNewLocationName] = useState('');

  const activeLocations = locations.filter(l => l.isActive).length;
  const estimatedBill = activeLocations * 199; // Mock pricing

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription, locations, and team access.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Subscription Card */}
        <Card className="md:col-span-1 border-blue-100 bg-blue-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Subscription
            </CardTitle>
            <CardDescription>Your current plan and billing status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="font-bold text-2xl">Growth Plan</div>
                <div className="text-sm text-muted-foreground">$199 / mo per location</div>
              </div>
              <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
            </div>
            
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Locations</span>
                <span className="font-medium">{activeLocations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Invoice</span>
                <span className="font-medium">Jan 1, 2026</span>
              </div>
              <div className="flex justify-between pt-2 font-bold">
                <span>Estimated Total</span>
                <span>${estimatedBill.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="w-full">View Invoices</Button>
              <Button className="w-full">Manage Plan</Button>
            </div>
          </CardContent>
        </Card>

        {/* Org Details Card */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Organization Profile
            </CardTitle>
            <CardDescription>General settings for {organization.name}.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
               <div className="grid gap-1">
                 <label className="text-sm font-medium">Organization Name</label>
                 <Input value={organization.name} readOnly />
               </div>
               <div className="grid gap-1">
                 <label className="text-sm font-medium">Billing Email</label>
                 <Input value={organization.billingEmail} readOnly />
               </div>
               <div className="pt-2">
                 <p className="text-xs text-muted-foreground">
                   Organization ID: <span className="font-mono bg-muted px-1 py-0.5 rounded">{organization.id}</span>
                 </p>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Locations
            </CardTitle>
            <CardDescription>Manage your shops and their billing status.</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Location</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-200">
                  Adding a new location will increase your monthly subscription by <strong>$199/mo</strong>.
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location Name</label>
                  <Input 
                    placeholder="e.g. Northside Shop" 
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={!newLocationName}>
                  Confirm & Add Location
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City/State</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => {
                const staffCount = users.filter(u => u.locationIds.includes(loc.id)).length;
                
                return (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-muted rounded-md">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {loc.name}
                      </div>
                    </TableCell>
                    <TableCell>{loc.city}, {loc.state}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {staffCount} users
                      </div>
                    </TableCell>
                    <TableCell>
                      {loc.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                          <Check className="w-3 h-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Manage</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
