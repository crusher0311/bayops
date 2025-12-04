import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useLocations, useCustomers, useVehiclesByCustomer } from '@/lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  User,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, setHours, setMinutes, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Appointment {
  id: string;
  locationId: string;
  customerId?: string;
  vehicleId?: string;
  serviceBayId?: string;
  startTime: string;
  endTime: string;
  status: string;
  appointmentType: string;
  estimatedDuration: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleInfo?: string;
  notes?: string;
  createdAt: string;
  services?: AppointmentService[];
}

interface AppointmentService {
  id: string;
  appointmentId: string;
  serviceName: string;
  estimatedHours: number;
  notes?: string;
}

interface ServiceBay {
  id: string;
  locationId: string;
  name: string;
  bayType: string;
  isActive: boolean;
  capacity: number;
  sortOrder: number;
}

const APPOINTMENT_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled', color: 'bg-blue-500' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'CHECKED_IN', label: 'Checked In', color: 'bg-purple-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-slate-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'NO_SHOW', label: 'No Show', color: 'bg-rose-500' },
];

const APPOINTMENT_TYPES = [
  { value: 'SERVICE', label: 'Service Appointment' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'ESTIMATE', label: 'Estimate' },
  { value: 'DROP_OFF', label: 'Drop-Off' },
  { value: 'PICK_UP', label: 'Pick-Up' },
  { value: 'WAITER', label: 'Waiter' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  return [
    { value: `${hour.toString().padStart(2, '0')}:00`, label: format(setHours(setMinutes(new Date(), 0), hour), 'h:mm a') },
    { value: `${hour.toString().padStart(2, '0')}:30`, label: format(setHours(setMinutes(new Date(), 30), hour), 'h:mm a') },
  ];
}).flat().filter((_, i) => i >= 14 && i < 40);

export default function Appointments() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: customers = [] } = useCustomers();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    vehicleId: '',
    serviceBayId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    appointmentType: 'SERVICE',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleInfo: '',
    notes: '',
    services: [] as { serviceName: string; estimatedHours: number; notes?: string }[],
  });

  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: addDays(startOfWeek(addDays(monthEnd, 6)), 6) });

  const startDateQuery = viewMode === 'day' 
    ? format(currentDate, 'yyyy-MM-dd')
    : viewMode === 'week'
    ? format(weekStart, 'yyyy-MM-dd')
    : format(startOfWeek(monthStart), 'yyyy-MM-dd');
  
  const endDateQuery = viewMode === 'day'
    ? format(addDays(currentDate, 1), 'yyyy-MM-dd')
    : viewMode === 'week'
    ? format(addDays(weekStart, 7), 'yyyy-MM-dd')
    : format(addDays(endOfMonth(currentDate), 7), 'yyyy-MM-dd');

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', currentLocationId, startDateQuery, endDateQuery],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${currentLocationId}?startDate=${startDateQuery}&endDate=${endDateQuery}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    },
    enabled: !!currentLocationId,
  });

  const { data: serviceBays = [] } = useQuery<ServiceBay[]>({
    queryKey: ['service-bays', currentLocationId],
    queryFn: async () => {
      const res = await fetch(`/api/service-bays/${currentLocationId}`, { credentials: 'include' });
      if (!res.ok) return [];
      const result = await res.json();
      return Array.isArray(result) ? result : [];
    },
    enabled: !!currentLocationId,
  });

  const { data: customerVehicles = [] } = useVehiclesByCustomer(selectedCustomerId || '');

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);
      const estimatedDuration = (endDateTime.getTime() - startDateTime.getTime()) / 1000 / 60;
      
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          locationId: currentLocationId,
          customerId: data.customerId || undefined,
          vehicleId: data.vehicleId || undefined,
          serviceBayId: data.serviceBayId || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          status: 'SCHEDULED',
          appointmentType: data.appointmentType,
          estimatedDuration,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          vehicleInfo: data.vehicleInfo,
          notes: data.notes,
          services: data.services,
        }),
      });
      if (!res.ok) throw new Error('Failed to create appointment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsBookingOpen(false);
      resetForm();
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const startDateTime = new Date(`${data.date}T${data.startTime}`);
      const endDateTime = new Date(`${data.date}T${data.endTime}`);
      
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: data.customerId || undefined,
          vehicleId: data.vehicleId || undefined,
          serviceBayId: data.serviceBayId || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          status: data.status,
          appointmentType: data.appointmentType,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          vehicleInfo: data.vehicleInfo,
          notes: data.notes,
          services: data.services,
        }),
      });
      if (!res.ok) throw new Error('Failed to update appointment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsBookingOpen(false);
      setSelectedAppointment(null);
      resetForm();
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete appointment');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsBookingOpen(false);
      setSelectedAppointment(null);
    },
  });

  const resetForm = () => {
    setFormData({
      customerId: '',
      vehicleId: '',
      serviceBayId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      appointmentType: 'SERVICE',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      vehicleInfo: '',
      notes: '',
      services: [],
    });
    setSelectedCustomerId(null);
    setCustomerSearch('');
  };

  const handleOpenBooking = (date?: Date, time?: string) => {
    resetForm();
    if (date) {
      setFormData(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
    }
    if (time) {
      const endTime = TIME_SLOTS.find(t => t.value > time)?.value || '18:00';
      setFormData(prev => ({ ...prev, startTime: time, endTime }));
    }
    setIsBookingOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    const start = parseISO(appointment.startTime);
    const end = parseISO(appointment.endTime);
    setSelectedAppointment(appointment);
    setFormData({
      customerId: appointment.customerId || '',
      vehicleId: appointment.vehicleId || '',
      serviceBayId: appointment.serviceBayId || '',
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      appointmentType: appointment.appointmentType,
      customerName: appointment.customerName || '',
      customerPhone: appointment.customerPhone || '',
      customerEmail: appointment.customerEmail || '',
      vehicleInfo: appointment.vehicleInfo || '',
      notes: appointment.notes || '',
      services: appointment.services?.map(s => ({
        serviceName: s.serviceName,
        estimatedHours: s.estimatedHours,
        notes: s.notes,
      })) || [],
    });
    if (appointment.customerId) {
      setSelectedCustomerId(appointment.customerId);
    }
    setIsBookingOpen(true);
  };

  const handleSubmit = () => {
    if (selectedAppointment) {
      updateAppointmentMutation.mutate({ id: selectedAppointment.id, data: formData });
    } else {
      createAppointmentMutation.mutate(formData);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
    }));
    setCustomerSearch('');
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return [];
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search)
    ).slice(0, 5);
  }, [customers, customerSearch]);

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(parseISO(apt.startTime), date));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = APPOINTMENT_STATUSES.find(s => s.value === status);
    return (
      <Badge className={`${statusConfig?.color || 'bg-slate-500'} text-white text-xs`}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage appointments for {currentLocation?.name || 'your location'}
          </p>
        </div>
        <Button onClick={() => handleOpenBooking()} className="gap-2" data-testid="button-new-appointment">
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigateDate('prev')}
                  data-testid="button-prev-date"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => navigateDate('next')}
                  data-testid="button-next-date"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button 
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                data-testid="button-today"
              >
                Today
              </Button>
              <h2 className="text-xl font-semibold">
                {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                {viewMode === 'week' && `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="day" data-testid="tab-day-view">Day</TabsTrigger>
                <TabsTrigger value="week" data-testid="tab-week-view">Week</TabsTrigger>
                <TabsTrigger value="month" data-testid="tab-month-view">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {appointmentsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === 'day' ? (
            <DayView 
              date={currentDate}
              appointments={getAppointmentsForDay(currentDate)}
              serviceBays={serviceBays}
              onSlotClick={(time) => handleOpenBooking(currentDate, time)}
              onAppointmentClick={handleEditAppointment}
              getStatusBadge={getStatusBadge}
            />
          ) : viewMode === 'week' ? (
            <WeekView 
              weekDays={weekDays}
              appointments={appointments}
              onSlotClick={(date, time) => handleOpenBooking(date, time)}
              onAppointmentClick={handleEditAppointment}
              getStatusBadge={getStatusBadge}
            />
          ) : (
            <MonthView 
              currentDate={currentDate}
              monthDays={monthDays}
              appointments={appointments}
              onDayClick={(date) => { setCurrentDate(date); setViewMode('day'); }}
              onAppointmentClick={handleEditAppointment}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isBookingOpen} onOpenChange={(open) => { setIsBookingOpen(open); if (!open) { setSelectedAppointment(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAppointment ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
            <DialogDescription>
              {selectedAppointment ? 'Update appointment details' : 'Schedule a new appointment for a customer'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search customers by name, phone, or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-customer-search"
                />
                {filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50">
                    {filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex items-center justify-between"
                        onClick={() => handleSelectCustomer(customer)}
                        data-testid={`select-customer-${customer.id}`}
                      >
                        <div>
                          <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                          <div className="text-sm text-muted-foreground">{customer.phone} • {customer.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomerId && (
                <div className="flex items-center gap-2 p-2 bg-accent rounded-md">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{formData.customerName}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setSelectedCustomerId(null); setFormData(prev => ({ ...prev, customerId: '', customerName: '', customerPhone: '', customerEmail: '', vehicleId: '' })); }}
                    className="ml-auto"
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>

            {!selectedCustomerId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input 
                    placeholder="Walk-in customer name"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    data-testid="input-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    placeholder="Phone number"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    data-testid="input-customer-phone"
                  />
                </div>
              </div>
            )}

            {selectedCustomerId && customerVehicles.length > 0 && (
              <div className="space-y-2">
                <Label>Vehicle</Label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(v) => {
                    const vehicle = customerVehicles.find(veh => veh.id === v);
                    setFormData(prev => ({ 
                      ...prev, 
                      vehicleId: v,
                      vehicleInfo: vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ''
                    }));
                  }}
                >
                  <SelectTrigger data-testid="select-vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.licensePlate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!selectedCustomerId && (
              <div className="space-y-2">
                <Label>Vehicle Info</Label>
                <Input 
                  placeholder="Year Make Model (e.g., 2020 Toyota Camry)"
                  value={formData.vehicleInfo}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleInfo: e.target.value }))}
                  data-testid="input-vehicle-info"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  data-testid="input-appointment-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Appointment Type</Label>
                <Select
                  value={formData.appointmentType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, appointmentType: v }))}
                >
                  <SelectTrigger data-testid="select-appointment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select
                  value={formData.startTime}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, startTime: v }))}
                >
                  <SelectTrigger data-testid="select-start-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select
                  value={formData.endTime}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, endTime: v }))}
                >
                  <SelectTrigger data-testid="select-end-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.filter(slot => slot.value > formData.startTime).map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {serviceBays.length > 0 && (
              <div className="space-y-2">
                <Label>Service Bay (Optional)</Label>
                <Select
                  value={formData.serviceBayId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, serviceBayId: v }))}
                >
                  <SelectTrigger data-testid="select-service-bay">
                    <SelectValue placeholder="Assign to bay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {serviceBays.filter(b => b.isActive).map(bay => (
                      <SelectItem key={bay.id} value={bay.id}>{bay.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Add any notes or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                data-testid="input-appointment-notes"
              />
            </div>

            {selectedAppointment && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedAppointment.status}
                  onValueChange={(v) => setSelectedAppointment(prev => prev ? { ...prev, status: v } : null)}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedAppointment && (
              <Button 
                variant="destructive" 
                onClick={() => deleteAppointmentMutation.mutate(selectedAppointment.id)}
                disabled={deleteAppointmentMutation.isPending}
                data-testid="button-delete-appointment"
              >
                {deleteAppointmentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsBookingOpen(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
              data-testid="button-save-appointment"
            >
              {(createAppointmentMutation.isPending || updateAppointmentMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {selectedAppointment ? 'Update Appointment' : 'Book Appointment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function DayView({ 
  date, 
  appointments, 
  serviceBays,
  onSlotClick, 
  onAppointmentClick,
  getStatusBadge 
}: {
  date: Date;
  appointments: Appointment[];
  serviceBays: ServiceBay[];
  onSlotClick: (time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const getAppointmentPosition = (appointment: Appointment) => {
    const start = parseISO(appointment.startTime);
    const end = parseISO(appointment.endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = ((startHour - 7) * 60);
    const height = ((endHour - startHour) * 60);
    return { top, height };
  };

  return (
    <div className="flex">
      <div className="w-20 flex-shrink-0">
        {hours.map(hour => (
          <div key={hour} className="h-[60px] text-right pr-4 text-sm text-muted-foreground">
            {format(setHours(new Date(), hour), 'h a')}
          </div>
        ))}
      </div>
      <div className="flex-1 relative border-l">
        {hours.map(hour => (
          <div 
            key={hour} 
            className="h-[60px] border-b border-dashed hover:bg-accent/50 cursor-pointer"
            onClick={() => onSlotClick(`${hour.toString().padStart(2, '0')}:00`)}
          />
        ))}
        {appointments.map(appointment => {
          const { top, height } = getAppointmentPosition(appointment);
          return (
            <div
              key={appointment.id}
              className="absolute left-2 right-2 bg-blue-500/20 border-l-4 border-blue-500 rounded px-2 py-1 cursor-pointer hover:bg-blue-500/30"
              style={{ top: `${top}px`, height: `${height}px`, minHeight: '30px' }}
              onClick={(e) => { e.stopPropagation(); onAppointmentClick(appointment); }}
              data-testid={`appointment-${appointment.id}`}
            >
              <div className="font-medium text-sm truncate">{appointment.customerName || 'Walk-in'}</div>
              {height > 40 && (
                <div className="text-xs text-muted-foreground truncate">{appointment.vehicleInfo}</div>
              )}
              {height > 60 && (
                <div className="mt-1">{getStatusBadge(appointment.status)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ 
  weekDays, 
  appointments, 
  onSlotClick, 
  onAppointmentClick,
  getStatusBadge
}: {
  weekDays: Date[];
  appointments: Appointment[];
  onSlotClick: (date: Date, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const getAppointmentsForDayHour = (day: Date, hour: number) => {
    return appointments.filter(apt => {
      const start = parseISO(apt.startTime);
      return isSameDay(start, day) && start.getHours() === hour;
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-8 border-b">
          <div className="w-20" />
          {weekDays.map(day => (
            <div 
              key={day.toISOString()} 
              className={`p-2 text-center border-l ${isToday(day) ? 'bg-blue-500/10' : ''}`}
            >
              <div className="text-sm text-muted-foreground">{format(day, 'EEE')}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? 'text-blue-500' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b">
              <div className="w-20 h-[60px] text-right pr-4 text-sm text-muted-foreground pt-1">
                {format(setHours(new Date(), hour), 'h a')}
              </div>
              {weekDays.map(day => {
                const dayAppointments = getAppointmentsForDayHour(day, hour);
                return (
                  <div 
                    key={day.toISOString()} 
                    className="h-[60px] border-l hover:bg-accent/50 cursor-pointer relative p-0.5"
                    onClick={() => onSlotClick(day, `${hour.toString().padStart(2, '0')}:00`)}
                  >
                    {dayAppointments.map(apt => (
                      <div
                        key={apt.id}
                        className="bg-blue-500/20 border-l-2 border-blue-500 rounded px-1 py-0.5 text-xs cursor-pointer hover:bg-blue-500/30 truncate"
                        onClick={(e) => { e.stopPropagation(); onAppointmentClick(apt); }}
                        data-testid={`week-appointment-${apt.id}`}
                      >
                        <div className="font-medium truncate">{apt.customerName || 'Walk-in'}</div>
                        <div className="text-muted-foreground truncate">{format(parseISO(apt.startTime), 'h:mm a')}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({ 
  currentDate,
  monthDays, 
  appointments,
  onDayClick,
  onAppointmentClick
}: {
  currentDate: Date;
  monthDays: Date[];
  appointments: Appointment[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}) {
  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => isSameDay(parseISO(apt.startTime), day));
  };

  return (
    <div className="grid grid-cols-7 gap-px bg-border">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-background p-2 text-center text-sm font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      {monthDays.slice(0, 42).map(day => {
        const dayAppointments = getAppointmentsForDay(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        return (
          <div 
            key={day.toISOString()} 
            className={`bg-background min-h-[100px] p-1 cursor-pointer hover:bg-accent/50 ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday(day) ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
            onClick={() => onDayClick(day)}
            data-testid={`month-day-${format(day, 'yyyy-MM-dd')}`}
          >
            <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-blue-500' : ''}`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-0.5">
              {dayAppointments.slice(0, 3).map(apt => (
                <div
                  key={apt.id}
                  className="text-xs bg-blue-500/20 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-blue-500/30"
                  onClick={(e) => { e.stopPropagation(); onAppointmentClick(apt); }}
                  data-testid={`month-appointment-${apt.id}`}
                >
                  {format(parseISO(apt.startTime), 'h:mm a')} {apt.customerName || 'Walk-in'}
                </div>
              ))}
              {dayAppointments.length > 3 && (
                <div className="text-xs text-muted-foreground px-1">
                  +{dayAppointments.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
