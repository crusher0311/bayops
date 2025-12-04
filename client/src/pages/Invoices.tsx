import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useLocations, useRepairOrders, useCustomers } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2,
  FileText,
  Plus,
  Search,
  DollarSign,
  Eye,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard,
  Banknote,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Invoice {
  id: string;
  locationId: string;
  repairOrderId: string;
  customerId: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'VOID';
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  payments?: Payment[];
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ACH' | 'FINANCING' | 'OTHER';
  referenceNumber: string | null;
  notes: string | null;
  processedAt: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface RepairOrder {
  id: string;
  roNumber: number;
  status: string;
  customerId: string;
}

const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-slate-500' },
  { value: 'SENT', label: 'Sent', color: 'bg-blue-500' },
  { value: 'VIEWED', label: 'Viewed', color: 'bg-purple-500' },
  { value: 'PARTIAL', label: 'Partial', color: 'bg-amber-500' },
  { value: 'PAID', label: 'Paid', color: 'bg-green-500' },
  { value: 'OVERDUE', label: 'Overdue', color: 'bg-red-500' },
  { value: 'VOID', label: 'Void', color: 'bg-gray-500' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'CHECK', label: 'Check', icon: FileText },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
  { value: 'DEBIT_CARD', label: 'Debit Card', icon: CreditCard },
  { value: 'ACH', label: 'ACH/Bank Transfer', icon: Building },
  { value: 'FINANCING', label: 'Financing', icon: DollarSign },
  { value: 'OTHER', label: 'Other', icon: DollarSign },
];

export default function Invoices() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: repairOrders = [] } = useRepairOrders(currentLocationId || '');
  const { data: customers = [] } = useCustomers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedRO, setSelectedRO] = useState('');

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH' as Payment['method'],
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [currentLocationId, locations, setCurrentLocation]);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', currentLocationId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${currentLocationId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      return res.json();
    },
    enabled: !!currentLocationId,
  });

  const { data: invoiceDetail } = useQuery<Invoice>({
    queryKey: ['invoice-detail', selectedInvoice?.id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/detail/${selectedInvoice!.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      return res.json();
    },
    enabled: !!selectedInvoice?.id && isDetailDialogOpen,
  });

  const invalidateInvoices = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey[0] === 'invoices' || query.queryKey[0] === 'invoice-detail'
    });
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: { locationId: string; repairOrderId: string; customerId: string }) => {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          status: 'DRAFT',
        }),
      });
      if (!res.ok) throw new Error('Failed to create invoice');
      return res.json();
    },
    onSuccess: () => {
      invalidateInvoices();
      setIsCreateDialogOpen(false);
      setSelectedRO('');
      toast({ title: 'Invoice created', description: 'The invoice has been created as a draft.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Invoice> }) => {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update invoice');
      return res.json();
    },
    onSuccess: (_, variables) => {
      invalidateInvoices();
      if (variables.data.status === 'SENT') {
        toast({ title: 'Invoice sent', description: 'The invoice has been marked as sent.' });
      } else if (variables.data.status === 'VOID') {
        toast({ title: 'Invoice voided', description: 'The invoice has been voided.' });
      } else {
        toast({ title: 'Invoice updated', description: 'The invoice has been updated.' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { invoiceId: string; amount: string; method: Payment['method']; referenceNumber?: string; notes?: string }) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to record payment');
      return res.json();
    },
    onSuccess: () => {
      invalidateInvoices();
      setIsPaymentDialogOpen(false);
      setPaymentForm({ amount: '', method: 'CASH', referenceNumber: '', notes: '' });
      toast({ title: 'Payment recorded', description: 'The payment has been recorded successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = INVOICE_STATUSES.find(s => s.value === status);
    return (
      <Badge className={`${statusConfig?.color || 'bg-slate-500'} text-white`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown';
  };

  const getRONumber = (roId: string) => {
    const ro = repairOrders.find(r => r.id === roId);
    return ro?.roNumber || 'Unknown';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(invoice.customerId).toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'unpaid') {
      return matchesSearch && ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'].includes(invoice.status);
    }
    if (activeTab === 'paid') {
      return matchesSearch && invoice.status === 'PAID';
    }
    return matchesSearch;
  });

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => ['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'].includes(i.status)).length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    totalDue: invoices.reduce((sum, i) => sum + parseFloat(i.amountDue || '0'), 0),
    totalPaid: invoices.reduce((sum, i) => sum + parseFloat(i.amountPaid || '0'), 0),
  };

  const completedROs = repairOrders.filter(ro => ro.status === 'COMPLETED' || ro.status === 'DELIVERED');

  if (locationsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const currentLocation = locations.find(l => l.id === currentLocationId);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Manage invoices and payments for {currentLocation?.name || 'your location'}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2" data-testid="button-new-invoice">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
                <p className="text-2xl font-bold">{stats.unpaid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold">${stats.totalDue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="text-2xl font-bold">${stats.totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unpaid' | 'paid')} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="unpaid" data-testid="tab-unpaid">Unpaid ({stats.unpaid})</TabsTrigger>
            <TabsTrigger value="paid" data-testid="tab-paid">Paid ({stats.paid})</TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {invoicesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Invoices</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {activeTab === 'all' 
                    ? 'Create your first invoice from a completed repair order'
                    : `No ${activeTab} invoices found`
                  }
                </p>
                {activeTab === 'all' && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>RO #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map(invoice => (
                    <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                      <TableCell>#{getRONumber(invoice.repairOrderId)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right font-mono">${parseFloat(invoice.total).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">${parseFloat(invoice.amountPaid).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">${parseFloat(invoice.amountDue).toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => { setSelectedInvoice(invoice); setIsDetailDialogOpen(true); }}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {invoice.status === 'DRAFT' && (
                            <Button 
                              size="sm"
                              onClick={() => updateInvoiceMutation.mutate({ id: invoice.id, data: { status: 'SENT' } })}
                              disabled={updateInvoiceMutation.isPending}
                              data-testid={`button-send-invoice-${invoice.id}`}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Send
                            </Button>
                          )}
                          {['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'].includes(invoice.status) && (
                            <Button 
                              size="sm"
                              onClick={() => { setSelectedInvoice(invoice); setIsPaymentDialogOpen(true); }}
                              data-testid={`button-record-payment-${invoice.id}`}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Create Invoice
            </DialogTitle>
            <DialogDescription>
              Generate an invoice from a completed repair order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Repair Order</Label>
              <Select value={selectedRO} onValueChange={setSelectedRO}>
                <SelectTrigger data-testid="select-repair-order">
                  <SelectValue placeholder="Select a completed repair order..." />
                </SelectTrigger>
                <SelectContent>
                  {completedROs.length === 0 ? (
                    <SelectItem value="_none" disabled>No completed repair orders</SelectItem>
                  ) : (
                    completedROs.map(ro => (
                      <SelectItem key={ro.id} value={ro.id}>
                        RO #{ro.roNumber} - {getCustomerName(ro.customerId)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const ro = repairOrders.find(r => r.id === selectedRO);
                if (ro) {
                  createInvoiceMutation.mutate({
                    locationId: currentLocationId!,
                    repairOrderId: ro.id,
                    customerId: ro.customerId,
                  });
                }
              }}
              disabled={!selectedRO || createInvoiceMutation.isPending}
              data-testid="button-confirm-create-invoice"
            >
              {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setSelectedInvoice(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice {invoiceDetail?.invoiceNumber || selectedInvoice?.invoiceNumber}
            </DialogTitle>
            <DialogDescription>
              {invoiceDetail && getCustomerName(invoiceDetail.customerId)}
            </DialogDescription>
          </DialogHeader>

          {invoiceDetail && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(invoiceDetail.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">${parseFloat(invoiceDetail.total).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Subtotal</p>
                  <p className="font-mono">${parseFloat(invoiceDetail.subtotal).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tax</p>
                  <p className="font-mono">${parseFloat(invoiceDetail.taxAmount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Discount</p>
                  <p className="font-mono">-${parseFloat(invoiceDetail.discountAmount).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="text-xl font-bold text-green-600">${parseFloat(invoiceDetail.amountPaid).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Due</p>
                  <p className="text-xl font-bold text-red-600">${parseFloat(invoiceDetail.amountDue).toFixed(2)}</p>
                </div>
              </div>

              {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Payment History</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceDetail.payments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.processedAt), 'MMM d, yyyy h:mm a')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {PAYMENT_METHODS.find(m => m.value === payment.method)?.label || payment.method}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.referenceNumber || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            ${parseFloat(payment.amount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {invoiceDetail.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{invoiceDetail.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Close
            </Button>
            {invoiceDetail && parseFloat(invoiceDetail.amountDue) > 0 && invoiceDetail.status !== 'DRAFT' && (
              <Button onClick={() => { setIsPaymentDialogOpen(true); }}>
                <DollarSign className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => { setIsPaymentDialogOpen(open); if (!open) setPaymentForm({ amount: '', method: 'CASH', referenceNumber: '', notes: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Record a payment for invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount Due</span>
              <span className="text-xl font-bold text-red-600">
                ${selectedInvoice ? parseFloat(selectedInvoice.amountDue).toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                data-testid="input-payment-amount"
              />
              {selectedInvoice && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPaymentForm(prev => ({ ...prev, amount: selectedInvoice.amountDue }))}
                >
                  Pay Full Amount
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={paymentForm.method} 
                onValueChange={(v) => setPaymentForm(prev => ({ ...prev, method: v as Payment['method'] }))}
              >
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'ACH'].includes(paymentForm.method) && (
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  placeholder={paymentForm.method === 'CHECK' ? 'Check number' : 'Transaction ID'}
                  data-testid="input-reference-number"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this payment..."
                rows={2}
                data-testid="input-payment-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedInvoice) {
                  createPaymentMutation.mutate({
                    invoiceId: selectedInvoice.id,
                    amount: paymentForm.amount,
                    method: paymentForm.method,
                    referenceNumber: paymentForm.referenceNumber || undefined,
                    notes: paymentForm.notes || undefined,
                  });
                }
              }}
              disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || createPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
