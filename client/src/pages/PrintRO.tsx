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
  totalLabor?: number;
  totalParts?: number;
  totalTax?: number;
  grandTotal?: number;
  customerId: string;
  vehicleId: string;
  locationId: string;
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

export default function PrintRO() {
  const [, params] = useRoute('/ros/:id/print');
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
        <p className="text-gray-500">Repair order not found</p>
      </div>
    );
  }

  const jobs = (ro.jobs || []) as Job[];

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
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
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
            <h2 className="text-xl font-bold text-gray-900">REPAIR ORDER</h2>
            <p className="text-2xl font-bold text-blue-600 mt-1">#{ro.roNumber}</p>
            <p className="text-sm text-gray-600 mt-2">
              Date: {format(new Date(ro.createdAt), 'MM/dd/yyyy')}
            </p>
            {ro.promisedAt && (
              <p className="text-sm text-gray-600">
                Promised: {format(new Date(ro.promisedAt), 'MM/dd/yyyy h:mm a')}
              </p>
            )}
          </div>
        </div>

        {/* Customer & Vehicle Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="border rounded p-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">CUSTOMER</h3>
            <p className="font-semibold">{customer?.firstName} {customer?.lastName}</p>
            {customer?.address && <p className="text-sm">{customer.address}</p>}
            {(customer?.city || customer?.state || customer?.zip) && (
              <p className="text-sm">
                {customer.city}{customer.state && `, ${customer.state}`} {customer.zip}
              </p>
            )}
            {customer?.phone && <p className="text-sm mt-1">Phone: {customer.phone}</p>}
            {customer?.email && <p className="text-sm">Email: {customer.email}</p>}
          </div>
          <div className="border rounded p-4">
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">VEHICLE</h3>
            <p className="font-semibold">{vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
            {vehicle?.color && <p className="text-sm">Color: {vehicle.color}</p>}
            {vehicle?.licensePlate && <p className="text-sm">License: {vehicle.licensePlate}</p>}
            {vehicle?.vin && <p className="text-sm font-mono">VIN: {vehicle.vin}</p>}
            <p className="text-sm mt-1">Odometer In: {ro.odometerIn?.toLocaleString()} miles</p>
          </div>
        </div>

        {/* Services */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-800 bg-gray-100 px-4 py-2 border-b-2 border-gray-800">
            SERVICES TO BE PERFORMED
          </h3>
          
          {jobs.map((job, jobIndex) => (
            <div key={job.id} className="mb-4">
              <div className="bg-gray-50 px-4 py-2 font-semibold border-l-4 border-blue-500">
                {jobIndex + 1}. {job.name}
              </div>
              {job.description && (
                <p className="text-sm text-gray-600 px-4 py-1 italic">{job.description}</p>
              )}
              <table className="border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="w-16">Type</th>
                    <th>Description</th>
                    <th className="w-24">Part #</th>
                    <th className="w-20 text-center">Hours/Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {job.lineItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          item.type === 'LABOR' ? 'bg-blue-100 text-blue-700' :
                          item.type === 'PART' ? 'bg-green-100 text-green-700' :
                          item.type === 'TIRE' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td>{item.description}</td>
                      <td className="text-xs font-mono">{item.partNumber || '-'}</td>
                      <td className="text-center">
                        {item.type === 'LABOR' 
                          ? `${item.quantity} hr${item.quantity !== 1 ? 's' : ''}`
                          : item.quantity
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Notes */}
        {ro.notes && (
          <div className="mb-6 border rounded p-4 bg-yellow-50">
            <h3 className="font-bold text-gray-800 mb-2">NOTES</h3>
            <p className="text-sm whitespace-pre-wrap">{ro.notes}</p>
          </div>
        )}

        {/* Authorization Line */}
        <div className="border-t-2 border-gray-800 pt-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm mb-8">
                I hereby authorize the above repair work to be done along with the necessary materials.
                You and your employees may operate the vehicle for purposes of testing and/or inspection.
              </p>
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-xs text-gray-600">Customer Signature</p>
            </div>
            <div className="text-right">
              <div className="border-b border-gray-400 mb-1 h-8 mt-8"></div>
              <p className="text-xs text-gray-600">Date</p>
            </div>
          </div>
        </div>

        {/* Print Button - hidden when printing */}
        <div className="no-print mt-8 text-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            data-testid="button-print"
          >
            Print Repair Order
          </button>
        </div>
      </div>
    </div>
  );
}
