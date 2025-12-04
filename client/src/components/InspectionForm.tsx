import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Loader2,
  Sparkles,
  Camera,
  Save,
  Share2,
  X,
  Trash2,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Copy,
  Link as LinkIcon,
  Wrench
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
  finding?: string | null;
  recommendation?: string | null;
  photos?: string[];
}

interface Vehicle {
  year: number;
  make: string;
  model: string;
  mileage?: number | null;
}

interface CustomerInfo {
  firstName?: string;
  email?: string;
  phone?: string;
}

interface InspectionFormProps {
  inspectionId: string;
  templateItems: InspectionTemplateItem[];
  initialItems: InspectionResultItem[];
  vehicle: Vehicle;
  customer?: CustomerInfo;
  onSave: (items: InspectionResultItem[]) => void;
  onComplete: () => void;
  onDelete?: () => void;
  isCompleted?: boolean;
  shareToken?: string | null;
  onShare?: () => void;
  onGenerateJobs?: () => void;
  isGeneratingJobs?: boolean;
}

const STATUS_CONFIG = {
  GREEN: {
    icon: CheckCircle2,
    label: 'Good',
    buttonClass: 'bg-green-600 hover:bg-green-700 text-white border-green-700',
    inactiveClass: 'bg-slate-700/50 hover:bg-green-600/30 text-green-400 border-green-600/50',
    borderClass: 'border-l-green-500',
  },
  YELLOW: {
    icon: AlertTriangle,
    label: 'Attention',
    buttonClass: 'bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-600',
    inactiveClass: 'bg-slate-700/50 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/50',
    borderClass: 'border-l-yellow-500',
  },
  RED: {
    icon: XCircle,
    label: 'Urgent',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white border-red-700',
    inactiveClass: 'bg-slate-700/50 hover:bg-red-600/30 text-red-400 border-red-600/50',
    borderClass: 'border-l-red-500',
  },
};

function getAICache(inspectionId: string): Record<string, { finding: string; recommendation: string }> {
  try {
    const cacheKey = `bayops_ai_cache_${inspectionId}`;
    const cached = sessionStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setAICache(inspectionId: string, key: string, value: { finding: string; recommendation: string }) {
  try {
    const cacheKey = `bayops_ai_cache_${inspectionId}`;
    const cache = getAICache(inspectionId);
    cache[key] = value;
    sessionStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

function generateCacheKey(item: { label: string; category: string }, status: string): string {
  return `${item.label}|${item.category}|${status}`;
}

export function InspectionForm({
  inspectionId,
  templateItems,
  initialItems,
  vehicle,
  customer,
  onSave,
  onComplete,
  onDelete,
  isCompleted = false,
  shareToken,
  onShare,
  onGenerateJobs,
  isGeneratingJobs = false,
}: InspectionFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoItemId, setActivePhotoItemId] = useState<string | null>(null);
  
  const [items, setItems] = useState<InspectionResultItem[]>(initialItems);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState(customer?.email || '');
  const [sharePhone, setSharePhone] = useState(customer?.phone || '');
  
  const { data: messagingStatus } = useQuery({
    queryKey: ['messaging-status'],
    queryFn: async () => {
      const res = await fetch('/api/messaging/status', { credentials: 'include' });
      if (!res.ok) return { sms: false, email: false };
      return res.json() as Promise<{ sms: boolean; email: boolean }>;
    },
  });
  
  const sendSmsMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await fetch(`/api/inspections/${inspectionId}/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to send SMS');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'SMS sent successfully!' });
      setIsShareDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send SMS', description: error.message, variant: 'destructive' });
    },
  });
  
  const sendEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/inspections/${inspectionId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to send email');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Email sent successfully!' });
      setIsShareDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to send email', description: error.message, variant: 'destructive' });
    },
  });

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

    const cacheKey = generateCacheKey(templateItem, result.status);
    const cached = getAICache(inspectionId)[cacheKey];
    
    if (cached) {
      updateItem(templateItem.id, {
        finding: cached.finding,
        recommendation: cached.recommendation,
      });
      toast({ title: 'AI draft loaded', description: 'Using cached response' });
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
      
      setAICache(inspectionId, cacheKey, {
        finding: aiResult.finding || '',
        recommendation: aiResult.recommendation || '',
      });
      
      updateItem(templateItem.id, {
        finding: aiResult.finding || result.finding,
        recommendation: aiResult.recommendation || result.recommendation,
      });
      
      toast({ title: 'AI draft generated', description: 'Review and edit as needed' });
    } catch (error) {
      toast({ title: 'AI Error', description: 'Failed to generate AI draft', variant: 'destructive' });
    } finally {
      setLoadingAI(null);
    }
  };

  const handlePhotoUpload = async (itemId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const currentItem = getItemResult(itemId);
      const currentPhotos = currentItem.photos || [];
      updateItem(itemId, { photos: [...currentPhotos, base64] });
      toast({ title: 'Photo added' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (itemId: string, photoIndex: number) => {
    const currentItem = getItemResult(itemId);
    const currentPhotos = currentItem.photos || [];
    const newPhotos = currentPhotos.filter((_, i) => i !== photoIndex);
    updateItem(itemId, { photos: newPhotos });
  };

  const triggerPhotoUpload = (itemId: string) => {
    setActivePhotoItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activePhotoItemId) {
      handlePhotoUpload(activePhotoItemId, file);
    }
    e.target.value = '';
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
        errors.push(`${templateItem.label}: Recommendation required`);
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

  const categories = Array.from(new Set(templateItems.map(t => t.category)));
  
  const totalStats = {
    total: templateItems.length,
    green: items.filter(i => i.status === 'GREEN').length,
    yellow: items.filter(i => i.status === 'YELLOW').length,
    red: items.filter(i => i.status === 'RED').length,
    pending: templateItems.length - items.filter(i => i.status).length,
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileChange}
      />
      
      <div className="flex items-center justify-between bg-slate-800/60 rounded-lg p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{totalStats.green}</div>
              <div className="text-xs text-slate-400">Good</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">{totalStats.yellow}</div>
              <div className="text-xs text-slate-400">Attention</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{totalStats.red}</div>
              <div className="text-xs text-slate-400">Urgent</div>
            </div>
          </div>
          <Separator orientation="vertical" className="h-10 bg-slate-600" />
          <div className="text-slate-400">
            <span className="text-lg font-semibold text-white">{totalStats.pending}</span> remaining
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onDelete && (
            <Button 
              variant="outline" 
              onClick={onDelete}
              size="lg"
              className="text-red-400 border-red-500/50 hover:bg-red-600/20 hover:text-red-300"
              data-testid="button-delete-inspection"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          {hasChanges && (
            <Button variant="outline" onClick={handleSave} size="lg" data-testid="button-save-inspection">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
          {isCompleted && (
            <Button 
              variant="outline" 
              onClick={() => setIsShareDialogOpen(true)}
              size="lg"
              data-testid="button-share-inspection"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Send to Customer
            </Button>
          )}
          {isCompleted && onGenerateJobs && (totalStats.yellow > 0 || totalStats.red > 0) && (
            <Button 
              onClick={onGenerateJobs}
              disabled={isGeneratingJobs}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              data-testid="button-generate-jobs-from-dvi"
            >
              {isGeneratingJobs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Work Order...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Work Order from Findings
                </>
              )}
            </Button>
          )}
          {!isCompleted && (
            <Button 
              onClick={handleComplete}
              disabled={totalStats.pending > 0}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-complete-inspection"
            >
              Complete Inspection
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="space-y-10 pr-4">
          {categories.map((category) => (
            <div key={category}>
              <div className="bg-blue-600 rounded-lg px-4 py-3 mb-5">
                <h3 className="text-2xl font-bold text-white">
                  {category}
                </h3>
              </div>
              
              <div className="space-y-5">
                {templateItems
                  .filter(t => t.category === category)
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((templateItem) => {
                    const result = getItemResult(templateItem.id);
                    const isLoadingAI = loadingAI === templateItem.id;
                    const requiresRecommendation = result.status === 'YELLOW' || result.status === 'RED';
                    const missingRecommendation = requiresRecommendation && !result.recommendation?.trim();
                    const statusConfig = result.status ? STATUS_CONFIG[result.status] : null;
                    
                    return (
                      <Card 
                        key={templateItem.id} 
                        className={cn(
                          "transition-all duration-200 border-l-4 bg-slate-800 border border-slate-600",
                          statusConfig ? statusConfig.borderClass : "border-l-slate-500"
                        )}
                        data-testid={`inspection-item-${templateItem.id}`}
                      >
                        <CardContent className="p-6 bg-slate-800">
                          <div className="flex items-start justify-between gap-6">
                            <h4 className="text-xl font-semibold text-white flex-1 leading-tight">
                              {templateItem.label}
                            </h4>
                            
                            <div className="flex items-center gap-3">
                              {!result.status && (
                                <span className="text-sm text-slate-400 mr-2">Not checked</span>
                              )}
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
                                      "flex items-center gap-2 px-5 py-3 rounded-lg border-2 font-semibold transition-all text-base",
                                      isActive ? config.buttonClass : config.inactiveClass,
                                      isCompleted && "opacity-50 cursor-not-allowed"
                                    )}
                                    data-testid={`button-status-${status.toLowerCase()}-${templateItem.id}`}
                                  >
                                    <Icon className="w-5 h-5" />
                                    <span>{config.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          
                          {result.status && (
                            <div className="mt-6 space-y-5">
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <label className="text-base font-semibold text-white">
                                    Technician Notes
                                  </label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAIAssist(templateItem)}
                                    disabled={isLoadingAI || isCompleted}
                                    className="h-8 px-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 border border-purple-500/30"
                                    data-testid={`button-ai-assist-${templateItem.id}`}
                                  >
                                    {isLoadingAI ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    AI Assist
                                  </Button>
                                </div>
                                <Textarea
                                  value={result.finding || ''}
                                  onChange={(e) => updateItem(templateItem.id, { finding: e.target.value })}
                                  placeholder="Describe what you observed..."
                                  className="min-h-[80px] text-base text-white bg-slate-700 border-slate-500 placeholder:text-slate-400"
                                  disabled={isCompleted}
                                  data-testid={`textarea-finding-${templateItem.id}`}
                                />
                              </div>
                              
                              {requiresRecommendation && (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <label className="text-base font-semibold text-white">
                                      Recommendation for Customer
                                    </label>
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  </div>
                                  <Textarea
                                    value={result.recommendation || ''}
                                    onChange={(e) => updateItem(templateItem.id, { recommendation: e.target.value })}
                                    placeholder="What action should the customer take?"
                                    className={cn(
                                      "min-h-[80px] text-base text-white bg-slate-700 placeholder:text-slate-400",
                                      missingRecommendation ? "border-red-500 focus:border-red-500" : "border-slate-500"
                                    )}
                                    disabled={isCompleted}
                                    data-testid={`textarea-recommendation-${templateItem.id}`}
                                  />
                                  {missingRecommendation && (
                                    <p className="text-sm text-red-400 mt-2">
                                      Required for {result.status === 'YELLOW' ? 'attention' : 'urgent'} items
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {result.status === 'GREEN' && (
                                <p className="text-sm text-slate-500 italic">
                                  Recommendation optional for items in good condition
                                </p>
                              )}
                              
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <label className="text-base font-semibold text-white">
                                    Photos
                                  </label>
                                  {!isCompleted && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => triggerPhotoUpload(templateItem.id)}
                                      className="h-8 gap-2"
                                      data-testid={`button-add-photo-${templateItem.id}`}
                                    >
                                      <Camera className="w-4 h-4" />
                                      Add
                                    </Button>
                                  )}
                                </div>
                                
                                {result.photos && result.photos.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {result.photos.map((media, index) => {
                                      const isVideo = media.startsWith('data:video');
                                      return (
                                        <div key={index} className="relative group">
                                          {isVideo ? (
                                            <video 
                                              src={media}
                                              className="w-24 h-24 object-cover rounded-lg border border-slate-600"
                                              muted
                                              playsInline
                                              onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                              onMouseLeave={(e) => {
                                                const video = e.target as HTMLVideoElement;
                                                video.pause();
                                                video.currentTime = 0;
                                              }}
                                            />
                                          ) : (
                                            <img 
                                              src={media} 
                                              alt={`Photo ${index + 1}`}
                                              className="w-24 h-24 object-cover rounded-lg border border-slate-600"
                                            />
                                          )}
                                          {!isCompleted && (
                                            <button
                                              onClick={() => handleRemovePhoto(templateItem.id, index)}
                                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <X className="w-4 h-4 text-white" />
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <ImageIcon className="w-4 h-4" />
                                    No media attached
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Inspection Report</DialogTitle>
            <DialogDescription>
              Send the inspection report to your customer via text or email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {shareToken && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Share Link</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}/inspection/${shareToken}`}
                    className="flex-1 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/inspection/${shareToken}`);
                      toast({ title: 'Link copied to clipboard!' });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <Separator />
            
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Send via Text Message
                {!messagingStatus?.sms && (
                  <Badge variant="secondary" className="text-xs">Not configured</Badge>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={sharePhone}
                  onChange={(e) => setSharePhone(e.target.value)}
                  disabled={!messagingStatus?.sms}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendSmsMutation.mutate(sharePhone)}
                  disabled={!sharePhone || !messagingStatus?.sms || sendSmsMutation.isPending}
                >
                  {sendSmsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send SMS'
                  )}
                </Button>
              </div>
              {!messagingStatus?.sms && (
                <p className="text-xs text-muted-foreground">
                  Configure Twilio in settings to enable SMS.
                </p>
              )}
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send via Email
                {!messagingStatus?.email && (
                  <Badge variant="secondary" className="text-xs">Not configured</Badge>
                )}
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="email"
                  placeholder="customer@email.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  disabled={!messagingStatus?.email}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendEmailMutation.mutate(shareEmail)}
                  disabled={!shareEmail || !messagingStatus?.email || sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send Email'
                  )}
                </Button>
              </div>
              {!messagingStatus?.email && (
                <p className="text-xs text-muted-foreground">
                  Configure Resend in settings to enable email.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
