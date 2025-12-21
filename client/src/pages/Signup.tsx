import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/authStore';
import { 
  Building2, 
  MapPin, 
  User, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Loader2,
  Wrench,
} from 'lucide-react';

type Step = 'account' | 'organization' | 'location' | 'settings';

const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account', icon: <User className="w-5 h-5" /> },
  { id: 'organization', label: 'Shop Info', icon: <Building2 className="w-5 h-5" /> },
  { id: 'location', label: 'Location', icon: <MapPin className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { checkAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<Step>('account');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    shopName: '',
    locationName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    laborRate: '125.00',
    salesTaxRate: '0.00',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Registration failed');
      }
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.requiresManualLogin) {
        toast({
          title: 'Shop Created!',
          description: 'Please log in with your credentials.',
        });
        setLocation('/login');
      } else {
        // Refresh auth state to pick up the newly logged-in user
        await checkAuth();
        toast({
          title: 'Welcome to BayOPS!',
          description: 'Your shop has been created successfully.',
        });
        setLocation('/');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'account':
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
        if (!formData.username.trim()) newErrors.username = 'Username is required';
        else if (formData.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        break;
      case 'organization':
        if (!formData.shopName.trim()) newErrors.shopName = 'Shop name is required';
        break;
      case 'location':
        if (!formData.locationName.trim()) newErrors.locationName = 'Location name is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        if (!formData.zip.trim()) newErrors.zip = 'ZIP code is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
      case 'settings':
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const prevStep = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleSubmit = () => {
    if (!validateStep('settings')) return;
    registerMutation.mutate();
  };

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">BayOPS</h1>
          </div>
          <p className="text-slate-400">Create your shop account in minutes</p>
        </div>

        <div className="flex justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  index < currentStepIndex 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : index === currentStepIndex
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-400'
                }`}
              >
                {index < currentStepIndex ? <Check className="w-5 h-5" /> : step.icon}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 ${index < currentStepIndex ? 'bg-green-500' : 'bg-slate-600'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">{steps[currentStepIndex].label}</CardTitle>
            <CardDescription className="text-slate-400">
              {currentStep === 'account' && 'Create your administrator account'}
              {currentStep === 'organization' && 'Tell us about your business'}
              {currentStep === 'location' && 'Set up your first shop location'}
              {currentStep === 'settings' && 'Configure your shop defaults'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 'account' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-200">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.name ? 'border-red-500' : ''}`}
                      data-testid="input-name"
                    />
                    {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@myshop.com"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.email ? 'border-red-500' : ''}`}
                      data-testid="input-email"
                    />
                    {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-200">Username</Label>
                  <Input
                    id="username"
                    placeholder="johnsmith"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white ${errors.username ? 'border-red-500' : ''}`}
                    data-testid="input-username"
                  />
                  {errors.username && <p className="text-red-400 text-sm">{errors.username}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-200">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.password ? 'border-red-500' : ''}`}
                      data-testid="input-password"
                    />
                    {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => updateField('confirmPassword', e.target.value)}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      data-testid="input-confirm-password"
                    />
                    {errors.confirmPassword && <p className="text-red-400 text-sm">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </>
            )}

            {currentStep === 'organization' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="shopName" className="text-slate-200">Shop Name</Label>
                  <Input
                    id="shopName"
                    placeholder="Smith's Auto Repair"
                    value={formData.shopName}
                    onChange={(e) => updateField('shopName', e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white ${errors.shopName ? 'border-red-500' : ''}`}
                    data-testid="input-shop-name"
                  />
                  {errors.shopName && <p className="text-red-400 text-sm">{errors.shopName}</p>}
                  <p className="text-slate-500 text-sm">This is your business name that customers will see</p>
                </div>
              </>
            )}

            {currentStep === 'location' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="locationName" className="text-slate-200">Location Name</Label>
                  <Input
                    id="locationName"
                    placeholder="Main Shop"
                    value={formData.locationName}
                    onChange={(e) => updateField('locationName', e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white ${errors.locationName ? 'border-red-500' : ''}`}
                    data-testid="input-location-name"
                  />
                  {errors.locationName && <p className="text-red-400 text-sm">{errors.locationName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-200">Street Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white ${errors.address ? 'border-red-500' : ''}`}
                    data-testid="input-address"
                  />
                  {errors.address && <p className="text-red-400 text-sm">{errors.address}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-slate-200">City</Label>
                    <Input
                      id="city"
                      placeholder="Anytown"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.city ? 'border-red-500' : ''}`}
                      data-testid="input-city"
                    />
                    {errors.city && <p className="text-red-400 text-sm">{errors.city}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-slate-200">State</Label>
                    <Input
                      id="state"
                      placeholder="CA"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value.toUpperCase())}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.state ? 'border-red-500' : ''}`}
                      data-testid="input-state"
                    />
                    {errors.state && <p className="text-red-400 text-sm">{errors.state}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip" className="text-slate-200">ZIP Code</Label>
                    <Input
                      id="zip"
                      placeholder="12345"
                      value={formData.zip}
                      onChange={(e) => updateField('zip', e.target.value)}
                      className={`bg-slate-700/50 border-slate-600 text-white ${errors.zip ? 'border-red-500' : ''}`}
                      data-testid="input-zip"
                    />
                    {errors.zip && <p className="text-red-400 text-sm">{errors.zip}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-200">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white ${errors.phone ? 'border-red-500' : ''}`}
                    data-testid="input-phone"
                  />
                  {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
                </div>
              </>
            )}

            {currentStep === 'settings' && (
              <>
                <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                  <p className="text-slate-300 text-sm">
                    You can always change these settings later in your shop configuration.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="laborRate" className="text-slate-200">Default Labor Rate ($/hour)</Label>
                    <Input
                      id="laborRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="125.00"
                      value={formData.laborRate}
                      onChange={(e) => updateField('laborRate', e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      data-testid="input-labor-rate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesTaxRate" className="text-slate-200">Sales Tax Rate (%)</Label>
                    <Input
                      id="salesTaxRate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="8.25"
                      value={formData.salesTaxRate}
                      onChange={(e) => updateField('salesTaxRate', e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                      data-testid="input-tax-rate"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              {currentStepIndex > 0 ? (
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation('/login')}
                  className="text-slate-400 hover:text-slate-200"
                  data-testid="button-login"
                >
                  Already have an account? Log in
                </Button>
              )}
              
              {currentStepIndex < steps.length - 1 ? (
                <Button 
                  onClick={nextStep}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-next"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-create-shop"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Shop...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Create My Shop
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
