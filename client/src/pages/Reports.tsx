import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useLocations } from '@/lib/hooks';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Package,
  FileText,
  Wrench,
  Users,
  AlertCircle,
  Loader2,
  BarChart3,
  PieChart,
  Car,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Target,
  Zap,
  CircleDollarSign,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
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

interface KPI {
  value: number;
  change?: number;
}

interface AnalyticsData {
  dateRange: { start: string; end: string };
  kpis: {
    totalRevenue: KPI;
    carCount: KPI;
    avgRO: KPI;
    completedROs: KPI;
    laborRevenue: KPI;
    partsRevenue: KPI;
    otherRevenue: KPI;
    laborMargin: KPI;
    partsMargin: KPI;
    grossProfit: KPI;
  };
  trends: { date: string; revenue: number; carCount: number; ros: number }[];
  technicians: { id: string; name: string; hoursWorked: number; revenue: number; jobsCompleted: number; efficiency: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  deferredWork: { pending: number; converted: number; value: number; conversionRate: number };
  aging: { current: number; days30: number; days60: number; days90: number };
  invoices: { total: number; paid: number; outstanding: number; totalPaid: number; totalOutstanding: number };
}

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#f59e0b', '#ef4444', '#06b6d4'];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value * 100) / 100);
}

function ChangeIndicator({ change, suffix = '%' }: { change?: number; suffix?: string }) {
  if (change === undefined || change === 0) return null;
  const isPositive = change > 0;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}{suffix}
    </span>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, change, format: formatType = 'currency', onClick, clickable = false }: {
  title: string;
  value: number;
  subtitle?: string;
  icon: any;
  change?: number;
  format?: 'currency' | 'number' | 'percent';
  onClick?: () => void;
  clickable?: boolean;
}) {
  const formattedValue = formatType === 'currency' 
    ? formatCurrency(value) 
    : formatType === 'percent' 
      ? `${value.toFixed(1)}%` 
      : formatNumber(value);
  
  return (
    <Card 
      className={`hover:shadow-md transition-shadow ${clickable ? 'cursor-pointer hover:border-primary/50' : ''}`}
      onClick={onClick}
      data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{formattedValue}</div>
          <ChangeIndicator change={change} />
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
            {clickable && <span className="text-primary ml-1">→ View details</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface DrillDownData {
  metric: string;
  title: string;
  data: any[];
}

export default function Reports() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const [dateRange, setDateRange] = useState('month');
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [drillDownType, setDrillDownType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [locations, currentLocationId, setCurrentLocation]);

  const { data: analytics, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analytics', currentLocationId, dateRange, compareEnabled],
    queryFn: async () => {
      if (!currentLocationId) return null;
      const res = await fetch(
        `/api/reports/analytics/${currentLocationId}?range=${dateRange}&compare=${compareEnabled}`, 
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: !!currentLocationId,
    refetchInterval: 60000,
  });

  const { data: drillDownData, isLoading: drillDownLoading } = useQuery<DrillDownData>({
    queryKey: ['drilldown', currentLocationId, drillDownType, dateRange],
    queryFn: async () => {
      if (!currentLocationId || !drillDownType) return null;
      const res = await fetch(
        `/api/reports/drilldown/${currentLocationId}/${drillDownType}?range=${dateRange}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch drill-down data');
      return res.json();
    },
    enabled: !!currentLocationId && !!drillDownType,
  });

  const handleExport = async (type: string) => {
    if (!currentLocationId) return;
    window.open(`/api/reports/export/${currentLocationId}?type=${type}&range=${dateRange}`, '_blank');
  };

  const openDrillDown = (metric: string) => {
    setDrillDownType(metric);
  };

  const closeDrillDown = () => {
    setDrillDownType(null);
  };

  const currentLocation = locations.find(l => l.id === currentLocationId);

  const revenueBreakdown = analytics ? [
    { name: 'Labor', value: analytics.kpis.laborRevenue.value, color: COLORS[0] },
    { name: 'Parts', value: analytics.kpis.partsRevenue.value, color: COLORS[1] },
    { name: 'Other', value: analytics.kpis.otherRevenue.value, color: COLORS[2] },
  ].filter(d => d.value > 0) : [];

  const agingData = analytics ? [
    { name: 'Current', value: analytics.aging.current, color: '#22c55e' },
    { name: '31-60 Days', value: analytics.aging.days30, color: '#f59e0b' },
    { name: '61-90 Days', value: analytics.aging.days60, color: '#f97316' },
    { name: '90+ Days', value: analytics.aging.days90, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

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
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">
            {currentLocation?.name || 'All Locations'} &bull; {format(new Date(), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch 
              id="compare" 
              checked={compareEnabled} 
              onCheckedChange={setCompareEnabled}
              data-testid="switch-compare"
            />
            <Label htmlFor="compare" className="text-sm">Compare</Label>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]" data-testid="select-date-range">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(range => (
                <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value="" onValueChange={handleExport}>
            <SelectTrigger className="w-[130px]" data-testid="button-export">
              <Download className="w-4 h-4 mr-2" />
              <span>Export</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoices">Invoices CSV</SelectItem>
              <SelectItem value="ros">Repair Orders CSV</SelectItem>
              <SelectItem value="technicians">Technicians CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !analytics ? (
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No data available for the selected period</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="revenue" data-testid="tab-revenue">
              <DollarSign className="w-4 h-4 mr-2" />
              Revenue
            </TabsTrigger>
            <TabsTrigger value="technicians" data-testid="tab-technicians">
              <Users className="w-4 h-4 mr-2" />
              Technicians
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              <Wrench className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="ar" data-testid="tab-ar">
              <FileText className="w-4 h-4 mr-2" />
              A/R & Aging
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KPICard 
                title="Total Revenue" 
                value={analytics.kpis.totalRevenue.value} 
                icon={DollarSign}
                change={compareEnabled ? analytics.kpis.totalRevenue.change : undefined}
                subtitle={`${analytics.invoices.paid} paid invoices`}
                clickable
                onClick={() => openDrillDown('revenue')}
              />
              <KPICard 
                title="Average RO" 
                value={analytics.kpis.avgRO.value} 
                icon={TrendingUp}
                change={compareEnabled ? analytics.kpis.avgRO.change : undefined}
                subtitle="Average repair order value"
                clickable
                onClick={() => openDrillDown('avgro')}
              />
              <KPICard 
                title="Car Count" 
                value={analytics.kpis.carCount.value} 
                icon={Car}
                change={compareEnabled ? analytics.kpis.carCount.change : undefined}
                format="number"
                subtitle="Unique vehicles serviced"
                clickable
                onClick={() => openDrillDown('carcount')}
              />
              <KPICard 
                title="Completed ROs" 
                value={analytics.kpis.completedROs.value} 
                icon={Target}
                change={compareEnabled ? analytics.kpis.completedROs.change : undefined}
                format="number"
                subtitle="Repair orders completed"
                clickable
                onClick={() => openDrillDown('completedros')}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>Daily revenue over selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.trends}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => format(new Date(val), 'MMM d')}
                          className="text-xs"
                        />
                        <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} className="text-xs" />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                          labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#2563eb" 
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>Revenue by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {revenueBreakdown.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {revenueBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
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
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Gross Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(analytics.kpis.grossProfit.value)}
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Labor Margin</div>
                      <div className="font-semibold">{analytics.kpis.laborMargin.value.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Parts Margin</div>
                      <div className="font-semibold">{analytics.kpis.partsMargin.value.toFixed(1)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md hover:border-amber-500/50 transition-all"
                onClick={() => openDrillDown('deferred')}
                data-testid="card-deferred-work"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Deferred Work</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600">
                    {formatCurrency(analytics.deferredWork.value)}
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Pending</div>
                      <div className="font-semibold">{analytics.deferredWork.pending} items</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Conversion</div>
                      <div className="font-semibold">{analytics.deferredWork.conversionRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">→ View pending items</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md hover:border-red-500/50 transition-all"
                onClick={() => openDrillDown('outstanding')}
                data-testid="card-outstanding-ar"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Outstanding A/R</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(analytics.invoices.totalOutstanding)}
                  </div>
                  <div className="flex gap-4 mt-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Invoices</div>
                      <div className="font-semibold">{analytics.invoices.outstanding} unpaid</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">90+ Days</div>
                      <div className="font-semibold text-red-600">{formatCurrency(analytics.aging.days90)}</div>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 mt-2">→ View outstanding invoices</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <KPICard 
                title="Labor Revenue" 
                value={analytics.kpis.laborRevenue.value} 
                icon={Wrench}
                subtitle={`${analytics.kpis.laborMargin.value.toFixed(1)}% margin`}
              />
              <KPICard 
                title="Parts Revenue" 
                value={analytics.kpis.partsRevenue.value} 
                icon={Package}
                subtitle={`${analytics.kpis.partsMargin.value.toFixed(1)}% margin`}
              />
              <KPICard 
                title="Other Revenue" 
                value={analytics.kpis.otherRevenue.value} 
                icon={DollarSign}
                subtitle="Fees, shop supplies, etc."
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Daily revenue and car count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(new Date(val), 'MMM d')}
                      />
                      <YAxis yAxisId="left" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Revenue' : name === 'carCount' ? 'Cars' : 'ROs'
                        ]}
                        labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="carCount" stroke="#7c3aed" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: 'Labor', value: analytics.kpis.laborRevenue.value, total: analytics.kpis.totalRevenue.value, color: 'bg-blue-500' },
                      { label: 'Parts', value: analytics.kpis.partsRevenue.value, total: analytics.kpis.totalRevenue.value, color: 'bg-purple-500' },
                      { label: 'Other', value: analytics.kpis.otherRevenue.value, total: analytics.kpis.totalRevenue.value, color: 'bg-green-500' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.value)} ({item.total > 0 ? ((item.value / item.total) * 100).toFixed(0) : 0}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} rounded-full`} 
                            style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profitability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div>
                        <div className="font-medium text-green-700 dark:text-green-300">Gross Profit</div>
                        <div className="text-sm text-muted-foreground">Revenue minus direct costs</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(analytics.kpis.grossProfit.value)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Labor Margin</div>
                        <div className="text-xl font-bold">{analytics.kpis.laborMargin.value.toFixed(1)}%</div>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground">Parts Margin</div>
                        <div className="text-xl font-bold">{analytics.kpis.partsMargin.value.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Technicians Tab */}
          <TabsContent value="technicians" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Technician Performance</CardTitle>
                <CardDescription>Revenue and productivity by technician</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.technicians.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Hours Worked</TableHead>
                        <TableHead className="text-right">Jobs Completed</TableHead>
                        <TableHead className="text-right">$/Hour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.technicians.map((tech, idx) => (
                        <TableRow key={tech.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {idx === 0 && <Badge className="bg-amber-500">Top</Badge>}
                              <span className="font-medium">{tech.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(tech.revenue)}</TableCell>
                          <TableCell className="text-right">{tech.hoursWorked}h</TableCell>
                          <TableCell className="text-right">{tech.jobsCompleted}</TableCell>
                          <TableCell className="text-right">
                            <span className={tech.efficiency > 100 ? 'text-green-600 font-medium' : ''}>
                              {formatCurrency(tech.efficiency)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    No technician data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {analytics.technicians.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Technician</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.technicians} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Services</CardTitle>
                <CardDescription>Most profitable services performed</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topServices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.topServices.map((service, idx) => (
                        <TableRow key={service.name}>
                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell className="text-right">{service.count}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(service.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(service.revenue / service.count)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    No service data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {analytics.topServices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Service Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.topServices}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                        <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* A/R & Aging Tab */}
          <TabsContent value="ar" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Current (0-30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.aging.current)}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">31-60 Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{formatCurrency(analytics.aging.days30)}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">61-90 Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(analytics.aging.days60)}</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">90+ Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.aging.days90)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Aging Breakdown</CardTitle>
                  <CardDescription>Outstanding invoices by age</CardDescription>
                </CardHeader>
                <CardContent>
                  {agingData.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={agingData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {agingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No outstanding invoices
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">Total Invoiced</div>
                        <div className="text-sm text-muted-foreground">{analytics.invoices.total} invoices</div>
                      </div>
                      <div className="text-xl font-bold">
                        {formatCurrency(analytics.invoices.totalPaid + analytics.invoices.totalOutstanding)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div>
                        <div className="font-medium text-green-700 dark:text-green-300">Collected</div>
                        <div className="text-sm text-muted-foreground">{analytics.invoices.paid} paid</div>
                      </div>
                      <div className="text-xl font-bold text-green-600">{formatCurrency(analytics.invoices.totalPaid)}</div>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                      <div>
                        <div className="font-medium text-red-700 dark:text-red-300">Outstanding</div>
                        <div className="text-sm text-muted-foreground">{analytics.invoices.outstanding} unpaid</div>
                      </div>
                      <div className="text-xl font-bold text-red-600">{formatCurrency(analytics.invoices.totalOutstanding)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Drill-down Modal */}
      <Dialog open={!!drillDownType} onOpenChange={() => closeDrillDown()}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{drillDownData?.title || 'Details'}</DialogTitle>
            <DialogDescription>
              Detailed breakdown for the selected metric
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {drillDownLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : drillDownData && drillDownData.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {drillDownType === 'revenue' || drillDownType === 'avgro' ? (
                      <>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Paid Date</TableHead>
                      </>
                    ) : drillDownType === 'carcount' ? (
                      <>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>VIN</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Visits</TableHead>
                        <TableHead>Last Visit</TableHead>
                      </>
                    ) : drillDownType === 'completedros' ? (
                      <>
                        <TableHead>RO #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Completed</TableHead>
                      </>
                    ) : drillDownType === 'outstanding' ? (
                      <>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount Due</TableHead>
                        <TableHead>Days Past</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    ) : drillDownType === 'deferred' ? (
                      <>
                        <TableHead>Description</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Est. Amount</TableHead>
                        <TableHead>Priority</TableHead>
                      </>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownData.data.map((item: any, idx: number) => (
                    <TableRow key={item.id || idx}>
                      {drillDownType === 'revenue' || drillDownType === 'avgro' ? (
                        <>
                          <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell>{item.vehicle}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                          <TableCell>{item.paidAt ? format(new Date(item.paidAt), 'MMM d, yyyy') : '-'}</TableCell>
                        </>
                      ) : drillDownType === 'carcount' ? (
                        <>
                          <TableCell className="font-medium">{item.vehicle}</TableCell>
                          <TableCell className="font-mono text-xs">{item.vin || '-'}</TableCell>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell className="text-right font-medium">{item.visits}</TableCell>
                          <TableCell>{format(new Date(item.lastVisit), 'MMM d, yyyy')}</TableCell>
                        </>
                      ) : drillDownType === 'completedros' ? (
                        <>
                          <TableCell className="font-medium">{item.roNumber}</TableCell>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell>{item.vehicle}</TableCell>
                          <TableCell className="text-right font-medium">
                            {item.total !== null ? formatCurrency(item.total) : '-'}
                          </TableCell>
                          <TableCell>{format(new Date(item.completedAt), 'MMM d, yyyy')}</TableCell>
                        </>
                      ) : drillDownType === 'outstanding' ? (
                        <>
                          <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.amountDue)}</TableCell>
                          <TableCell>
                            <Badge variant={item.daysPast > 90 ? 'destructive' : item.daysPast > 30 ? 'secondary' : 'outline'}>
                              {item.daysPast} days
                            </Badge>
                          </TableCell>
                          <TableCell>{item.status}</TableCell>
                        </>
                      ) : drillDownType === 'deferred' ? (
                        <>
                          <TableCell className="font-medium max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell>{item.customer}</TableCell>
                          <TableCell>{item.vehicle}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.estimatedAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={item.priority === 'HIGH' ? 'destructive' : item.priority === 'MEDIUM' ? 'secondary' : 'outline'}>
                              {item.priority}
                            </Badge>
                          </TableCell>
                        </>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                No data available
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {drillDownData?.data.length || 0} records
            </div>
            <Button variant="outline" onClick={closeDrillDown}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
