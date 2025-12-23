import { useState, useRef, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Loader2, AlertCircle, Car, Wrench, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureData {
  jobName: string;
  jobDescription?: string;
  lineItems: Array<{
    type: string;
    description: string;
    quantity: number;
    unitPrice: number;
    approved?: boolean;
  }>;
  total: number;
  customerName?: string;
  vehicleInfo?: string;
  roNumber: string;
  shopName: string;
  expiresAt: string;
}

export default function SignaturePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { data: signatureData, isLoading, error } = useQuery<SignatureData>({
    queryKey: ['signature', token],
    queryFn: async () => {
      const res = await fetch(`/api/public/signature/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to load signature data');
      }
      return res.json();
    },
    enabled: !!token,
  });
  
  const submitSignature = useMutation({
    mutationFn: async ({ signatureData, signerName }: { signatureData: string; signerName: string }) => {
      const res = await fetch(`/api/public/signature/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData, signerName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit signature');
      }
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });
  
  useEffect(() => {
    if (signatureData?.customerName) {
      setSignerName(signatureData.customerName);
    }
  }, [signatureData]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#1a365d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [signatureData]);
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    setHasSignature(true);
    
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
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    setIsDrawing(false);
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#fefefe';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };
  
  const handleSubmit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || !signerName.trim()) return;
    
    const signatureDataUrl = canvas.toDataURL('image/png');
    submitSignature.mutate({ signatureData: signatureDataUrl, signerName: signerName.trim() });
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error || !signatureData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Unable to Load</h2>
            <p className="text-muted-foreground">
              {(error as Error)?.message || 'This authorization link may have expired or already been used.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-2">Authorization Complete!</h2>
            <p className="text-muted-foreground mb-4">
              Thank you for authorizing the repair work. The shop has been notified.
            </p>
            <p className="text-sm text-muted-foreground">
              RO #{signatureData.roNumber} - {signatureData.jobName}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">{signatureData.shopName}</h1>
          <p className="text-muted-foreground">Repair Authorization</p>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="w-5 h-5 text-blue-600" />
              {signatureData.jobName}
            </CardTitle>
            {signatureData.jobDescription && (
              <p className="text-sm text-muted-foreground">{signatureData.jobDescription}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {signatureData.vehicleInfo && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-slate-500" />
                <span>{signatureData.vehicleInfo}</span>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground">
              RO #{signatureData.roNumber}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Work Items:</h4>
              {signatureData.lineItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    <span>{item.description}</span>
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    )}
                  </div>
                  <span className="font-medium">
                    ${((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Total
              </span>
              <span className="text-xl font-bold text-green-700">
                ${signatureData.total.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Authorization Signature</CardTitle>
            <p className="text-sm text-muted-foreground">
              By signing below, you authorize {signatureData.shopName} to perform the work described above.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signerName">Your Name</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                data-testid="input-signer-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Signature</Label>
              <div className="relative border-2 border-dashed rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  data-testid="canvas-signature"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
                    Sign here
                  </div>
                )}
              </div>
              {hasSignature && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  data-testid="button-clear-signature"
                >
                  Clear Signature
                </Button>
              )}
            </div>
            
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={!hasSignature || !signerName.trim() || submitSignature.isPending}
              data-testid="button-authorize"
            >
              {submitSignature.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Authorize Work
            </Button>
            
            {submitSignature.error && (
              <p className="text-sm text-red-600 text-center">
                {(submitSignature.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>
        
        <p className="text-xs text-center text-muted-foreground">
          This authorization expires {new Date(signatureData.expiresAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
