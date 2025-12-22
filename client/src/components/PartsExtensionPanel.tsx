import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  isExtensionInstalled,
  openPartsTech,
  getPartsSession,
  subscribeToSessionUpdates,
  markSessionOrdered,
  clearPartsSession,
  type PartsSession,
  type PartItem,
} from '@/lib/partstechExtension';
import {
  ExternalLink,
  Package,
  Trash2,
  ShoppingCart,
  Chrome,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PartsExtensionPanelProps {
  jobId: string;
  repairOrderId: string;
  roNumber: string;
  vehicleInfo: string;
  onPartsReceived?: (parts: PartItem[]) => void;
}

export function PartsExtensionPanel({
  jobId,
  repairOrderId,
  roNumber,
  vehicleInfo,
  onPartsReceived,
}: PartsExtensionPanelProps) {
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [session, setSession] = useState<PartsSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkExtension = () => {
      const installed = isExtensionInstalled();
      setExtensionInstalled(installed);
      
      if (installed) {
        loadSession();
        subscribeToSessionUpdates((updatedJobId, updatedSession) => {
          if (updatedJobId === jobId) {
            setSession(updatedSession);
            if (onPartsReceived && updatedSession.items.length > 0) {
              onPartsReceived(updatedSession.items);
            }
          }
        });
      }
    };

    window.addEventListener('bayops-extension-ready', checkExtension);
    checkExtension();

    return () => {
      window.removeEventListener('bayops-extension-ready', checkExtension);
    };
  }, [jobId]);

  const loadSession = async () => {
    const existingSession = await getPartsSession(jobId);
    if (existingSession) {
      setSession(existingSession);
    }
  };

  const handleOpenPartsTech = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const result = await openPartsTech(jobId, repairOrderId, roNumber, vehicleInfo, searchQuery);
      if (result.success) {
        toast({
          title: result.reused ? 'PartsTech tab focused' : 'PartsTech opened',
          description: 'Add parts to your cart and they will sync automatically.',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to open PartsTech',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkOrdered = async () => {
    const success = await markSessionOrdered(jobId);
    if (success) {
      toast({
        title: 'Parts ordered',
        description: 'Session marked as ordered.',
      });
      loadSession();
    }
  };

  const handleClearSession = async () => {
    const success = await clearPartsSession(jobId);
    if (success) {
      setSession(null);
      toast({
        title: 'Session cleared',
        description: 'Parts session has been cleared.',
      });
    }
  };

  if (!extensionInstalled) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Chrome className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="font-medium text-slate-700">PartsTech Extension Not Detected</p>
              <p className="text-sm text-slate-500 mt-1">
                Install the BayOPS Parts Connector extension to enable seamless PartsTech integration.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/chrome-extension" target="_blank">
                <Package className="w-4 h-4 mr-2" />
                Get Extension
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            PartsTech Cart
          </CardTitle>
          {session && session.status === 'ordered' && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ordered
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => handleOpenPartsTech()}
            disabled={loading}
            className="flex-1"
            data-testid="button-open-partstech"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4 mr-2" />
            )}
            Search Parts
          </Button>
          {session && session.items.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleClearSession}
              data-testid="button-clear-session"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {session && session.items.length > 0 && (
          <>
            <div className="border rounded-lg divide-y">
              {session.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {item.partNumber}
                      </span>
                      {item.brand && (
                        <Badge variant="outline" className="text-xs">
                          {item.brand}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 truncate">
                      {item.description || 'No description'}
                    </p>
                    {item.supplier && (
                      <p className="text-xs text-slate-400">{item.supplier}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">
                      ${(item.price || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Qty: {item.quantity || 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-sm text-slate-500">
                  {session.items.length} parts
                </span>
                <span className="text-sm font-medium ml-2">
                  Total: ${session.items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0).toFixed(2)}
                </span>
              </div>
              {session.status !== 'ordered' && (
                <Button
                  size="sm"
                  onClick={handleMarkOrdered}
                  data-testid="button-mark-ordered"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Ordered
                </Button>
              )}
            </div>
          </>
        )}

        {session && session.items.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-sm">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No parts in cart yet.</p>
            <p className="text-xs">Click "Search Parts" to open PartsTech.</p>
          </div>
        )}

        {!session && (
          <div className="text-center py-4 text-slate-500 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Click "Search Parts" to start shopping.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
