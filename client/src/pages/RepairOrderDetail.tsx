import { useRoute } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Printer, 
  Send, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TireQuoteBuilder } from '@/components/shop/TireQuoteBuilder';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function RepairOrderDetail() {
  const [, params] = useRoute('/ros/:id');
  const { ros, customers, vehicles, updateROStatus, workflows } = useShopStore();
  
  const ro = ros.find(r => r.id === params?.id);
  const activeWorkflow = workflows.find(w => w.id === ro?.workflowId) || workflows[0];
  const activeStages = activeWorkflow.stages.sort((a, b) => a.order - b.order);

  const customer = customers.find(c => c.id === ro?.customerId);
  const vehicle = vehicles.find(v => v.id === ro?.vehicleId);

  if (!ro) return <div className="p-8">RO Not Found</div>;

  // Calculated Totals
  const partsTotal = ro.lineItems
    .filter(i => i.type === 'PART' || i.type === 'TIRE')
    .reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
    
  const laborTotal = ro.lineItems
    .filter(i => i.type === 'LABOR')
    .reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);

  const subtotal = partsTotal + laborTotal;
  const tax = subtotal * (useShopStore.getState().currentLocation?.taxRate || 0.08);
  const total = subtotal + tax;

  const handleAddTires = (selection: any) => {
    console.log("Adding tires", selection);
  };

  const currentStepIndex = activeStages.findIndex(s => s.id === ro.status);

  const advanceStatus = () => {
    if (currentStepIndex < activeStages.length - 1) {
      updateROStatus(ro.id, activeStages[currentStepIndex + 1].id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Navigation */}
        <div className="flex items-center gap-4">
          <Link href="/ros">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">RO #{ro.roNumber}</h1>
              <Badge variant="outline" className="text-sm uppercase">
                {ro.status.replace(/_/g, ' ')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {activeWorkflow.name}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Created {format(new Date(ro.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Send className="w-4 h-4" /> Share
            </Button>
            <Button 
              className="gap-2" 
              disabled={currentStepIndex >= activeStages.length - 1}
              onClick={advanceStatus}
            >
              {currentStepIndex < activeStages.length - 1 
                ? `Move to ${activeStages[currentStepIndex + 1].label}` 
                : 'Completed'}
            </Button>
          </div>
        </div>

        {/* Dynamic Status Bar */}
        <div className="w-full bg-card border rounded-lg p-4 overflow-x-auto">
           <div className="flex justify-between items-center min-w-[600px]">
            {activeStages.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold shrink-0 transition-colors",
                  idx <= currentStepIndex 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground border-muted-foreground/20"
                )}>
                  {idx < currentStepIndex ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  idx <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {idx < activeStages.length - 1 && (
                  <div className={cn(
                    "h-[2px] flex-1 mx-2 transition-colors",
                    idx < currentStepIndex ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Customer & Vehicle Card */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">Customer</h3>
                    <div className="font-medium text-lg">{customer?.firstName} {customer?.lastName}</div>
                    <div className="text-sm text-muted-foreground">{customer?.phone}</div>
                    <div className="text-sm text-muted-foreground">{customer?.email}</div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wider">Vehicle</h3>
                    <div className="font-medium text-lg">{vehicle?.year} {vehicle?.make} {vehicle?.model}</div>
                    <div className="text-sm text-muted-foreground">VIN: {vehicle?.vin}</div>
                    <div className="text-sm text-muted-foreground">Mileage: {ro.odometerIn?.toLocaleString()} mi</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Line Items</CardTitle>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Tire Quote
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Tire Quote Builder</DialogTitle>
                      </DialogHeader>
                      <TireQuoteBuilder 
                        vehicleTireSize={vehicle?.tireSizeFront} 
                        onAddTires={handleAddTires} 
                      />
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Labor
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Part
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground font-medium">
                      <tr>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-center">Type</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ro.lineItems.map((item) => (
                        <tr key={item.id} className="group hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">
                            {item.description}
                            {item.type === 'TIRE' && <Badge variant="secondary" className="ml-2 text-[10px]">In Stock</Badge>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline" className="text-[10px]">{item.type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {ro.lineItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                            No items added yet. Add parts or labor to begin estimate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Labor</span>
                  <span>${laborTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parts & Tires</span>
                  <span>${partsTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shop Supplies</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold tracking-tight text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4">
                <div className="flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Technician Note</p>
                    <p className="text-xs text-muted-foreground">
                      "Front brakes are at 3mm. Recommend replacement soon."
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
