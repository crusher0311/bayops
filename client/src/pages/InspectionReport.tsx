import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Car,
  Gauge,
  ClipboardCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface InspectionItem {
  itemId: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  finding?: string;
  recommendation?: string;
  photos?: string[];
}

interface TemplateItem {
  id: string;
  label: string;
  category: string;
  sortOrder: number;
}

interface Inspection {
  id: string;
  status: string;
  items: InspectionItem[];
  createdAt: string;
  completedAt?: string;
  repairOrder?: {
    roNumber: string;
    odometerIn?: number;
    vehicle?: {
      year: number;
      make: string;
      model: string;
      vin?: string;
    };
  };
  template?: {
    name: string;
    items: TemplateItem[];
  };
}

const STATUS_CONFIG = {
  GREEN: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    label: 'Good Condition',
    description: 'No issues found',
  },
  YELLOW: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    label: 'Needs Attention',
    description: 'Should be addressed soon',
  },
  RED: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    label: 'Immediate Attention',
    description: 'Requires urgent repair',
  },
};

export default function InspectionReport() {
  const [, params] = useRoute('/inspection/:token');
  const token = params?.token || '';

  const { data: inspection, isLoading, error } = useQuery<Inspection>({
    queryKey: ['inspection-shared', token],
    queryFn: async () => {
      const res = await fetch(`/api/inspections/shared/${token}`);
      if (!res.ok) {
        throw new Error('Inspection not found');
      }
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900">Inspection Not Found</h2>
            <p className="text-slate-500 mt-2">
              This inspection report may have expired or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vehicle = inspection.repairOrder?.vehicle;
  const templateItems = inspection.template?.items || [];
  const inspectionItems = inspection.items || [];

  const getTemplateItem = (itemId: string) => 
    templateItems.find(t => t.id === itemId);

  const getItemResult = (itemId: string) => 
    inspectionItems.find(i => i.itemId === itemId);

  const categories = Array.from(new Set(templateItems.map(t => t.category)));

  const stats = {
    green: inspectionItems.filter(i => i.status === 'GREEN').length,
    yellow: inspectionItems.filter(i => i.status === 'YELLOW').length,
    red: inspectionItems.filter(i => i.status === 'RED').length,
    total: templateItems.length,
  };

  const priorityItems = inspectionItems
    .filter(i => i.status === 'RED' || i.status === 'YELLOW')
    .map(i => ({
      ...i,
      template: getTemplateItem(i.itemId),
    }))
    .sort((a, b) => {
      if (a.status === 'RED' && b.status !== 'RED') return -1;
      if (a.status !== 'RED' && b.status === 'RED') return 1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardCheck className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Vehicle Inspection Report</h1>
          </div>
          
          {vehicle && (
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-400" />
                <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
              </div>
              {inspection.repairOrder?.odometerIn && (
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-slate-400" />
                  <span>{inspection.repairOrder.odometerIn.toLocaleString()} miles</span>
                </div>
              )}
              {inspection.completedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Inspected {format(new Date(inspection.completedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-700">{stats.green}</div>
              <div className="text-sm text-green-600">Good Condition</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-700">{stats.yellow}</div>
              <div className="text-sm text-yellow-600">Needs Attention</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-700">{stats.red}</div>
              <div className="text-sm text-red-600">Immediate Attention</div>
            </CardContent>
          </Card>
        </div>

        {priorityItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Items Needing Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {priorityItems.map((item) => {
                if (!item.template) return null;
                const config = STATUS_CONFIG[item.status];
                const Icon = config.icon;
                
                return (
                  <div 
                    key={item.itemId} 
                    className={cn(
                      "p-4 rounded-lg border",
                      config.bg
                    )}
                    data-testid={`priority-item-${item.itemId}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900">{item.template.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.template.category}
                          </Badge>
                        </div>
                        
                        {item.finding && (
                          <p className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">What we found:</span> {item.finding}
                          </p>
                        )}
                        
                        {item.recommendation && (
                          <div className={cn(
                            "p-3 rounded-md mt-2 text-sm",
                            item.status === 'RED' 
                              ? "bg-red-100 text-red-800" 
                              : "bg-yellow-100 text-yellow-800"
                          )}>
                            <span className="font-medium">Recommendation:</span> {item.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complete Inspection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  {category}
                  <span className="text-sm font-normal text-slate-500">
                    ({templateItems.filter(t => t.category === category).length} items)
                  </span>
                </h3>
                <div className="space-y-2">
                  {templateItems
                    .filter(t => t.category === category)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((templateItem) => {
                      const result = getItemResult(templateItem.id);
                      const status = result?.status || 'GREEN';
                      const config = STATUS_CONFIG[status];
                      const Icon = config.icon;
                      
                      return (
                        <div 
                          key={templateItem.id} 
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border",
                            result?.status ? config.bg : "bg-slate-50 border-slate-200"
                          )}
                          data-testid={`inspection-item-${templateItem.id}`}
                        >
                          <Icon className={cn("w-5 h-5 shrink-0", config.color)} />
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{templateItem.label}</div>
                            {result?.finding && (
                              <div className="text-sm text-slate-600 mt-1">{result.finding}</div>
                            )}
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              status === 'GREEN' && "bg-green-100 text-green-700 border-green-300",
                              status === 'YELLOW' && "bg-yellow-100 text-yellow-700 border-yellow-300",
                              status === 'RED' && "bg-red-100 text-red-700 border-red-300",
                            )}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
                <Separator className="mt-6" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-slate-500 pb-8">
          <p>This inspection report was generated by BayOPS</p>
          <p className="mt-1">Questions? Contact your service advisor</p>
        </div>
      </div>
    </div>
  );
}
