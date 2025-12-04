import { AppLayout } from '@/components/layout/AppLayout';
import { useShopStore } from '@/lib/store';
import { useLocations, useRepairOrders, useUsers } from '@/lib/hooks';
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
  Clock,
  Play,
  Square,
  Wrench,
  User,
  Calendar,
  Timer,
  Coffee,
  FileText
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface TimeLog {
  id: string;
  userId: string;
  locationId: string;
  repairOrderId: string | null;
  jobId: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  notes: string | null;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

export default function TimeTracking() {
  const { currentLocationId, setCurrentLocation } = useShopStore();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: repairOrders = [] } = useRepairOrders(currentLocationId || '');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'clock' | 'history'>('clock');
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [selectedRO, setSelectedRO] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [now, setNow] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date()),
  });

  useEffect(() => {
    if (!currentLocationId && locations.length > 0) {
      setCurrentLocation(locations[0].id);
    }
  }, [currentLocationId, locations, setCurrentLocation]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: activeLog, isLoading: activeLogLoading } = useQuery<TimeLog | null>({
    queryKey: ['active-time-log'],
    queryFn: async () => {
      const res = await fetch('/api/time-logs/active', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch active time log');
      }
      return res.json();
    },
  });

  const { data: timeLogs = [], isLoading: logsLoading } = useQuery<TimeLog[]>({
    queryKey: ['time-logs', currentLocationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });
      const res = await fetch(`/api/time-logs/${currentLocationId}?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch time logs');
      return res.json();
    },
    enabled: !!currentLocationId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const invalidateTimeLogs = () => {
    queryClient.invalidateQueries({ queryKey: ['active-time-log'] });
    queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey[0] === 'time-logs'
    });
  };

  const clockInMutation = useMutation({
    mutationFn: async (data: { locationId: string; notes?: string }) => {
      const res = await fetch('/api/time-logs/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to clock in');
      return res.json();
    },
    onSuccess: () => {
      invalidateTimeLogs();
      toast({ title: 'Clocked In', description: 'Your shift has started.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (data: { breakMinutes?: number; notes?: string }) => {
      const res = await fetch('/api/time-logs/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to clock out');
      return res.json();
    },
    onSuccess: () => {
      invalidateTimeLogs();
      setBreakMinutes('0');
      setNotes('');
      toast({ title: 'Clocked Out', description: 'Your shift has ended.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const startJobMutation = useMutation({
    mutationFn: async (data: { locationId: string; repairOrderId: string; jobId?: string; notes?: string }) => {
      const res = await fetch('/api/time-logs/start-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to start job');
      return res.json();
    },
    onSuccess: () => {
      invalidateTimeLogs();
      setIsJobDialogOpen(false);
      setSelectedRO('');
      setSelectedJob('');
      toast({ title: 'Job Started', description: 'Time is now tracking for this job.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getElapsedTime = (clockIn: string, clockOut?: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : now;
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getWeekDays = () => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  };

  const getLogsForDay = (date: Date) => {
    return timeLogs.filter(log => isSameDay(new Date(log.clockIn), date));
  };

  const getTotalMinutesForDay = (date: Date) => {
    const dayLogs = getLogsForDay(date);
    return dayLogs.reduce((total, log) => {
      const start = new Date(log.clockIn);
      const end = log.clockOut ? new Date(log.clockOut) : now;
      const minutes = differenceInMinutes(end, start);
      const breakMins = log.clockOut ? log.breakMinutes : 0;
      return total + Math.max(0, minutes - breakMins);
    }, 0);
  };

  const getTotalWeekMinutes = () => {
    return getWeekDays().reduce((total, day) => total + getTotalMinutesForDay(day), 0);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.displayName || user?.username || 'Unknown';
  };

  const getRepairOrderNumber = (roId: string | null) => {
    if (!roId) return null;
    const ro = repairOrders.find(r => r.id === roId);
    return ro?.roNumber;
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
  const isClockedIn = !!activeLog;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track work hours and job time for {currentLocation?.name || 'your location'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clock' | 'history')} className="space-y-4">
        <TabsList>
          <TabsTrigger value="clock" className="gap-2" data-testid="tab-clock">
            <Clock className="w-4 h-4" />
            Clock In/Out
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
            <Calendar className="w-4 h-4" />
            Time History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clock" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Time Clock
                </CardTitle>
                <CardDescription>
                  {isClockedIn 
                    ? `Clocked in ${formatDistanceToNow(new Date(activeLog.clockIn))} ago`
                    : 'Start tracking your time'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-6">
                  <div className="text-6xl font-mono font-bold mb-2">
                    {format(now, 'HH:mm:ss')}
                  </div>
                  <div className="text-muted-foreground">
                    {format(now, 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>

                {isClockedIn && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">Currently working</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                          {getElapsedTime(activeLog.clockIn)}
                        </p>
                      </div>
                      {activeLog.repairOrderId && (
                        <Badge variant="outline" className="gap-1">
                          <Wrench className="w-3 h-3" />
                          RO #{getRepairOrderNumber(activeLog.repairOrderId)}
                        </Badge>
                      )}
                    </div>
                    {activeLog.notes && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">{activeLog.notes}</p>
                    )}
                  </div>
                )}

                {!isClockedIn ? (
                  <Button 
                    size="lg" 
                    className="w-full gap-2" 
                    onClick={() => clockInMutation.mutate({ locationId: currentLocationId! })}
                    disabled={!currentLocationId || clockInMutation.isPending}
                    data-testid="button-clock-in"
                  >
                    {clockInMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    Clock In
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => setIsJobDialogOpen(true)}
                        data-testid="button-start-job"
                      >
                        <Wrench className="w-4 h-4" />
                        Start Job
                      </Button>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => {/* Add break functionality */}}
                        data-testid="button-take-break"
                      >
                        <Coffee className="w-4 h-4" />
                        Take Break
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Break Time (minutes)</Label>
                      <Input 
                        type="number"
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(e.target.value)}
                        min="0"
                        data-testid="input-break-minutes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Textarea 
                        placeholder="Add any notes about your shift..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        data-testid="input-notes"
                      />
                    </div>

                    <Button 
                      size="lg" 
                      variant="destructive" 
                      className="w-full gap-2" 
                      onClick={() => clockOutMutation.mutate({ 
                        breakMinutes: parseInt(breakMinutes) || 0,
                        notes: notes || undefined
                      })}
                      disabled={clockOutMutation.isPending}
                      data-testid="button-clock-out"
                    >
                      {clockOutMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                      Clock Out
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  This Week
                </CardTitle>
                <CardDescription>
                  {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getWeekDays().map(day => {
                    const minutes = getTotalMinutesForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div 
                        key={day.toISOString()} 
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isToday ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                        }`}
                      >
                        <div>
                          <p className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                            {format(day, 'EEEE')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(day, 'MMM d')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold">
                            {formatDuration(minutes)}
                          </p>
                          {getLogsForDay(day).length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {getLogsForDay(day).length} entries
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-mono font-bold">
                      {formatDuration(getTotalWeekMinutes())}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Log History</CardTitle>
              <CardDescription>
                View all time entries for this location
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : timeLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No time entries found for this period</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technician</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>RO</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeLogs.map(log => (
                      <TableRow key={log.id} data-testid={`time-log-row-${log.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {getUserName(log.userId)}
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(log.clockIn), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{format(new Date(log.clockIn), 'h:mm a')}</TableCell>
                        <TableCell>
                          {log.clockOut ? format(new Date(log.clockOut), 'h:mm a') : (
                            <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">
                          {getElapsedTime(log.clockIn, log.clockOut)}
                        </TableCell>
                        <TableCell>{log.breakMinutes}m</TableCell>
                        <TableCell>
                          {log.repairOrderId && (
                            <Badge variant="secondary">
                              #{getRepairOrderNumber(log.repairOrderId)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Start Working on Job
            </DialogTitle>
            <DialogDescription>
              Select a repair order to track time against
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Repair Order</Label>
              <Select value={selectedRO} onValueChange={setSelectedRO}>
                <SelectTrigger data-testid="select-repair-order">
                  <SelectValue placeholder="Select a repair order..." />
                </SelectTrigger>
                <SelectContent>
                  {repairOrders
                    .filter(ro => ro.status !== 'COMPLETED' && ro.status !== 'DELIVERED')
                    .map(ro => (
                      <SelectItem key={ro.id} value={ro.id}>
                        RO #{ro.roNumber}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJobDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => startJobMutation.mutate({
                locationId: currentLocationId!,
                repairOrderId: selectedRO,
                jobId: selectedJob || undefined,
              })}
              disabled={!selectedRO || startJobMutation.isPending}
              data-testid="button-confirm-start-job"
            >
              {startJobMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
