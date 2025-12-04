import { useState, useRef } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Check, 
  Loader2, 
  Car, 
  User, 
  ClipboardCheck,
  AlertCircle,
  Phone,
  MapPin,
  PenLine,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LineItem {
  id: string;
  type: 'LABOR' | 'PART' | 'TIRE' | 'FEE';
  description: string;
  quantity: number;
  unitPrice: number;
  approved: boolean;
}

interface Job {
  id: string;
  name: string;
  description?: string;
  lineItems: LineItem[];
}

interface AuthorizationData {
  id: string;
  roNumber: number;
  status: string;
  authorizationStatus: string;
  odometerIn: number;
  notes: string;
  jobs: Job[];
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  vehicle: {
    year: number;
    make: string;
    model: string;
    vin?: string;
    licensePlate?: string;
  };
  location: {
    name: string;
    address?: string;
    phone?: string;
  };
}

export default function CustomerAuthorization() {
  const [, params] = useRoute('/authorize/:token');
  const token = params?.token || '';
  
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: authData, isLoading, error, refetch } = useQuery<AuthorizationData>({
    queryKey: ['authorization', token],
    queryFn: async () => {
      const res = await fetch(`/api/authorize/${token}`);
      if (!res.ok) {
        throw new Error('Authorization not found');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { approvedItems: string[]; signature: string }) => {
      const res = await fetch(`/api/authorize/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit authorization');
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleItemToggle = (itemId: string) => {
    setApprovedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleApproveAll = () => {
    const allItemIds = authData?.jobs.flatMap(job => 
      job.lineItems.map(item => item.id)
    ) || [];
    setApprovedItems(new Set(allItemIds));
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setSignature(canvas.toDataURL());
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignature(null);
  };

  const handleSubmit = () => {
    if (!signature || approvedItems.size === 0) return;
    submitMutation.mutate({
      approvedItems: Array.from(approvedItems),
      signature,
    });
  };

  const calculateTotal = () => {
    if (!authData) return 0;
    return authData.jobs.reduce((total, job) => {
      return total + job.lineItems
        .filter(item => approvedItems.has(item.id))
        .reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading authorization...</p>
        </div>
      </div>
    );
  }

  if (error || !authData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900">Authorization Not Found</h2>
            <p className="text-slate-500 mt-2">
              This authorization link may have expired or is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authData.authorizationStatus === 'AUTHORIZED') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900">Work Authorized</h2>
            <p className="text-slate-500 mt-2">
              Thank you! Your authorization has been submitted successfully.
            </p>
            <div className="mt-6 p-4 bg-green-50 rounded-lg w-full">
              <p className="text-sm text-green-800">
                <strong>RO #{authData.roNumber}</strong> has been authorized.
                The shop will begin work on your vehicle shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">{authData.location.name}</h1>
          <p className="text-blue-100 text-sm mt-1">Vehicle Service Authorization</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 -mt-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="w-5 h-5" />
                RO #{authData.roNumber}
              </CardTitle>
              <Badge variant="outline">
                {format(new Date(authData.createdAt), 'MMM d, yyyy')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Car className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {authData.vehicle.year} {authData.vehicle.make} {authData.vehicle.model}
                  </p>
                  {authData.vehicle.vin && (
                    <p className="text-xs text-slate-500 font-mono">{authData.vehicle.vin}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {authData.customer.firstName} {authData.customer.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{authData.customer.phone}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recommended Services</CardTitle>
              <Button variant="outline" size="sm" onClick={handleApproveAll}>
                Approve All
              </Button>
            </div>
            <CardDescription>
              Select the services you authorize for your vehicle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authData.jobs.map((job) => (
              <div key={job.id} className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 font-medium text-sm">
                  {job.name}
                </div>
                <div className="divide-y">
                  {job.lineItems.map((item) => (
                    <div 
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-4 transition-colors",
                        approvedItems.has(item.id) && "bg-green-50"
                      )}
                    >
                      <Checkbox
                        checked={approvedItems.has(item.id)}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-slate-500">
                          {item.type} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total Authorized:</span>
              <span className="text-green-600">${calculateTotal().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PenLine className="w-5 h-5" />
              Your Signature
            </CardTitle>
            <CardDescription>
              Sign below to authorize the selected services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!signature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-slate-400 text-sm">Sign here</p>
                </div>
              )}
            </div>
            {signature && (
              <Button variant="outline" size="sm" onClick={clearSignature}>
                Clear Signature
              </Button>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!signature || approvedItems.size === 0 || submitMutation.isPending}
              className="w-full h-12 text-lg"
              data-testid="button-submit-authorization"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Authorize Work (${calculateTotal().toFixed(2)})
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              By signing above, you authorize {authData.location.name} to perform the selected services on your vehicle.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
