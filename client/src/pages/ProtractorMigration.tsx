import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  Users,
  Car,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

type Step = 'credentials' | 'connect' | 'import' | 'complete';

interface ImportProgress {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  currentPhase?: string;
  errorLog?: Array<{ record: string; error: string; timestamp: string }>;
}

export default function ProtractorMigration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>('credentials');
  const [jobId, setJobId] = useState<string | null>(null);
  
  const [credentials, setCredentials] = useState({
    connectionId: '',
    apiKey: '',
  });
  
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
    locations?: Array<{ ID: string; Name: string }>;
  } | null>(null);

  const [importOptions, setImportOptions] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/migration/protractor/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Connection test failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setConnectionResult(data);
      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: `Found ${data.locations?.length || 0} location(s) in Protractor.`,
        });
        setCurrentStep('connect');
      }
    },
    onError: (error: Error) => {
      setConnectionResult({ success: false, message: error.message });
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const startImportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/migration/protractor/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...credentials,
          startDate: importOptions.startDate,
          endDate: importOptions.endDate,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Import failed to start');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
      setCurrentStep('import');
      toast({
        title: 'Import Started',
        description: 'Your data is being imported. This may take several minutes.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [pollingError, setPollingError] = useState<string | null>(null);
  const [notFoundCount, setNotFoundCount] = useState(0);

  const { data: progress, refetch: refetchProgress } = useQuery<ImportProgress>({
    queryKey: ['migration-progress', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID');
      const res = await fetch(`/api/migration/protractor/status/${jobId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to fetch progress' }));
        if (res.status === 404) {
          setNotFoundCount(prev => prev + 1);
          // After 5 consecutive not-found responses, show error
          if (notFoundCount >= 5) {
            setPollingError('Import job not found. The job may have failed to start. Please try again.');
            setCurrentStep('complete');
          }
        }
        throw new Error(errorData.message || 'Failed to fetch progress');
      }
      setNotFoundCount(0); // Reset on success
      return res.json();
    },
    enabled: !!jobId && currentStep === 'import' && !pollingError,
    refetchInterval: currentStep === 'import' && !pollingError ? 2000 : false,
    retry: false,
  });

  useEffect(() => {
    if (progress?.status === 'COMPLETED' || progress?.status === 'FAILED') {
      setCurrentStep('complete');
    }
  }, [progress?.status]);

  const handleTestConnection = () => {
    if (!credentials.connectionId || !credentials.apiKey) {
      toast({
        title: 'Missing Credentials',
        description: 'Please enter both Connection ID and API Key.',
        variant: 'destructive',
      });
      return;
    }
    testConnectionMutation.mutate();
  };

  const handleStartImport = () => {
    startImportMutation.mutate();
  };

  const progressPercent = progress?.totalRecords 
    ? Math.round((progress.processedRecords / progress.totalRecords) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Migrate from Protractor</CardTitle>
          <CardDescription className="text-slate-400">
            Import all your historical data from Protractor to BayOPS
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex justify-between mb-8">
            {(['credentials', 'connect', 'import', 'complete'] as Step[]).map((step, idx) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : idx < ['credentials', 'connect', 'import', 'complete'].indexOf(currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                }`}>
                  {idx < ['credentials', 'connect', 'import', 'complete'].indexOf(currentStep) 
                    ? <CheckCircle2 className="w-5 h-5" /> 
                    : idx + 1}
                </div>
                {idx < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    idx < ['credentials', 'connect', 'import', 'complete'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {currentStep === 'credentials' && (
            <div className="space-y-4" data-testid="step-credentials">
              <p className="text-slate-300 text-sm">
                Enter your Protractor API credentials. You can find these in your Protractor account under Integration Settings.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="connectionId" className="text-slate-300">Connection ID</Label>
                <Input
                  id="connectionId"
                  data-testid="input-connection-id"
                  value={credentials.connectionId}
                  onChange={(e) => setCredentials(prev => ({ ...prev, connectionId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-slate-300">API Key</Label>
                <Input
                  id="apiKey"
                  data-testid="input-api-key"
                  type="password"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Your Protractor API Key"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/')}
                  className="border-slate-700 text-slate-300"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending || !credentials.connectionId || !credentials.apiKey}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-test-connection"
                >
                  {testConnectionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      Test Connection
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'connect' && connectionResult?.success && (
            <div className="space-y-4" data-testid="step-connect">
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium">Connected to Protractor</p>
                  <p className="text-green-300/70 text-sm">
                    Found {connectionResult.locations?.length || 0} location(s)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-medium">Import Date Range</h3>
                <p className="text-slate-400 text-sm">
                  Select the date range for historical repair orders. Customers and vehicles will be imported regardless of date.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-slate-300">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      data-testid="input-start-date"
                      value={importOptions.startDate}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, startDate: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-slate-300">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      data-testid="input-end-date"
                      value={importOptions.endDate}
                      onChange={(e) => setImportOptions(prev => ({ ...prev, endDate: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                <h4 className="text-white font-medium">What will be imported:</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="w-4 h-4 text-blue-400" />
                    All Customers
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Car className="w-4 h-4 text-green-400" />
                    All Vehicles
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Repair Orders
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('credentials')}
                  className="border-slate-700 text-slate-300"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleStartImport}
                  disabled={startImportMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-start-import"
                >
                  {startImportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      Start Import
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'import' && (
            <div className="space-y-6" data-testid="step-import">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-white text-lg font-medium">Importing Your Data</h3>
                <p className="text-slate-400 text-sm">
                  {progress?.currentPhase || 'Preparing import...'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Progress</span>
                  <span className="text-white">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{progress?.processedRecords || 0} processed</span>
                  <span>{progress?.totalRecords || 0} total</span>
                </div>
              </div>

              {progress?.failedRecords && progress.failedRecords > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-300 text-sm">
                    {progress.failedRecords} record(s) had issues
                  </span>
                </div>
              )}

              <p className="text-center text-slate-500 text-sm">
                Please keep this page open. Large imports may take several minutes.
              </p>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="space-y-6" data-testid="step-complete">
              {pollingError ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white text-xl font-medium">Import Failed</h3>
                    <p className="text-slate-400">{pollingError}</p>
                  </div>
                  <Button 
                    onClick={() => {
                      setPollingError(null);
                      setNotFoundCount(0);
                      setJobId(null);
                      setCurrentStep('connect');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="button-try-again"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </>
              ) : progress?.status === 'COMPLETED' ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white text-xl font-medium">Import Complete!</h3>
                    <p className="text-slate-400">
                      Your Protractor data has been successfully imported.
                    </p>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">{progress.processedRecords}</p>
                      <p className="text-slate-400 text-sm">Records Imported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-400">
                        {progress.processedRecords - (progress.failedRecords || 0)}
                      </p>
                      <p className="text-slate-400 text-sm">Successful</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{progress.failedRecords || 0}</p>
                      <p className="text-slate-400 text-sm">With Issues</p>
                    </div>
                  </div>

                  {progress.errorLog && progress.errorLog.length > 0 && (
                    <div className="bg-slate-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                      <h4 className="text-white font-medium mb-2">Import Errors</h4>
                      <div className="space-y-1 text-sm">
                        {progress.errorLog.slice(0, 10).map((err, idx) => (
                          <p key={idx} className="text-slate-400">
                            <span className="text-red-400">{err.record}:</span> {err.error}
                          </p>
                        ))}
                        {progress.errorLog.length > 10 && (
                          <p className="text-slate-500">
                            ... and {progress.errorLog.length - 10} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-white text-xl font-medium">Import Failed</h3>
                    <p className="text-slate-400">
                      There was an error during the import process.
                    </p>
                  </div>

                  {progress?.errorLog && progress.errorLog.length > 0 && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
                      <p className="text-red-300">{progress.errorLog[0]?.error}</p>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setJobId(null);
                      setCurrentStep('credentials');
                    }}
                    className="w-full bg-slate-700 hover:bg-slate-600"
                    data-testid="button-try-again"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </>
              )}

              <Button
                onClick={() => setLocation('/')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-go-dashboard"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
