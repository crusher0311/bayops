import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCustomers, useVehicles, useWorkflows, useCreateCustomer, useCreateVehicle, useCreateRepairOrder } from '@/lib/hooks';
import { useShopStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { VinDecoder } from '@/components/ui/vin-decoder';
import { PlateLookup } from '@/components/ui/plate-lookup';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Plus, 
  User, 
  Car, 
  FileText,
  Loader2,
  Check
} from 'lucide-react';
import { Link } from 'wouter';

export default function NewRepairOrder() {
  const [, navigate] = useLocation();
  const { currentLocationId } = useShopStore();
  const { user } = useAuthStore();
  
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const { data: workflows = [] } = useWorkflows();
  
  const createCustomer = useCreateCustomer();
  const createVehicle = useCreateVehicle();
  const createRO = useCreateRepairOrder();

  // Step management
  const [step, setStep] = useState<'customer' | 'vehicle' | 'details'>('customer');
  
  // Customer state
  const [customerTab, setCustomerTab] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });

  // Vehicle state
  const [vehicleTab, setVehicleTab] = useState<'existing' | 'new'>('existing');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [plateState, setPlateState] = useState<string>('');
  const [newVehicle, setNewVehicle] = useState({
    year: '',
    make: '',
    model: '',
    trim: '',
    vin: '',
    licensePlate: '',
    color: '',
    mileage: '',
    bodyClass: '',
    engineCylinders: '',
    engineDisplacement: '',
    fuelType: '',
    driveType: '',
    transmission: '',
    doors: '',
  });

  // RO Details state
  const [roDetails, setRoDetails] = useState({
    workflowId: '',
    odometerIn: '',
    notes: '',
  });

  // Customer vehicles filter
  const customerVehicles = vehicles.filter(v => v.customerId === selectedCustomerId);

  const handleCreateCustomer = async () => {
    try {
      const customer = await createCustomer.mutateAsync(newCustomer as any);
      setSelectedCustomerId(customer.id);
      setCustomerTab('existing');
      setStep('vehicle');
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleCreateVehicle = async () => {
    if (!selectedCustomerId) return;
    try {
      const vehicle = await createVehicle.mutateAsync({
        vin: newVehicle.vin,
        year: parseInt(newVehicle.year) || new Date().getFullYear(),
        make: newVehicle.make,
        model: newVehicle.model,
        trim: newVehicle.trim || null,
        licensePlate: newVehicle.licensePlate,
        mileage: newVehicle.mileage ? parseInt(newVehicle.mileage) : null,
        color: newVehicle.color || null,
        bodyClass: newVehicle.bodyClass || null,
        engineCylinders: newVehicle.engineCylinders || null,
        engineDisplacement: newVehicle.engineDisplacement || null,
        fuelType: newVehicle.fuelType || null,
        driveType: newVehicle.driveType || null,
        transmission: newVehicle.transmission || null,
        doors: newVehicle.doors ? parseInt(newVehicle.doors) : null,
        customerId: selectedCustomerId,
      } as any);
      setSelectedVehicleId(vehicle.id);
      setVehicleTab('existing');
      setStep('details');
    } catch (error) {
      console.error('Failed to create vehicle:', error);
    }
  };

  const handleCreateRO = async () => {
    if (!selectedCustomerId || !selectedVehicleId || !currentLocationId || !user) return;
    
    try {
      const ro = await createRO.mutateAsync({
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId,
        locationId: currentLocationId,
        advisorId: user.id,
        workflowId: roDetails.workflowId || workflows[0]?.id,
        status: 'check-in',
        odometerIn: roDetails.odometerIn ? parseInt(roDetails.odometerIn) : null,
        notes: roDetails.notes || null,
        jobs: [],
      } as any);
      
      navigate(`/ros/${ro.id}`);
    } catch (error) {
      console.error('Failed to create RO:', error);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const canProceedToVehicle = selectedCustomerId || (newCustomer.firstName && newCustomer.lastName && newCustomer.phone);
  const canProceedToDetails = selectedVehicleId || (newVehicle.year && newVehicle.make && newVehicle.model);
  const canCreateRO = selectedCustomerId && selectedVehicleId;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/ros">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Repair Order</h1>
            <p className="text-muted-foreground text-sm">
              Create a new repair order for a customer
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold ${
              step === 'customer' ? 'bg-primary border-primary text-primary-foreground' : 
              selectedCustomerId ? 'bg-green-500 border-green-500 text-white' : 'bg-muted border-muted-foreground/30'
            }`}>
              {selectedCustomerId ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={`text-sm font-medium ${step === 'customer' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Customer
            </span>
          </div>
          <div className="flex-1 h-[2px] mx-4 bg-muted" />
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold ${
              step === 'vehicle' ? 'bg-primary border-primary text-primary-foreground' : 
              selectedVehicleId ? 'bg-green-500 border-green-500 text-white' : 'bg-muted border-muted-foreground/30'
            }`}>
              {selectedVehicleId ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className={`text-sm font-medium ${step === 'vehicle' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Vehicle
            </span>
          </div>
          <div className="flex-1 h-[2px] mx-4 bg-muted" />
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold ${
              step === 'details' ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-muted-foreground/30'
            }`}>
              3
            </div>
            <span className={`text-sm font-medium ${step === 'details' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Details
            </span>
          </div>
        </div>

        {/* Step 1: Customer */}
        {step === 'customer' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Select or Add Customer
              </CardTitle>
              <CardDescription>
                Choose an existing customer or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={customerTab} onValueChange={(v) => setCustomerTab(v as 'existing' | 'new')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="existing">Existing Customer</TabsTrigger>
                  <TabsTrigger value="new">New Customer</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search Customers</Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger data-testid="select-customer">
                        <SelectValue placeholder="Select a customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.firstName} {customer.lastName} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomer && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => setStep('vehicle')} 
                    disabled={!selectedCustomerId}
                    className="w-full"
                    data-testid="button-next-vehicle"
                  >
                    Continue to Vehicle
                  </Button>
                </TabsContent>

                <TabsContent value="new" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      data-testid="input-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <AddressAutocomplete
                      value={newCustomer.address}
                      onChange={(address) => setNewCustomer({ ...newCustomer, address })}
                      placeholder="Start typing address..."
                    />
                  </div>

                  <Button 
                    onClick={handleCreateCustomer} 
                    disabled={!newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone || createCustomer.isPending}
                    className="w-full"
                    data-testid="button-create-customer"
                  >
                    {createCustomer.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Customer & Continue
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Vehicle */}
        {step === 'vehicle' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Select or Add Vehicle
              </CardTitle>
              <CardDescription>
                Choose an existing vehicle or add a new one for {selectedCustomer?.firstName} {selectedCustomer?.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={vehicleTab} onValueChange={(v) => setVehicleTab(v as 'existing' | 'new')}>
                <TabsList className="mb-4">
                  <TabsTrigger value="existing">Existing Vehicle</TabsTrigger>
                  <TabsTrigger value="new">New Vehicle</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Customer's Vehicles</Label>
                    {customerVehicles.length > 0 ? (
                      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger data-testid="select-vehicle">
                          <SelectValue placeholder="Select a vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customerVehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.licensePlate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-muted-foreground">No vehicles on file for this customer</p>
                        <Button 
                          variant="link" 
                          onClick={() => setVehicleTab('new')}
                          className="mt-2"
                        >
                          Add a new vehicle
                        </Button>
                      </div>
                    )}
                  </div>

                  {selectedVehicle && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                      <p className="text-sm text-muted-foreground">VIN: {selectedVehicle.vin}</p>
                      <p className="text-sm text-muted-foreground">Plate: {selectedVehicle.licensePlate}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('customer')} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={() => setStep('details')} 
                      disabled={!selectedVehicleId}
                      className="flex-1"
                      data-testid="button-next-details"
                    >
                      Continue to Details
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="new" className="space-y-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
                    <div className="space-y-2">
                      <Label className="text-purple-700 dark:text-purple-300 font-medium">
                        License Plate Lookup (US plates only)
                      </Label>
                      <PlateLookup
                        plateValue={newVehicle.licensePlate}
                        stateValue={plateState}
                        onPlateChange={(plate) => setNewVehicle({ ...newVehicle, licensePlate: plate })}
                        onStateChange={setPlateState}
                        onLookup={(info) => {
                          setNewVehicle(prev => ({
                            ...prev,
                            vin: info.vin || prev.vin,
                            year: info.year?.toString() || prev.year,
                            make: info.make || prev.make,
                            model: info.model || prev.model,
                            trim: info.trim || prev.trim,
                            driveType: info.drivetrain || prev.driveType,
                            engineDisplacement: info.engine || prev.engineDisplacement,
                            transmission: info.transmission || prev.transmission,
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">— or —</div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="space-y-2">
                      <Label htmlFor="vin" className="text-blue-700 dark:text-blue-300 font-medium">
                        VIN (enter to auto-fill vehicle info)
                      </Label>
                      <VinDecoder
                        value={newVehicle.vin}
                        onChange={(vin) => setNewVehicle({ ...newVehicle, vin })}
                        onDecode={(info) => {
                          setNewVehicle(prev => ({
                            ...prev,
                            year: info.year || prev.year,
                            make: info.make || prev.make,
                            model: info.model || prev.model,
                            trim: info.trim || prev.trim,
                            bodyClass: info.bodyClass || prev.bodyClass,
                            engineCylinders: info.engineCylinders || prev.engineCylinders,
                            engineDisplacement: info.engineDisplacement || prev.engineDisplacement,
                            fuelType: info.fuelType || prev.fuelType,
                            driveType: info.driveType || prev.driveType,
                            transmission: info.transmission || prev.transmission,
                            doors: info.doors || prev.doors,
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year *</Label>
                      <Input
                        id="year"
                        value={newVehicle.year}
                        onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                        placeholder="2024"
                        data-testid="input-year"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="make">Make *</Label>
                      <Input
                        id="make"
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                        placeholder="Toyota"
                        data-testid="input-make"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model *</Label>
                      <Input
                        id="model"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                        placeholder="Camry"
                        data-testid="input-model"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={newVehicle.color}
                        onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                        placeholder="Silver"
                        data-testid="input-color"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Mileage (optional)</Label>
                      <Input
                        id="mileage"
                        type="number"
                        value={newVehicle.mileage}
                        onChange={(e) => setNewVehicle({ ...newVehicle, mileage: e.target.value })}
                        placeholder="45000"
                        data-testid="input-mileage"
                      />
                    </div>
                  </div>

                  {(newVehicle.bodyClass || newVehicle.engineDisplacement || newVehicle.fuelType || newVehicle.driveType) && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-3">Decoded Vehicle Specs</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {newVehicle.bodyClass && (
                          <div>
                            <span className="text-muted-foreground">Body:</span>
                            <span className="ml-1 font-medium">{newVehicle.bodyClass}</span>
                          </div>
                        )}
                        {newVehicle.engineDisplacement && (
                          <div>
                            <span className="text-muted-foreground">Engine:</span>
                            <span className="ml-1 font-medium">{newVehicle.engineDisplacement} {newVehicle.engineCylinders ? `${newVehicle.engineCylinders}cyl` : ''}</span>
                          </div>
                        )}
                        {newVehicle.fuelType && (
                          <div>
                            <span className="text-muted-foreground">Fuel:</span>
                            <span className="ml-1 font-medium">{newVehicle.fuelType}</span>
                          </div>
                        )}
                        {newVehicle.driveType && (
                          <div>
                            <span className="text-muted-foreground">Drive:</span>
                            <span className="ml-1 font-medium">{newVehicle.driveType}</span>
                          </div>
                        )}
                        {newVehicle.transmission && (
                          <div>
                            <span className="text-muted-foreground">Trans:</span>
                            <span className="ml-1 font-medium">{newVehicle.transmission}</span>
                          </div>
                        )}
                        {newVehicle.doors && (
                          <div>
                            <span className="text-muted-foreground">Doors:</span>
                            <span className="ml-1 font-medium">{newVehicle.doors}</span>
                          </div>
                        )}
                        {newVehicle.trim && (
                          <div>
                            <span className="text-muted-foreground">Trim:</span>
                            <span className="ml-1 font-medium">{newVehicle.trim}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('customer')} className="flex-1">
                      Back
                    </Button>
                    <Button 
                      onClick={handleCreateVehicle} 
                      disabled={!newVehicle.year || !newVehicle.make || !newVehicle.model || createVehicle.isPending}
                      className="flex-1"
                      data-testid="button-create-vehicle"
                    >
                      {createVehicle.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Vehicle & Continue
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Step 3: RO Details */}
        {step === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Repair Order Details
              </CardTitle>
              <CardDescription>
                Add initial details for the repair order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Customer</p>
                  <p className="font-medium">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer?.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Vehicle</p>
                  <p className="font-medium">{selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}</p>
                  <p className="text-sm text-muted-foreground">{selectedVehicle?.licensePlate}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflow">Workflow</Label>
                <Select 
                  value={roDetails.workflowId || workflows[0]?.id} 
                  onValueChange={(v) => setRoDetails({ ...roDetails, workflowId: v })}
                >
                  <SelectTrigger data-testid="select-workflow">
                    <SelectValue placeholder="Select workflow..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>
                        {wf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometer">Odometer Reading</Label>
                <Input
                  id="odometer"
                  type="number"
                  value={roDetails.odometerIn}
                  onChange={(e) => setRoDetails({ ...roDetails, odometerIn: e.target.value })}
                  placeholder="45,000"
                  data-testid="input-odometer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Initial Notes</Label>
                <Textarea
                  id="notes"
                  value={roDetails.notes}
                  onChange={(e) => setRoDetails({ ...roDetails, notes: e.target.value })}
                  placeholder="Customer concern, reason for visit..."
                  rows={3}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('vehicle')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleCreateRO} 
                  disabled={!canCreateRO || createRO.isPending}
                  className="flex-1"
                  data-testid="button-create-ro"
                >
                  {createRO.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Repair Order'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
