import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LineItem {
  id: string;
  type: 'LABOR' | 'PART' | 'TIRE' | 'FEE' | 'SUBLET';
  description: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  approved: boolean;
  partNumber?: string;
}

interface Job {
  id: string;
  name: string;
  description?: string;
  lineItems: LineItem[];
}

interface RepairOrder {
  id: string;
  roNumber: number;
  status: string;
  odometerIn: number;
  notes: string;
  jobs: Job[];
  createdAt: string;
  promisedAt?: string;
  completedAt?: string;
  originalInvoiceDate?: string;
  totalLabor?: number;
  totalParts?: number;
  totalTax?: number;
  grandTotal?: number;
  customerId: string;
  vehicleId: string;
  locationId: string;
  legacyInvoiceNumber?: number;
  protractorInvoiceNumber?: number;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin?: string;
  licensePlate?: string;
  color?: string;
  engine?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
}

export default function PrintInvoice() {
  const [, params] = useRoute('/ros/:id/invoice');
  const roId = params?.id || '';

  const { data: ro, isLoading: roLoading } = useQuery<RepairOrder>({
    queryKey: ['repair-order', roId],
    queryFn: async () => {
      const res = await fetch(`/api/repair-orders/${roId}`);
      if (!res.ok) throw new Error('Failed to fetch repair order');
      return res.json();
    },
    enabled: !!roId,
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: ['customer', ro?.customerId],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${ro?.customerId}`);
      if (!res.ok) throw new Error('Failed to fetch customer');
      return res.json();
    },
    enabled: !!ro?.customerId,
  });

  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: ['vehicle', ro?.vehicleId],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${ro?.vehicleId}`);
      if (!res.ok) throw new Error('Failed to fetch vehicle');
      return res.json();
    },
    enabled: !!ro?.vehicleId,
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/locations');
      if (!res.ok) throw new Error('Failed to fetch locations');
      return res.json();
    },
  });

  const location = locations.find(l => l.id === ro?.locationId);

  if (roLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!ro) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  const jobs = (ro.jobs || []) as Job[];
  const invoiceNumber = ro.legacyInvoiceNumber || ro.protractorInvoiceNumber || ro.roNumber;
  const invoiceDate = ro.originalInvoiceDate || ro.completedAt || ro.createdAt;
  
  const laborTotal = jobs.reduce((sum, job) => 
    sum + job.lineItems.filter(i => i.type === 'LABOR').reduce((s, i) => s + (i.quantity * i.unitPrice), 0), 0);
  
  const partsTotal = jobs.reduce((sum, job) => 
    sum + job.lineItems.filter(i => i.type === 'PART' || i.type === 'TIRE').reduce((s, i) => s + (i.quantity * i.unitPrice), 0), 0);
  
  const feesTotal = jobs.reduce((sum, job) => 
    sum + job.lineItems.filter(i => i.type === 'FEE' || i.type === 'SUBLET').reduce((s, i) => s + (i.quantity * i.unitPrice), 0), 0);

  const calculatedSubtotal = laborTotal + partsTotal + feesTotal;
  const taxAmount = ro.totalTax || 0;
  const subtotal = ro.grandTotal ? (ro.grandTotal - taxAmount) : calculatedSubtotal;
  const total = ro.grandTotal || (calculatedSubtotal + taxAmount);

  return (
    <div className="print-document bg-white min-h-screen">
      <style>{`
        @media print {
          @page { margin: 0.5in; size: letter; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .print-document { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
        .print-document table { border-collapse: collapse; width: 100%; }
        .print-document th, .print-document td { padding: 6px 8px; text-align: left; }
        .print-document th { background: #f3f4f6; font-weight: 600; }
      `}</style>

      <div className="max-w-[8.5in] mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-green-600 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{location?.name || 'Auto Shop'}</h1>
            {location?.address && (
              <p className="text-sm text-gray-600 mt-1">
                {location.address}
                {location.city && `, ${location.city}`}
                {location.state && `, ${location.state}`}
                {location.zip && ` ${location.zip}`}
              </p>
            )}
            {location?.phone && (
              <p className="text-sm text-gray-600">{location.phone}</p>
            )}
          </div>
          <div className="text-right">
            <div className="bg-green-600 text-white px-4 py-2 rounded-t-lg">
              <h2 className="text-xl font-bold">INVOICE</h2>
            </div>
            <div className="border border-green-600 border-t-0 px-4 py-3 rounded-b-lg">
              <p className="text-2xl font-bold text-green-600">#{invoiceNumber}</p>
              <p className="text-sm text-gray-600 mt-1">
                Date: {format(new Date(invoiceDate), 'MM/dd/yyyy')}
              </p>
              <p className="text-xs text-gray-500">RO #{ro.roNumber}</p>
            </div>
          </div>
        </div>

        {/* Bill To & Vehicle Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="border rounded p-4">
            <h3 className="font-bold text-green-700 border-b pb-2 mb-2">BILL TO</h3>
            <p className="font-semibold text-lg">{customer?.firstName} {customer?.lastName}</p>
            {customer?.address && <p className="text-sm">{customer.address}</p>}
            {(customer?.city || customer?.state || customer?.zip) && (
              <p className="text-sm">
                {customer.city}{customer.state && `, ${customer.state}`} {customer.zip}
              </p>
            )}
            {customer?.phone && <p className="text-sm mt-2">Phone: {customer.phone}</p>}
            {customer?.email && <p className="text-sm">Email: {customer.email}</p>}
          </div>
          <div className="border rounded p-4">
            <h3 className="font-bold text-green-700 border-b pb-2 mb-2">VEHICLE SERVICED</h3>
            <p className="font-semibold text-lg">{vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
            {vehicle?.color && <p className="text-sm">Color: {vehicle.color}</p>}
            {vehicle?.licensePlate && <p className="text-sm">License: {vehicle.licensePlate}</p>}
            {vehicle?.vin && <p className="text-sm font-mono text-xs mt-1">VIN: {vehicle.vin}</p>}
            <p className="text-sm mt-2">Mileage: {ro.odometerIn?.toLocaleString()}</p>
          </div>
        </div>

        {/* Services Table */}
        <div className="mb-6">
          <table className="border w-full">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="text-left py-2 px-3">Description</th>
                <th className="w-20 text-center">Qty</th>
                <th className="w-24 text-right">Rate</th>
                <th className="w-24 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <>
                  <tr key={`job-${job.id}`} className="bg-gray-100 border-b">
                    <td colSpan={4} className="py-2 px-3 font-semibold text-gray-800">
                      {job.name}
                      {job.description && (
                        <span className="font-normal text-gray-500 ml-2 text-sm">- {job.description}</span>
                      )}
                    </td>
                  </tr>
                  {job.lineItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 pl-6">
                        <span className={`inline-block w-14 text-xs px-1.5 py-0.5 rounded mr-2 text-center font-medium ${
                          item.type === 'LABOR' ? 'bg-blue-100 text-blue-700' :
                          item.type === 'PART' ? 'bg-green-100 text-green-700' :
                          item.type === 'TIRE' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.type}
                        </span>
                        {item.description}
                        {item.partNumber && (
                          <span className="text-xs text-gray-400 ml-1">({item.partNumber})</span>
                        )}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="text-right font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="border rounded overflow-hidden">
              <div className="flex justify-between px-4 py-2 border-b bg-gray-50">
                <span>Labor:</span>
                <span className="font-medium">${laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-4 py-2 border-b bg-gray-50">
                <span>Parts & Materials:</span>
                <span className="font-medium">${partsTotal.toFixed(2)}</span>
              </div>
              {feesTotal > 0 && (
                <div className="flex justify-between px-4 py-2 border-b bg-gray-50">
                  <span>Fees & Sublet:</span>
                  <span className="font-medium">${feesTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2 border-b">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between px-4 py-2 border-b">
                  <span>Tax:</span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 bg-green-600 text-white font-bold text-lg">
                <span>AMOUNT DUE:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {ro.status === 'completed' && (
          <div className="text-center mb-6">
            <div className="inline-block border-4 border-green-600 text-green-600 px-8 py-2 text-2xl font-bold transform -rotate-12">
              PAID
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700">Thank you for your business!</p>
          <p className="mt-1">Payment is due upon receipt unless other arrangements have been made.</p>
          {location?.phone && <p className="mt-2">Questions? Call us at {location.phone}</p>}
        </div>

        {/* Notes */}
        {ro.notes && (
          <div className="mt-6 border rounded p-4 bg-gray-50">
            <h3 className="font-bold text-gray-700 mb-2">Service Notes</h3>
            <p className="text-sm whitespace-pre-wrap">{ro.notes}</p>
          </div>
        )}

        {/* Print Button - hidden when printing */}
        <div className="no-print mt-8 text-center space-x-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            data-testid="button-print-invoice"
          >
            Print Invoice
          </button>
          <a
            href={`/ros/${roId}/print`}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-block"
            data-testid="link-print-ro"
          >
            View Repair Order
          </a>
        </div>
      </div>
    </div>
  );
}
