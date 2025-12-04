import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Camera,
  Save,
  Share2,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InspectionTemplateItem {
  id: string;
  label: string;
  category: string;
  sortOrder: number;
}

interface InspectionResultItem {
  itemId: string;
  status: 'GREEN' | 'YELLOW' | 'RED' | null;
  finding?: string;
  recommendation?: string;
  photos?: string[];
}

interface Vehicle {
  year: number;
  make: string;
  model: string;
  mileage?: number | null;
}

interface InspectionFormProps {
  inspectionId: string;
  templateItems: InspectionTemplateItem[];
  initialItems: InspectionResultItem[];
  vehicle: Vehicle;
  onSave: (items: InspectionResultItem[]) => void;
  onComplete: () => void;
  isCompleted?: boolean;
  shareToken?: string | null;
  onShare?: () => void;
}

const STATUS_CONFIG = {
  GREEN: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/30',
    activeBg: 'bg-green-500 text-white',
    label: 'Good',
  },
  YELLOW: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30',
    activeBg: 'bg-yellow-500 text-white',
    label: 'Needs Attention',
  },
  RED: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30',
    activeBg: 'bg-red-500 text-white',
    label: 'Urgent',
  },
};

export function InspectionForm({
  inspectionId,
  templateItems,
  initialItems,
  vehicle,
  onSave,
  onComplete,
  isCompleted = false,
  shareToken,
  onShare,
}: InspectionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [items, setItems] = useState<InspectionResultItem[]>(initialItems);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const allCategories = new Set(templateItems.map(t => t.category));
    setExpandedCategories(allCategories);
  }, [templateItems]);

  const getItemResult = (itemId: string): InspectionResultItem => {
    return items.find(i => i.itemId === itemId) || { itemId, status: null };
  };

  const updateItem = (itemId: string, updates: Partial<InspectionResultItem>) => {
    setItems(prev => {
      const existing = prev.find(i => i.itemId === itemId);
      if (existing) {
        return prev.map(i => i.itemId === itemId ? { ...i, ...updates } : i);
      }
      return [...prev, { itemId, status: null, ...updates }];
    });
    setHasChanges(true);
  };

  const handleStatusChange = (itemId: string, status: 'GREEN' | 'YELLOW' | 'RED') => {
    const current = getItemResult(itemId);
    if (current.status === status) {
      updateItem(itemId, { status: null });
    } else {
      updateItem(itemId, { status });
    }
  };

  const handleAIAssist = async (templateItem: InspectionTemplateItem) => {
    const result = getItemResult(templateItem.id);
    if (!result.status) {
      toast({ title: 'Select a status first', description: 'Choose green, yellow, or red before using AI assist', variant: 'destructive' });
      return;
    }

    setLoadingAI(templateItem.id);
    try {
      const res = await fetch('/api/inspections/ai/finding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemLabel: templateItem.label,
          category: templateItem.category,
          status: result.status,
          techNotes: result.finding,
          vehicle,
        }),
      });

      if (!res.ok) throw new Error('AI request failed');
      
      const aiResult = await res.json();
      updateItem(templateItem.id, {
        finding: aiResult.finding || result.finding,
        recommendation: aiResult.recommendation || result.recommendation,
      });
      
      toast({ title: 'AI draft generated', description: 'Review and edit the generated text as needed' });
    } catch (error) {
      toast({ title: 'AI Error', description: 'Failed to generate AI draft', variant: 'destructive' });
    } finally {
      setLoadingAI(null);
    }
  };

  const handleSave = () => {
    onSave(items);
    setHasChanges(false);
    toast({ title: 'Inspection saved' });
  };

  const validateForCompletion = (): string[] => {
    const errors: string[] = [];
    
    for (const templateItem of templateItems) {
      const result = getItemResult(templateItem.id);
      
      if (!result.status) {
        errors.push(`${templateItem.label}: Status required`);
      } else if ((result.status === 'YELLOW' || result.status === 'RED') && !result.recommendation?.trim()) {
        errors.push(`${templateItem.label}: Recommendation required for ${result.status.toLowerCase()} items`);
      }
    }
    
    return errors;
  };

  const handleComplete = () => {
    const errors = validateForCompletion();
    if (errors.length > 0) {
      toast({ 
        title: 'Cannot complete inspection', 
        description: errors.slice(0, 3).join('\n') + (errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''),
        variant: 'destructive' 
      });
      return;
    }
    
    onSave(items);
    onComplete();
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const categories = [...new Set(templateItems.map(t => t.category))];
  
  const getCategoryStats = (category: string) => {
    const categoryItems = templateItems.filter(t => t.category === category);
    const results = categoryItems.map(t => getItemResult(t.id));
    return {
      total: categoryItems.length,
      green: results.filter(r => r.status === 'GREEN').length,
      yellow: results.filter(r => r.status === 'YELLOW').length,
      red: results.filter(r => r.status === 'RED').length,
      pending: results.filter(r => !r.status).length,
    };
  };

  const totalStats = {
    total: templateItems.length,
    green: items.filter(i => i.status === 'GREEN').length,
    yellow: items.filter(i => i.status === 'YELLOW').length,
    red: items.filter(i => i.status === 'RED').length,
    pending: templateItems.length - items.filter(i => i.status).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {totalStats.green}
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {totalStats.yellow}
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
              <XCircle className="w-3 h-3 mr-1" />
              {totalStats.red}
            </Badge>
            <Badge variant="secondary">
              {totalStats.pending} pending
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleSave} data-testid="button-save-inspection">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          )}
          {isCompleted && onShare && (
            <Button 
              variant="outline" 
              onClick={onShare}
              className="gap-2"
              data-testid="button-share-inspection"
            >
              <Share2 className="w-4 h-4" />
              {shareToken ? 'View Share Link' : 'Share with Customer'}
            </Button>
          )}
          {!isCompleted && (
            <Button 
              onClick={handleComplete}
              disabled={totalStats.pending > 0}
              data-testid="button-complete-inspection"
            >
              Complete Inspection
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {categories.map((category) => {
            const stats = getCategoryStats(category);
            const isExpanded = expandedCategories.has(category);
            
            return (
              <Collapsible 
                key={category} 
                open={isExpanded} 
                onOpenChange={() => toggleCategory(category)}
              >
                <Card className="bg-slate-800/50 border-slate-700">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-700/30 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <CardTitle className="text-base font-medium">{category}</CardTitle>
                          <span className="text-sm text-slate-400">({stats.total} items)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {stats.green > 0 && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                              {stats.green}
                            </Badge>
                          )}
                          {stats.yellow > 0 && (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs">
                              {stats.yellow}
                            </Badge>
                          )}
                          {stats.red > 0 && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-xs">
                              {stats.red}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {templateItems
                        .filter(t => t.category === category)
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((templateItem) => {
                          const result = getItemResult(templateItem.id);
                          const isLoadingAI = loadingAI === templateItem.id;
                          const requiresRecommendation = result.status === 'YELLOW' || result.status === 'RED';
                          const missingRecommendation = requiresRecommendation && !result.recommendation?.trim();
                          
                          return (
                            <div 
                              key={templateItem.id} 
                              className={cn(
                                "p-4 rounded-lg border transition-colors",
                                result.status === 'GREEN' && "bg-green-500/5 border-green-500/20",
                                result.status === 'YELLOW' && "bg-yellow-500/5 border-yellow-500/20",
                                result.status === 'RED' && "bg-red-500/5 border-red-500/20",
                                !result.status && "bg-slate-700/30 border-slate-600"
                              )}
                              data-testid={`inspection-item-${templateItem.id}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="font-medium text-white">{templateItem.label}</div>
                                <div className="flex items-center gap-1">
                                  {(['GREEN', 'YELLOW', 'RED'] as const).map((status) => {
                                    const config = STATUS_CONFIG[status];
                                    const Icon = config.icon;
                                    const isActive = result.status === status;
                                    
                                    return (
                                      <button
                                        key={status}
                                        onClick={() => handleStatusChange(templateItem.id, status)}
                                        disabled={isCompleted}
                                        className={cn(
                                          "p-2 rounded-lg border transition-all",
                                          isActive ? config.activeBg : config.bg,
                                          isCompleted && "opacity-50 cursor-not-allowed"
                                        )}
                                        title={config.label}
                                        data-testid={`button-status-${status.toLowerCase()}-${templateItem.id}`}
                                      >
                                        <Icon className={cn("w-5 h-5", !isActive && config.color)} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {result.status && (
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-sm text-slate-400">Finding</label>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleAIAssist(templateItem)}
                                        disabled={isLoadingAI || isCompleted}
                                        className="h-7 text-xs bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 text-purple-400"
                                        data-testid={`button-ai-assist-${templateItem.id}`}
                                      >
                                        {isLoadingAI ? (
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-3 h-3 mr-1" />
                                        )}
                                        AI Assist
                                      </Button>
                                    </div>
                                    <Textarea
                                      value={result.finding || ''}
                                      onChange={(e) => updateItem(templateItem.id, { finding: e.target.value })}
                                      placeholder="Describe what you observed..."
                                      className="min-h-[60px] bg-slate-800/50 border-slate-600"
                                      disabled={isCompleted}
                                      data-testid={`textarea-finding-${templateItem.id}`}
                                    />
                                  </div>
                                  
                                  {requiresRecommendation && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <label className="text-sm text-slate-400">Recommendation</label>
                                        <Badge variant="destructive" className="text-xs">Required</Badge>
                                      </div>
                                      <Textarea
                                        value={result.recommendation || ''}
                                        onChange={(e) => updateItem(templateItem.id, { recommendation: e.target.value })}
                                        placeholder="What action should the customer take?"
                                        className={cn(
                                          "min-h-[60px] bg-slate-800/50",
                                          missingRecommendation ? "border-red-500" : "border-slate-600"
                                        )}
                                        disabled={isCompleted}
                                        data-testid={`textarea-recommendation-${templateItem.id}`}
                                      />
                                      {missingRecommendation && (
                                        <p className="text-xs text-red-400 mt-1">
                                          Recommendation is required for {result.status.toLowerCase()} items
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {result.status === 'GREEN' && (
                                    <div className="text-xs text-slate-500 italic">
                                      Recommendation not required for items in good condition
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
