import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useLocations } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Package,
  FileText,
  Wrench,
  Users,
  AlertCircle,
  Loader2,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface ReportSummary {
  revenue: {
    total: number;
    labor: number;
    parts: number;
    other: number;
    avgRoValue: number;
  };
  repairOrders: {
    total: number;
    active: number;
    completed: number;
  };
  invoices: {
    total: number;
    paid: number;
    outstanding: number;
    totalPaid: number;
    totalOutstanding: number;
  };
  productivity: {
    totalHoursWorked: number;
    activeTechnicians: number;
  };
  parts: {
    pendingOrders: number;
    totalCost: number;
  };
}

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#f59e0b'];

export default function Reports() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const { data: summary, isLoading } = useQuery<ReportSummary>({
    queryKey: ['report-summary', currentLocationId, dateRange],
    queryFn: async () => {
      if (!currentLocationId) return null;
      const res = await fetch(`/api/reports/summary/${currentLocationId}?range=${dateRange}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch report');
      return res.json();
    },
    enabled: !!currentLocationId,
  });

  const currentLocation = locations.find(l => l.id === currentLocationId);

  const revenueChartData = summary ? [
    { name: 'Labor', value: summary.revenue.labor },
    { name: 'Parts', value: summary.revenue.parts },
    { name: 'Other', value: summary.revenue.other },
  ].filter(d => d.value > 0) : [];

  const invoiceChartData = summary ? [
    { name: 'Paid', value: summary.invoices.totalPaid, count: summary.invoices.paid },
    { name: 'Outstanding', value: summary.invoices.totalOutstanding, count: summary.invoices.outstanding },
  ] : [];

  if (locationsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analytics for {currentLocation?.name || 'All Locations'} &bull; {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !summary ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No data available for the selected period</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="revenue" data-testid="tab-revenue">
              <DollarSign className="w-4 h-4 mr-2" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="productivity" data-testid="tab-productivity">
              <Clock className="w-4 h-4 mr-2" />
              Productivity
            </TabsTrigger>
            <TabsTrigger value="parts" data-testid="tab-parts">
              <Package className="w-4 h-4 mr-2" />
              Parts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-revenue">
                    ${summary.revenue.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {summary.repairOrders.completed} completed ROs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg RO Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-ro">
                    ${summary.revenue.avgRoValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average repair order value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-hours-worked">
                    {summary.productivity.totalHoursWorked.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.productivity.activeTechnicians} active technicians
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-outstanding">
                    ${summary.invoices.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.invoices.outstanding} unpaid invoices
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Revenue by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueChartData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={revenueChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {revenueChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No revenue data
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Repair Orders</CardTitle>
                  <CardDescription>RO status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Active', value: summary.repairOrders.active },
                          { name: 'Completed', value: summary.repairOrders.completed },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Labor Revenue</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-labor-revenue">
                    ${summary.revenue.labor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.revenue.total > 0 ? ((summary.revenue.labor / summary.revenue.total) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Parts Revenue</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-parts-revenue">
                    ${summary.revenue.parts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.revenue.total > 0 ? ((summary.revenue.parts / summary.revenue.total) * 100).toFixed(1) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Other Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-other-revenue">
                    ${summary.revenue.other.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fees, tires, and other services
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Status</CardTitle>
                <CardDescription>Payment collection overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={invoiceChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                      <Bar dataKey="value" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${summary.invoices.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">{summary.invoices.paid} Paid Invoices</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      ${summary.invoices.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-muted-foreground">{summary.invoices.outstanding} Outstanding</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="productivity" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-hours">
                    {summary.productivity.totalHoursWorked.toFixed(1)}h
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total technician hours logged
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Technicians</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-techs">
                    {summary.productivity.activeTechnicians}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Technicians with logged time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue/Hour</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-revenue-per-hour">
                    ${summary.productivity.totalHoursWorked > 0 
                      ? (summary.revenue.total / summary.productivity.totalHoursWorked).toFixed(2) 
                      : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average revenue per hour
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Productivity Metrics</CardTitle>
                <CardDescription>Time and efficiency analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Completed Repair Orders</div>
                        <div className="text-sm text-muted-foreground">Total jobs finished</div>
                      </div>
                      <div className="text-2xl font-bold">{summary.repairOrders.completed}</div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">ROs per Hour</div>
                        <div className="text-sm text-muted-foreground">Efficiency rate</div>
                      </div>
                      <div className="text-2xl font-bold">
                        {summary.productivity.totalHoursWorked > 0 
                          ? (summary.repairOrders.completed / summary.productivity.totalHoursWorked).toFixed(2) 
                          : '0'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Avg Hours per RO</div>
                        <div className="text-sm text-muted-foreground">Time per job</div>
                      </div>
                      <div className="text-2xl font-bold">
                        {summary.repairOrders.completed > 0 
                          ? (summary.productivity.totalHoursWorked / summary.repairOrders.completed).toFixed(1) 
                          : '0'}h
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Active ROs</div>
                        <div className="text-sm text-muted-foreground">Work in progress</div>
                      </div>
                      <div className="text-2xl font-bold">{summary.repairOrders.active}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Parts Cost</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-parts-cost">
                    ${summary.parts.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total parts ordered (received)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Parts Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-parts-revenue-margin">
                    ${summary.revenue.parts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenue from parts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Parts Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-parts-margin">
                    ${(summary.revenue.parts - summary.parts.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.revenue.parts > 0 
                      ? ((1 - summary.parts.totalCost / summary.revenue.parts) * 100).toFixed(1) 
                      : 0}% margin
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Parts Orders</CardTitle>
                <CardDescription>Current order status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-950">
                    <div>
                      <div className="font-medium">Pending Orders</div>
                      <div className="text-sm text-muted-foreground">Awaiting processing</div>
                    </div>
                    <div className="text-2xl font-bold text-amber-600">{summary.parts.pendingOrders}</div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">Parts Cost Ratio</div>
                      <div className="text-sm text-muted-foreground">Cost vs Revenue</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {summary.revenue.parts > 0 
                        ? ((summary.parts.totalCost / summary.revenue.parts) * 100).toFixed(1) 
                        : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
