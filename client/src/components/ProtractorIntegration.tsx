import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Download,
  Clock,
  AlertTriangle,
  Link2,
  Unlink
} from 'lucide-react';
import { format } from 'date-fns';

interface ProtractorConnection {
  connected: boolean;
  isActive?: boolean;
  lastSyncAt?: string;
  lastError?: string;
  createdAt?: string;
}

interface ProtractorImportJob {
  id: string;
  importType: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface Props {
  locationId: string;
  locationName: string;
}

export function ProtractorIntegration({ locationId, locationName }: Props) {
  const [connectionId, setConnectionId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authentication, setAuthentication] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [importType, setImportType] = useState<string>('FULL');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connection, isLoading: connectionLoading } = useQuery<ProtractorConnection>({
    queryKey: ['protractor-connection', locationId],
    queryFn: async () => {
      const res = await fetch(`/api/integrations/protractor/${locationId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch connection');
      return res.json();
    },
  });

  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<ProtractorImportJob[]>({
    queryKey: ['protractor-jobs', locationId],
    queryFn: async () => {
      const res = await fetch(`/api/integrations/protractor/${locationId}/jobs`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      return res.json();
    },
    enabled: !!connection?.connected,
    refetchInterval: (query) => {
      const data = query.state.data as ProtractorImportJob[] | undefined;
      return data?.some((j: ProtractorImportJob) => j.status === 'RUNNING' || j.status === 'PENDING') ? 3000 : false;
    },
  });

  const saveCredentialsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/integrations/protractor/${locationId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ connectionId, apiKey, authentication }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protractor-connection', locationId] });
      toast({ title: 'Credentials saved', description: 'Protractor credentials have been saved.' });
      setShowCredentials(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/integrations/protractor/${locationId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(showCredentials ? { connectionId, apiKey, authentication } : {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['protractor-connection', locationId] });
      if (data.success) {
        toast({ 
          title: 'Connection successful', 
          description: data.message,
        });
      } else {
        toast({ 
          title: 'Connection failed', 
          description: data.message,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/integrations/protractor/${locationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protractor-connection', locationId] });
      toast({ title: 'Disconnected', description: 'Protractor integration has been removed.' });
    },
  });

  const startImportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/integrations/protractor/${locationId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ importType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protractor-jobs', locationId] });
      setImportDialogOpen(false);
      toast({ 
        title: 'Import started', 
        description: 'Your data import has begun. This may take a few minutes.',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>;
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (connectionLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/30 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-600" />
          Protractor Integration
          {connection?.connected ? (
            <Badge className="bg-green-600 ml-2">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="ml-2">Not Connected</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Import customers, vehicles, and repair order history from Protractor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connection?.connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Protractor account to import historical data into BayOPS.
            </p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="connectionId">Connection ID</Label>
                <Input
                  id="connectionId"
                  value={connectionId}
                  onChange={(e) => setConnectionId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  data-testid="input-protractor-connection-id"
                />
              </div>
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  data-testid="input-protractor-api-key"
                />
              </div>
              <div>
                <Label htmlFor="authentication">Authentication Token</Label>
                <Input
                  id="authentication"
                  value={authentication}
                  onChange={(e) => setAuthentication(e.target.value)}
                  placeholder="Base64 encoded authentication"
                  data-testid="input-protractor-auth"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => testConnectionMutation.mutate()}
                disabled={!connectionId || !apiKey || !authentication || testConnectionMutation.isPending}
                variant="outline"
                data-testid="button-protractor-test"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                onClick={() => saveCredentialsMutation.mutate()}
                disabled={!connectionId || !apiKey || !authentication || saveCredentialsMutation.isPending}
                data-testid="button-protractor-connect"
              >
                {saveCredentialsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Connect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <div className="font-medium text-green-900">Connected to Protractor</div>
                {connection.lastSyncAt && (
                  <div className="text-xs text-green-700">
                    Last sync: {format(new Date(connection.lastSyncAt), 'MMM d, yyyy h:mm a')}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Unlink className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>

            {connection.lastError && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">{connection.lastError}</div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                variant="outline"
              >
                {testConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
              
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-protractor-import">
                    <Download className="w-4 h-4 mr-2" />
                    Import Data
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import from Protractor</DialogTitle>
                    <DialogDescription>
                      Select what data you want to import from Protractor into BayOPS.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="importType">Import Type</Label>
                      <Select value={importType} onValueChange={setImportType}>
                        <SelectTrigger data-testid="select-import-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">Full Import (Customers, Vehicles, Work Orders)</SelectItem>
                          <SelectItem value="CUSTOMERS">Customers Only</SelectItem>
                          <SelectItem value="VEHICLES">Vehicles Only</SelectItem>
                          <SelectItem value="WORK_ORDERS">Work Orders Only</SelectItem>
                          <SelectItem value="INVOICES">Invoices Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>A full import will:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Import all customers from Protractor</li>
                        <li>Import vehicles linked to those customers</li>
                        <li>Import work orders and invoices from the past year</li>
                      </ul>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => startImportMutation.mutate()}
                      disabled={startImportMutation.isPending}
                      data-testid="button-start-import"
                    >
                      {startImportMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      Start Import
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {jobs.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Import History</h4>
                  <Button variant="ghost" size="sm" onClick={() => refetchJobs()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {jobs.slice(0, 5).map((job) => (
                    <div 
                      key={job.id} 
                      className="p-3 border rounded-lg bg-white"
                      data-testid={`import-job-${job.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {job.importType === 'FULL' ? 'Full Import' : job.importType}
                          </span>
                          {getStatusBadge(job.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(job.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      
                      {(job.status === 'RUNNING' || job.status === 'COMPLETED') && job.totalRecords > 0 && (
                        <div className="space-y-1">
                          <Progress 
                            value={(job.processedRecords / job.totalRecords) * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{job.processedRecords} of {job.totalRecords} records</span>
                            {job.failedRecords > 0 && (
                              <span className="text-red-600">{job.failedRecords} failed</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
