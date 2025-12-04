import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useShopStore } from '@/lib/store';
import { useAuthStore } from '@/lib/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  Search, 
  Car, 
  User, 
  Check, 
  Loader2, 
  ArrowRight,
  ScanLine,
  Plus,
  Zap,
  CreditCard
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Customer, Vehicle, Workflow } from '@shared/schema';

interface VehicleDecodeResult {
  year: number;
  make: string;
  model: string;
  submodel?: string;
  engine?: string;
}

export default function QuickCheckIn() {
  const [, navigate] = useLocation();
  const { currentLocationId } = useShopStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [lookupMethod, setLookupMethod] = useState<'vin' | 'plate'>('vin');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [plateState, setPlateState] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodedVehicle, setDecodedVehicle] = useState<VehicleDecodeResult | null>(null);
  const [existingVehicle, setExistingVehicle] = useState<Vehicle | null>(null);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [step, setStep] = useState<'vin' | 'customer' | 'confirm'>('vin');

  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });

  const [odometer, setOdometer] = useState('');

  const { data: workflows = [] } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      if (!res.ok) throw new Error('Failed to fetch workflows');
      return res.json();
    },
  });

  const { data: allVehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json();
    },
  });

  const { data: allCustomers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });

  const defaultWorkflow = workflows.find(w => w.isDefault) || workflows[0];

  const decodeVin = async () => {
    if (vin.length !== 17) {
      toast({ title: 'Invalid VIN', description: 'VIN must be 17 characters', variant: 'destructive' });
      return;
    }

    setIsDecoding(true);
    try {
      const existing = allVehicles.find(v => v.vin?.toUpperCase() === vin.toUpperCase());
      
      if (existing) {
        setExistingVehicle(existing);
        const customer = allCustomers.find(c => c.id === existing.customerId);
        if (customer) {
          setExistingCustomer(customer);
          setStep('confirm');
        } else {
          setStep('customer');
        }
        setDecodedVehicle({
          year: existing.year,
          make: existing.make,
          model: existing.model,
        });
      } else {
        const res = await fetch(`/api/vin/decode?vin=${vin}`);
        if (!res.ok) throw new Error('Failed to decode VIN');
        const data = await res.json();
        setDecodedVehicle(data);
        setStep('customer');
      }
    } catch (error) {
      toast({ title: 'VIN Decode Failed', description: 'Could not decode VIN. Please enter vehicle details manually.', variant: 'destructive' });
    } finally {
      setIsDecoding(false);
    }
  };

  const lookupPlate = async () => {
    if (!plate.trim() || !plateState) {
      toast({ title: 'Missing Info', description: 'Please enter plate number and select state', variant: 'destructive' });
      return;
    }

    setIsDecoding(true);
    try {
      // First check if we have this plate in our system
      const existingByPlate = allVehicles.find(v => 
        v.licensePlate?.toUpperCase().replace(/[^A-Z0-9]/g, '') === plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      );
      
      if (existingByPlate) {
        setExistingVehicle(existingByPlate);
        setVin(existingByPlate.vin || '');
        const customer = allCustomers.find(c => c.id === existingByPlate.customerId);
        if (customer) {
          setExistingCustomer(customer);
          setStep('confirm');
        } else {
          setStep('customer');
        }
        setDecodedVehicle({
          year: existingByPlate.year,
          make: existingByPlate.make,
          model: existingByPlate.model,
        });
        return;
      }

      // Try to look up plate via API
      const res = await fetch(`/api/plate-lookup?plate=${encodeURIComponent(plate)}&state=${plateState}`);
      
      if (!res.ok) {
        const error = await res.json();
        if (res.status === 404) {
          toast({ 
            title: 'Plate Not Found', 
            description: 'No vehicle found for this plate. Try entering the VIN instead.', 
            variant: 'destructive' 
          });
        } else if (res.status === 403) {
          toast({ 
            title: 'Feature Unavailable', 
            description: 'License plate lookup requires API upgrade. Use VIN lookup instead.', 
            variant: 'destructive' 
          });
        } else {
          throw new Error(error.message || 'Plate lookup failed');
        }
        return;
      }
      
      const data = await res.json();
      
      if (data.vin) {
        setVin(data.vin);
        // Check if this VIN exists in our system
        const existingByVin = allVehicles.find(v => v.vin?.toUpperCase() === data.vin.toUpperCase());
        if (existingByVin) {
          setExistingVehicle(existingByVin);
          const customer = allCustomers.find(c => c.id === existingByVin.customerId);
          if (customer) {
            setExistingCustomer(customer);
            setStep('confirm');
          } else {
            setStep('customer');
          }
        } else {
          setStep('customer');
        }
      }
      
      setDecodedVehicle({
        year: data.year,
        make: data.make,
        model: data.model,
        submodel: data.trim,
      });
      
      if (!existingCustomer && step !== 'confirm') {
        setStep('customer');
      }
    } catch (error: any) {
      toast({ 
        title: 'Plate Lookup Failed', 
        description: error.message || 'Could not look up plate. Try entering VIN instead.', 
        variant: 'destructive' 
      });
    } finally {
      setIsDecoding(false);
    }
  };

  const createCustomerMutation = useMutation({
    mutationFn: async (customer: typeof newCustomer) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      if (!res.ok) throw new Error('Failed to create customer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (vehicle: any) => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      if (!res.ok) throw new Error('Failed to create vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const createROMutation = useMutation({
    mutationFn: async (ro: any) => {
      const res = await fetch('/api/repair-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ro),
      });
      if (!res.ok) throw new Error('Failed to create repair order');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repair-orders'] });
      toast({ title: 'Success!', description: `RO #${data.roNumber} created` });
      navigate(`/ros/${data.id}`);
    },
  });

  const handleCreateCustomer = async () => {
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone) {
      toast({ title: 'Missing Info', description: 'Please enter customer name and phone', variant: 'destructive' });
      return;
    }

    const customer = await createCustomerMutation.mutateAsync(newCustomer);
    setExistingCustomer(customer);
    setStep('confirm');
  };

  const handleQuickCreate = async () => {
    if (!existingCustomer || !decodedVehicle || !currentLocationId || !defaultWorkflow) {
      toast({ title: 'Missing Info', description: 'Please complete all steps', variant: 'destructive' });
      return;
    }

    try {
      let vehicleId = existingVehicle?.id;

      if (!vehicleId) {
        const vehicle = await createVehicleMutation.mutateAsync({
          customerId: existingCustomer.id,
          vin: vin.toUpperCase(),
          year: decodedVehicle.year,
          make: decodedVehicle.make,
          model: decodedVehicle.model,
          trim: decodedVehicle.submodel || null,
          licensePlate: plate ? plate.toUpperCase() : '',
          mileage: parseInt(odometer) || 0,
        });
        vehicleId = vehicle.id;
      }

      await createROMutation.mutateAsync({
        locationId: currentLocationId,
        customerId: existingCustomer.id,
        vehicleId,
        advisorId: user?.id,
        workflowId: defaultWorkflow.id,
        status: defaultWorkflow.stages?.[0]?.id || 'NEW',
        jobs: [],
        odometerIn: parseInt(odometer) || 0,
        notes: '',
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create repair order', variant: 'destructive' });
    }
  };

  const isLoading = createCustomerMutation.isPending || createVehicleMutation.isPending || createROMutation.isPending;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium">
            <Zap className="w-4 h-4" />
            Quick Check-In
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Fast Customer Check-In</h1>
          <p className="text-muted-foreground">
            Enter VIN or license plate to instantly check in a customer
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 py-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
            step === 'vin' ? "bg-primary text-primary-foreground" : 
            (step === 'customer' || step === 'confirm') ? "bg-green-500 text-white" : "bg-muted"
          )}>
            {(step === 'customer' || step === 'confirm') ? <Check className="w-4 h-4" /> : <Car className="w-4 h-4" />}
            <span className="font-medium">Vehicle</span>
          </div>
          <div className="w-8 h-0.5 bg-muted" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
            step === 'customer' ? "bg-primary text-primary-foreground" : 
            step === 'confirm' ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            {step === 'confirm' ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span className="font-medium">Customer</span>
          </div>
          <div className="w-8 h-0.5 bg-muted" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
            step === 'confirm' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Car className="w-4 h-4" />
            <span className="font-medium">Create RO</span>
          </div>
        </div>

        {step === 'vin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="w-5 h-5" />
                Vehicle Lookup
              </CardTitle>
              <CardDescription>
                Enter VIN or license plate to find the vehicle
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={lookupMethod} onValueChange={(v) => setLookupMethod(v as 'vin' | 'plate')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="vin" className="gap-2" data-testid="tab-vin">
                    <ScanLine className="w-4 h-4" />
                    VIN
                  </TabsTrigger>
                  <TabsTrigger value="plate" className="gap-2" data-testid="tab-plate">
                    <CreditCard className="w-4 h-4" />
                    License Plate
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {lookupMethod === 'vin' ? (
                <div className="space-y-2">
                  <Label>VIN (17 characters)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={vin}
                      onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
                      placeholder="Enter VIN..."
                      className="font-mono text-lg tracking-wider"
                      data-testid="input-vin"
                    />
                    <Button 
                      onClick={decodeVin} 
                      disabled={vin.length !== 17 || isDecoding}
                      data-testid="button-decode-vin"
                    >
                      {isDecoding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Lookup
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vin.length}/17 characters
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>License Plate</Label>
                      <Input
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        placeholder="ABC1234"
                        className="font-mono text-lg tracking-wider"
                        data-testid="input-plate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select value={plateState} onValueChange={setPlateState}>
                        <SelectTrigger data-testid="select-plate-state">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={lookupPlate} 
                    disabled={!plate.trim() || !plateState || isDecoding}
                    className="w-full"
                    data-testid="button-lookup-plate"
                  >
                    {isDecoding ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Look Up Plate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'customer' && decodedVehicle && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-green-500" />
                Vehicle Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-4">
                  <Car className="w-10 h-10 text-green-500" />
                  <div>
                    <div className="text-xl font-bold">
                      {decodedVehicle.year} {decodedVehicle.make} {decodedVehicle.model}
                    </div>
                    {decodedVehicle.submodel && (
                      <div className="text-muted-foreground">{decodedVehicle.submodel}</div>
                    )}
                    <div className="font-mono text-sm text-muted-foreground">{vin}</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>

                {existingCustomer ? (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="font-medium">{existingCustomer.firstName} {existingCustomer.lastName}</div>
                    <div className="text-sm text-muted-foreground">{existingCustomer.phone}</div>
                    {existingCustomer.email && (
                      <div className="text-sm text-muted-foreground">{existingCustomer.email}</div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={newCustomer.firstName}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={newCustomer.lastName}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                        data-testid="input-last-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        data-testid="input-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={existingCustomer ? () => setStep('confirm') : handleCreateCustomer}
                  disabled={!existingCustomer && (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone)}
                  data-testid="button-next-step"
                >
                  {createCustomerMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && decodedVehicle && existingCustomer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Ready to Create Repair Order
              </CardTitle>
              <CardDescription>
                Review the details and create the repair order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicle
                  </div>
                  <div className="font-medium">
                    {decodedVehicle.year} {decodedVehicle.make} {decodedVehicle.model}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{vin}</div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customer
                  </div>
                  <div className="font-medium">
                    {existingCustomer.firstName} {existingCustomer.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">{existingCustomer.phone}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Odometer</Label>
                <Input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="e.g., 45000"
                  data-testid="input-odometer"
                />
              </div>

              <Button 
                onClick={handleQuickCreate}
                disabled={isLoading}
                className="w-full h-12 text-lg"
                data-testid="button-create-ro"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Repair Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
