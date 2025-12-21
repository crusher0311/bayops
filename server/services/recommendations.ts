import { getServiceHistoryCached, matchServiceToOemMaintenance } from "./carfax";
import { getMaintenanceScheduleCached, triageMaintenanceItems } from "./dataone";
import { storage } from "../storage";

export type RecommendationPriority = 'URGENT' | 'SOON' | 'UPCOMING' | 'COMPLETED';
export type RecommendationSource = 'OEM' | 'DVI' | 'CARFAX';

export interface ServiceRecommendation {
  id: string;
  serviceName: string;
  priority: RecommendationPriority;
  priorityScore: number;
  sources: RecommendationSource[];
  rationale: {
    oemDueStatus?: 'DUE_NOW' | 'DUE_SOON' | 'UPCOMING' | 'OK' | null;
    oemDueMileage?: number | null;
    oemInterval?: { miles?: number; months?: number } | null;
    carfaxLastService?: { date: string; odometer: number | null } | null;
    milesSinceLastService?: number | null;
    dviFinding?: { status: 'GREEN' | 'YELLOW' | 'RED'; notes?: string } | null;
  };
  suggestedAction: string;
  suppressedReason?: string;
}

export interface RecommendationsResult {
  ok: boolean;
  vehicleId: string;
  currentMileage: number;
  recommendations: ServiceRecommendation[];
  recentlyCompleted: ServiceRecommendation[];
  dataAvailability: {
    oem: boolean;
    carfax: boolean;
    dvi: boolean;
  };
  error?: string;
}

const SERVICE_INTERVALS: Record<string, { miles: number; months: number }> = {
  'oil': { miles: 5000, months: 6 },
  'oil change': { miles: 5000, months: 6 },
  'engine oil': { miles: 5000, months: 6 },
  'tire rotation': { miles: 7500, months: 12 },
  'air filter': { miles: 15000, months: 24 },
  'cabin air filter': { miles: 15000, months: 24 },
  'brake fluid': { miles: 30000, months: 24 },
  'transmission fluid': { miles: 30000, months: 36 },
  'coolant': { miles: 30000, months: 36 },
  'antifreeze': { miles: 30000, months: 36 },
  'power steering': { miles: 50000, months: 48 },
  'spark plugs': { miles: 60000, months: 60 },
  'timing belt': { miles: 60000, months: 72 },
  'brake pads': { miles: 40000, months: 48 },
  'battery': { miles: 50000, months: 48 },
};

function normalizeServiceName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getServiceInterval(serviceName: string): { miles: number; months: number } | null {
  const normalized = normalizeServiceName(serviceName);
  
  for (const [key, interval] of Object.entries(SERVICE_INTERVALS)) {
    if (normalized.includes(key)) {
      return interval;
    }
  }
  
  return null;
}

function calculateMilesSince(lastOdometer: number | null, currentMileage: number): number | null {
  if (lastOdometer === null || lastOdometer === 0) return null;
  const diff = currentMileage - lastOdometer;
  // Return null for negative values (data anomaly - last service odometer higher than current)
  return diff < 0 ? null : diff;
}

function isServiceDue(
  serviceName: string,
  lastServiceOdometer: number | null,
  lastServiceDate: string | null,
  currentMileage: number
): { isDue: boolean; reason: string; dueLevel: 'OVERDUE' | 'DUE_SOON' | 'OK' } {
  const interval = getServiceInterval(serviceName);
  if (!interval) {
    return { isDue: false, reason: 'No interval data available', dueLevel: 'OK' };
  }
  
  const milesSince = calculateMilesSince(lastServiceOdometer, currentMileage);
  
  if (milesSince !== null) {
    if (milesSince >= interval.miles) {
      return { 
        isDue: true, 
        reason: `${milesSince.toLocaleString()} miles since last service (interval: ${interval.miles.toLocaleString()} mi)`,
        dueLevel: 'OVERDUE'
      };
    }
    if (milesSince >= interval.miles * 0.8) {
      return { 
        isDue: true, 
        reason: `Due soon: ${milesSince.toLocaleString()} miles since last service`,
        dueLevel: 'DUE_SOON'
      };
    }
  }
  
  if (lastServiceDate && lastServiceDate !== 'Not Reported') {
    try {
      const lastDate = new Date(lastServiceDate);
      const monthsSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince >= interval.months) {
        return { 
          isDue: true, 
          reason: `${Math.round(monthsSince)} months since last service`,
          dueLevel: 'OVERDUE'
        };
      }
      if (monthsSince >= interval.months * 0.8) {
        return { 
          isDue: true, 
          reason: `Due soon: ${Math.round(monthsSince)} months since last service`,
          dueLevel: 'DUE_SOON'
        };
      }
    } catch {
    }
  }
  
  return { isDue: false, reason: 'Service is up to date', dueLevel: 'OK' };
}

function calculatePriorityScore(
  oemDueStatus: 'DUE_NOW' | 'DUE_SOON' | 'UPCOMING' | 'OK' | null,
  dviFinding: { status: 'GREEN' | 'YELLOW' | 'RED' } | null,
  carfaxDueCheck: { isDue: boolean; dueLevel: 'OVERDUE' | 'DUE_SOON' | 'OK' } | null,
  neverPerformedOverdue: boolean = false  // True when service was never performed AND current mileage exceeds due mileage
): { score: number; priority: RecommendationPriority } {
  let score = 0;
  
  // DVI findings are the strongest signal - physical inspection of the vehicle
  if (dviFinding?.status === 'RED') score += 100;
  else if (dviFinding?.status === 'YELLOW') score += 50;
  
  // If never performed and vehicle is past due mileage, this is URGENT regardless of OEM status
  if (neverPerformedOverdue) {
    score += 90; // Higher than DUE_NOW to ensure URGENT priority
  } else {
    // OEM schedule is the primary source for maintenance timing
    if (oemDueStatus === 'DUE_NOW') score += 80;
    else if (oemDueStatus === 'DUE_SOON') score += 40;
    else if (oemDueStatus === 'UPCOMING') score += 20;
    
    // CARFAX only adds to score when OEM says DUE_NOW or DUE_SOON
    if (oemDueStatus === 'DUE_NOW' || oemDueStatus === 'DUE_SOON') {
      if (carfaxDueCheck?.dueLevel === 'OVERDUE') score += 15;
      else if (carfaxDueCheck?.dueLevel === 'DUE_SOON') score += 10;
    }
  }
  
  let priority: RecommendationPriority;
  if (score >= 80) priority = 'URGENT';
  else if (score >= 40) priority = 'SOON';
  else if (score > 0) priority = 'UPCOMING';
  else priority = 'COMPLETED';
  
  return { score, priority };
}

interface DVIFinding {
  itemName: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  notes?: string;
}

async function getDVIFindings(roId: string): Promise<DVIFinding[]> {
  try {
    const inspections = await storage.getInspectionsByRO(roId);
    if (!inspections || inspections.length === 0) return [];
    
    const latestInspection = inspections[0];
    const results = latestInspection.items as any;
    if (!results || typeof results !== 'object') return [];
    
    const findings: DVIFinding[] = [];
    
    for (const [itemId, result] of Object.entries(results)) {
      if (typeof result === 'object' && result !== null) {
        const r = result as any;
        if (r.status && ['GREEN', 'YELLOW', 'RED'].includes(r.status)) {
          findings.push({
            itemName: r.itemName || itemId,
            status: r.status,
            notes: r.notes || r.techNotes,
          });
        }
      }
    }
    
    return findings;
  } catch (error) {
    console.error('[Recommendations] Error fetching DVI findings:', error);
    return [];
  }
}

function findDVIMatch(serviceName: string, dviFindings: DVIFinding[]): DVIFinding | null {
  const normalized = normalizeServiceName(serviceName);
  const keywords = normalized.split(' ').filter(w => w.length > 2);
  
  for (const finding of dviFindings) {
    const findingNormalized = normalizeServiceName(finding.itemName);
    
    if (findingNormalized.includes(normalized) || normalized.includes(findingNormalized)) {
      return finding;
    }
    
    for (const keyword of keywords) {
      if (findingNormalized.includes(keyword)) {
        return finding;
      }
    }
  }
  
  return null;
}

export async function generateRecommendations(
  vehicleId: string,
  roId: string,
  orgId: string,
  currentMileage: number
): Promise<RecommendationsResult> {
  try {
    const vehicle = await storage.getVehicle(vehicleId);
    if (!vehicle) {
      return {
        ok: false,
        vehicleId,
        currentMileage,
        recommendations: [],
        recentlyCompleted: [],
        dataAvailability: { oem: false, carfax: false, dvi: false },
        error: 'Vehicle not found',
      };
    }
    
    const [oemResult, carfaxResult, dviFindings] = await Promise.all([
      vehicle.vin && vehicle.vin.length >= 11 
        ? getMaintenanceScheduleCached(vehicle.vin) 
        : Promise.resolve({ ok: false, items: [], count: 0, source: 'api' as const }),
      vehicle.vin && vehicle.vin.length === 17 
        ? getServiceHistoryCached(vehicle.vin) 
        : Promise.resolve({ ok: false, vin: '', serviceCategories: [], displayRecords: [], numberOfServiceRecords: 0, source: 'api' as const }),
      getDVIFindings(roId),
    ]);
    
    const recommendations: ServiceRecommendation[] = [];
    const recentlyCompleted: ServiceRecommendation[] = [];
    const processedServices = new Set<string>();
    
    if (oemResult.ok && oemResult.items.length > 0) {
      const triagedItems = triageMaintenanceItems(oemResult.items, currentMileage);
      
      for (const item of triagedItems) {
        const normalizedName = normalizeServiceName(item.maintenance_name);
        if (processedServices.has(normalizedName)) continue;
        processedServices.add(normalizedName);
        
        const carfaxMatch = carfaxResult.ok 
          ? matchServiceToOemMaintenance(carfaxResult.serviceCategories, item.maintenance_name)
          : null;
        
        const dviMatch = findDVIMatch(item.maintenance_name, dviFindings);
        
        let carfaxDueCheck: { isDue: boolean; dueLevel: 'OVERDUE' | 'DUE_SOON' | 'OK'; reason: string } | null = null;
        let lastServiceOdometer: number | null = null;
        
        if (carfaxMatch) {
          // Handle odometer that can be string or number
          const odometerValue = carfaxMatch.odometerOfLastService;
          if (odometerValue !== undefined && odometerValue !== null) {
            if (typeof odometerValue === 'number') {
              lastServiceOdometer = isNaN(odometerValue) ? null : odometerValue;
            } else {
              const cleaned = String(odometerValue).replace(/[^0-9]/g, '');
              const parsed = parseInt(cleaned, 10);
              lastServiceOdometer = isNaN(parsed) ? null : parsed;
            }
          }
          
          carfaxDueCheck = isServiceDue(
            item.maintenance_name,
            lastServiceOdometer,
            carfaxMatch.dateOfLastService,
            currentMileage
          );
        }
        
        // Determine if this is a "never performed and overdue" situation
        // If no CARFAX match AND vehicle mileage exceeds the OEM due mileage, it's overdue
        const neverPerformed = !carfaxMatch;
        const oemDueMileage = item.miles || 0;
        const neverPerformedOverdue = neverPerformed && oemDueMileage > 0 && currentMileage > oemDueMileage;
        
        const { score, priority } = calculatePriorityScore(
          item.dueStatus,
          dviMatch ? { status: dviMatch.status } : null,
          carfaxDueCheck,
          neverPerformedOverdue
        );
        
        const milesSinceLastService = lastServiceOdometer 
          ? calculateMilesSince(lastServiceOdometer, currentMileage)
          : null;
        
        const sources: RecommendationSource[] = ['OEM'];
        if (carfaxMatch) sources.push('CARFAX');
        if (dviMatch) sources.push('DVI');
        
        let suggestedAction = 'Review and discuss with customer';
        if (neverPerformedOverdue) {
          suggestedAction = `Overdue - no record of this service ever being performed. Due at ${oemDueMileage.toLocaleString()} mi, vehicle now at ${currentMileage.toLocaleString()} mi`;
        } else if (priority === 'URGENT') {
          suggestedAction = 'Recommend immediate service';
        } else if (priority === 'SOON') {
          suggestedAction = 'Schedule for next visit or today if time permits';
        }
        
        const recommendation: ServiceRecommendation = {
          id: `oem-${item.maintenance_id}`,
          serviceName: item.maintenance_name,
          priority,
          priorityScore: score,
          sources,
          rationale: {
            oemDueStatus: item.dueStatus,
            oemDueMileage: item.miles,
            oemInterval: item.miles || item.months ? { miles: item.miles || undefined, months: item.months || undefined } : null,
            carfaxLastService: carfaxMatch ? {
              date: carfaxMatch.dateOfLastService,
              odometer: lastServiceOdometer,
            } : null,
            milesSinceLastService,
            dviFinding: dviMatch ? {
              status: dviMatch.status,
              notes: dviMatch.notes,
            } : null,
          },
          suggestedAction,
        };
        
        if (priority === 'COMPLETED' || (carfaxDueCheck && !carfaxDueCheck.isDue && item.dueStatus === 'UPCOMING')) {
          recommendation.suppressedReason = carfaxDueCheck?.reason || 'Service is up to date based on CARFAX history';
          recentlyCompleted.push(recommendation);
        } else {
          recommendations.push(recommendation);
        }
      }
    }
    
    for (const finding of dviFindings) {
      if (finding.status === 'GREEN') continue;
      
      const normalizedName = normalizeServiceName(finding.itemName);
      if (processedServices.has(normalizedName)) continue;
      
      let alreadyMatched = false;
      for (const rec of recommendations) {
        if (rec.rationale.dviFinding) {
          const recNormalized = normalizeServiceName(rec.serviceName);
          if (recNormalized.includes(normalizedName) || normalizedName.includes(recNormalized)) {
            alreadyMatched = true;
            break;
          }
        }
      }
      
      if (alreadyMatched) continue;
      processedServices.add(normalizedName);
      
      const { score, priority } = calculatePriorityScore(
        null,
        { status: finding.status },
        null
      );
      
      if (priority === 'COMPLETED') continue;
      
      recommendations.push({
        id: `dvi-${finding.itemName.replace(/\s+/g, '-').toLowerCase()}`,
        serviceName: finding.itemName,
        priority,
        priorityScore: score,
        sources: ['DVI'],
        rationale: {
          dviFinding: {
            status: finding.status,
            notes: finding.notes,
          },
        },
        suggestedAction: finding.status === 'RED' 
          ? 'Immediate attention required based on technician inspection'
          : 'Discuss with customer - issue identified during inspection',
      });
    }
    
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);
    recentlyCompleted.sort((a, b) => b.priorityScore - a.priorityScore);
    
    return {
      ok: true,
      vehicleId,
      currentMileage,
      recommendations,
      recentlyCompleted,
      dataAvailability: {
        oem: oemResult.ok,
        carfax: carfaxResult.ok,
        dvi: dviFindings.length > 0,
      },
    };
  } catch (error: any) {
    console.error('[Recommendations] Error generating recommendations:', error);
    return {
      ok: false,
      vehicleId,
      currentMileage,
      recommendations: [],
      recentlyCompleted: [],
      dataAvailability: { oem: false, carfax: false, dvi: false },
      error: error.message,
    };
  }
}
