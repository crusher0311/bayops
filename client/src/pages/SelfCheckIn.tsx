import { useState } from 'react';
import { useRoute } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Car, 
  Phone, 
  Search, 
  Loader2, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Wrench,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'lookup' | 'confirm' | 'service' | 'complete';

interface VehicleInfo {
  vin: string;
  year: string;
  make: string;
  model: string;
  trim?: string;
}

interface CustomerInfo {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export default function SelfCheckIn() {
  const [, params] = useRoute('/checkin/:locationId/:token');
  const locationId = params?.locationId || '';
  const checkInToken = params?.token || '';
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('lookup');
  const [lookupMethod, setLookupMethod] = useState<'phone' | 'vin'>('phone');
  const [lookupValue, setLookupValue] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [serviceDescription, setServiceDescription] = useState('');
  const [createdRoNumber, setCreatedRoNumber] = useState('');

  const { data: location, isError: locationError } = useQuery({
    queryKey: ['public-location', locationId, checkInToken],
    queryFn: async () => {
      const res = await fetch(`/api/public/location/${locationId}/${checkInToken}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Invalid link');
      }
      return res.json();
    },
    enabled: !!locationId && !!checkInToken,
    retry: false,
  });

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/public/customer-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          token: checkInToken,
          method: lookupMethod,
          value: lookupValue,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Lookup failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.customer) {
        setCustomerInfo(data.customer);
      } else {
        setCustomerInfo({ firstName: '', lastName: '', phone: '', email: '' });
      }
      if (data.vehicle) {
        setVehicleInfo(data.vehicle);
      }
      if (data.decoded) {
        setVehicleInfo({
          vin: lookupValue,
          year: data.decoded.year,
          make: data.decoded.make,
          model: data.decoded.model,
          trim: data.decoded.trim,
        });
      }
      setStep('confirm');
    },
    onError: (error: any) => {
      toast({
        title: 'Not Found',
        description: error.message || 'Could not find matching records',
        variant: 'destructive',
      });
    },
  });

  const createCheckInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/public/self-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          token: checkInToken,
          customer: customerInfo,
          vehicle: vehicleInfo,
          serviceDescription,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Check-in failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCreatedRoNumber(data.roNumber);
      setStep('complete');
    },
    onError: (error: any) => {
      toast({
        title: 'Check-in Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleLookup = () => {
    if (!lookupValue.trim()) return;
    lookupMutation.mutate();
  };

  const handleSubmit = () => {
    if (!customerInfo?.firstName || !customerInfo?.lastName || !customerInfo?.phone) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in your name and phone number',
        variant: 'destructive',
      });
      return;
    }
    if (!vehicleInfo?.vin) {
      toast({
        title: 'Missing Vehicle',
        description: 'Please enter your vehicle information',
        variant: 'destructive',
      });
      return;
    }
    createCheckInMutation.mutate();
  };

  const resetForm = () => {
    setStep('lookup');
    setLookupValue('');
    setVehicleInfo(null);
    setCustomerInfo(null);
    setServiceDescription('');
    setCreatedRoNumber('');
  };

  if (locationError || (!location && locationId && checkInToken)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-6">
              <Car className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invalid Check-In Link</h2>
            <p className="text-slate-400">
              This check-in link is invalid or has expired. Please scan the QR code at the shop to get a valid link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {location?.name || 'Self Check-In'}
          </h1>
          <p className="text-slate-400 mt-1">Quick and easy vehicle check-in</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            {(['lookup', 'confirm', 'service', 'complete'] as Step[]).map((s, idx) => {
              const steps: Step[] = ['lookup', 'confirm', 'service', 'complete'];
              const currentIdx = steps.indexOf(step);
              const isCompleted = currentIdx > idx;
              const isCurrent = step === s;
              
              return (
                <div key={s} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    isCurrent 
                      ? "bg-blue-500 text-white scale-110" 
                      : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-slate-700 text-slate-400"
                  )}>
                    {isCompleted 
                      ? <CheckCircle2 className="w-5 h-5" />
                      : idx + 1
                    }
                  </div>
                  {idx < 3 && (
                    <div className={cn(
                      "w-8 h-1 mx-1",
                      isCompleted
                        ? "bg-green-500"
                        : "bg-slate-700"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {step === 'lookup' && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Search className="w-5 h-5 text-blue-400" />
                Find Your Information
              </CardTitle>
              <CardDescription>
                Enter your phone number or vehicle VIN to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={lookupMethod === 'phone' ? 'default' : 'outline'}
                  className={cn(
                    "h-14",
                    lookupMethod === 'phone' 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-slate-600 text-slate-300"
                  )}
                  onClick={() => {
                    setLookupMethod('phone');
                    setLookupValue('');
                  }}
                  data-testid="button-lookup-phone"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Phone Number
                </Button>
                <Button
                  variant={lookupMethod === 'vin' ? 'default' : 'outline'}
                  className={cn(
                    "h-14",
                    lookupMethod === 'vin' 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-slate-600 text-slate-300"
                  )}
                  onClick={() => {
                    setLookupMethod('vin');
                    setLookupValue('');
                  }}
                  data-testid="button-lookup-vin"
                >
                  <Car className="w-5 h-5 mr-2" />
                  Vehicle VIN
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">
                  {lookupMethod === 'phone' ? 'Phone Number' : 'Vehicle VIN'}
                </Label>
                <Input
                  type={lookupMethod === 'phone' ? 'tel' : 'text'}
                  placeholder={lookupMethod === 'phone' ? '(555) 123-4567' : '17 character VIN'}
                  value={lookupValue}
                  onChange={(e) => setLookupValue(lookupMethod === 'vin' ? e.target.value.toUpperCase() : e.target.value)}
                  className="h-14 text-lg bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  data-testid="input-lookup-value"
                />
              </div>

              <Button
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={handleLookup}
                disabled={!lookupValue.trim() || lookupMutation.isPending}
                data-testid="button-lookup-submit"
              >
                {lookupMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                  onClick={() => {
                    setCustomerInfo({ firstName: '', lastName: '', phone: '', email: '' });
                    setVehicleInfo(null);
                    setStep('confirm');
                  }}
                  data-testid="button-new-customer"
                >
                  First time here? <span className="underline">Enter your info manually</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'confirm' && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Confirm Your Information
              </CardTitle>
              <CardDescription>
                Please verify or enter your details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">First Name *</Label>
                  <Input
                    value={customerInfo?.firstName || ''}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev!, firstName: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Last Name *</Label>
                  <Input
                    value={customerInfo?.lastName || ''}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev!, lastName: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    placeholder="Doe"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Phone Number *</Label>
                <Input
                  type="tel"
                  value={customerInfo?.phone || ''}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev!, phone: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="(555) 123-4567"
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Email (optional)</Label>
                <Input
                  type="email"
                  value={customerInfo?.email || ''}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev!, email: e.target.value }))}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  placeholder="john@example.com"
                  data-testid="input-email"
                />
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" />
                  Vehicle Information
                </h3>
                
                {vehicleInfo ? (
                  <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                    <div className="text-lg font-semibold text-white">
                      {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                    </div>
                    {vehicleInfo.trim && (
                      <div className="text-sm text-slate-400">{vehicleInfo.trim}</div>
                    )}
                    <div className="text-xs text-slate-500 font-mono">{vehicleInfo.vin}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white p-0 h-auto"
                      onClick={() => setVehicleInfo(null)}
                    >
                      Change vehicle
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-slate-300">VIN *</Label>
                      <Input
                        value=""
                        onChange={(e) => {
                          const vin = e.target.value.toUpperCase();
                          if (vin.length === 17) {
                            fetch(`/api/vin/decode/${vin}`)
                              .then(res => res.json())
                              .then(data => {
                                if (data.year && data.make) {
                                  setVehicleInfo({
                                    vin,
                                    year: data.year,
                                    make: data.make,
                                    model: data.model,
                                    trim: data.trim,
                                  });
                                }
                              });
                          }
                        }}
                        className="bg-slate-700/50 border-slate-600 text-white font-mono"
                        placeholder="Enter 17-character VIN"
                        maxLength={17}
                        data-testid="input-vin"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-slate-600 text-slate-300"
                  onClick={() => setStep('lookup')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => setStep('service')}
                  disabled={!customerInfo?.firstName || !customerInfo?.lastName || !customerInfo?.phone || !vehicleInfo}
                  data-testid="button-confirm-continue"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'service' && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Wrench className="w-5 h-5 text-blue-400" />
                What brings you in today?
              </CardTitle>
              <CardDescription>
                Tell us about the service you need
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Your Vehicle</div>
                <div className="font-semibold text-white">
                  {vehicleInfo?.year} {vehicleInfo?.make} {vehicleInfo?.model}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  'Oil Change',
                  'Tire Service',
                  'Brake Service',
                  'Check Engine Light',
                  'A/C Service',
                  'Battery',
                  'Alignment',
                  'Other'
                ].map((service) => (
                  <Button
                    key={service}
                    variant="outline"
                    className={cn(
                      "h-12 justify-start border-slate-600",
                      serviceDescription.includes(service)
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "text-slate-300 hover:bg-slate-700"
                    )}
                    onClick={() => {
                      if (serviceDescription.includes(service)) {
                        setServiceDescription(serviceDescription.replace(service, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, ''));
                      } else {
                        setServiceDescription(prev => prev ? `${prev}, ${service}` : service);
                      }
                    }}
                    data-testid={`button-service-${service.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {service}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Additional Details (optional)</Label>
                <Textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white min-h-[100px]"
                  placeholder="Describe any issues or specific requests..."
                  data-testid="input-service-description"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 border-slate-600 text-slate-300"
                  onClick={() => setStep('confirm')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  onClick={handleSubmit}
                  disabled={createCheckInMutation.isPending}
                  data-testid="button-checkin-submit"
                >
                  {createCheckInMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Complete Check-In
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'complete' && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                You're All Checked In!
              </h2>
              
              <p className="text-slate-400 mb-6">
                Your service order has been created
              </p>

              <div className="bg-slate-700/30 rounded-lg p-6 mb-6">
                <div className="text-sm text-slate-400 mb-1">Your Order Number</div>
                <div className="text-3xl font-bold text-white font-mono">
                  #{createdRoNumber}
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-400">
                <p>A team member will be with you shortly.</p>
                <p>You'll receive updates via text message.</p>
              </div>

              <Button
                variant="outline"
                className="mt-8 border-slate-600 text-slate-300"
                onClick={resetForm}
                data-testid="button-new-checkin"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                New Check-In
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-500 mt-8">
          Powered by BayOPS
        </p>
      </div>
    </div>
  );
}
