import { db } from "../db";
import { dataoneCache, maintenanceRecommendations, vehicles } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const DATAONE_API_BASE = (process.env.DATAONE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const CACHE_TTL_DAYS = 7;

interface MaintenanceItem {
  maintenance_id: number;
  maintenance_category: string;
  maintenance_name: string;
  maintenance_notes: string | null;
  intervals: {
    interval_id: number;
    interval_type: string;
    value: number;
    units: string;
    initial_value: number;
  }[];
  miles: number | null;
  months: number | null;
}

interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  trim: string;
  engine: string;
  transmission: string;
  driveType: string;
  fuelType: string;
}

interface TriagedItem extends MaintenanceItem {
  dueStatus: 'DUE_NOW' | 'DUE_SOON' | 'UPCOMING' | 'OK';
  dueMileage: number | null;
  milesUntilDue: number | null;
}

function toSquish(vin: string): string {
  const v = String(vin).toUpperCase().trim();
  return v.slice(0, 8) + v.slice(9, 11);
}

export async function decodeVin(vin: string): Promise<{
  ok: boolean;
  vin: string;
  vehicle?: VehicleInfo;
  error?: string;
}> {
  try {
    const squish = toSquish(vin);
    const url = `${DATAONE_API_BASE}/api/data/VIN_REFERENCE?vin_pattern__regex=^${squish}&limit=1`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { ok: false, vin, error: `API error: ${response.status}` };
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return { ok: false, vin, error: "VIN not found in database" };
    }

    const d = result.data[0];
    return {
      ok: true,
      vin,
      vehicle: {
        year: d.year,
        make: d.make,
        model: d.model,
        trim: d.trim,
        engine: d.engine_name,
        transmission: d.trans_name,
        driveType: d.drive_type,
        fuelType: d.fuel_type === "G" ? "Gasoline" : d.fuel_type === "D" ? "Diesel" : d.fuel_type === "E" ? "Electric" : d.fuel_type,
      },
    };
  } catch (error) {
    console.error("[DataOne] VIN decode error:", error);
    return { ok: false, vin, error: String(error) };
  }
}

export async function getMaintenanceSchedule(vin: string): Promise<{
  ok: boolean;
  vin: string;
  squish: string;
  count: number;
  items: MaintenanceItem[];
  error?: string;
}> {
  const squish = toSquish(vin);
  
  try {
    const vinMaintenanceUrl = `${DATAONE_API_BASE}/api/data/LKP_VIN_MAINTENANCE?squish=${squish}&limit=500`;
    const vinMaintenanceResponse = await fetch(vinMaintenanceUrl, {
      signal: AbortSignal.timeout(15000),
    });
    
    if (!vinMaintenanceResponse.ok) {
      return { ok: false, vin, squish, count: 0, items: [], error: `API error: ${vinMaintenanceResponse.status}` };
    }

    const vinMaintenanceData = await vinMaintenanceResponse.json();
    
    if (!vinMaintenanceData.data || vinMaintenanceData.data.length === 0) {
      return { ok: false, vin, squish, count: 0, items: [], error: "No maintenance data found for this VIN" };
    }

    const maintenanceIds = [...new Set(vinMaintenanceData.data.map((d: any) => d.maintenance_id))];
    const vinMaintenanceIds = vinMaintenanceData.data.map((d: any) => d.vin_maintenance_id);

    const [maintenanceDefsResponse, intervalsResponse] = await Promise.all([
      fetch(`${DATAONE_API_BASE}/api/data/DEF_MAINTENANCE?maintenance_id__in=${maintenanceIds.join(",")}&limit=500`, {
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`${DATAONE_API_BASE}/api/data/LKP_VIN_MAINTENANCE_INTERVAL?vin_maintenance_id__in=${vinMaintenanceIds.join(",")}&limit=1000`, {
        signal: AbortSignal.timeout(10000),
      })
    ]);

    const maintenanceDefs = await maintenanceDefsResponse.json();
    const intervals = await intervalsResponse.json();

    const intervalIds = [...new Set((intervals.data || []).map((d: any) => d.maintenance_interval_id).filter((id: number) => id > 0))];
    
    let intervalDefs: any[] = [];
    if (intervalIds.length > 0) {
      const intervalDefsResponse = await fetch(`${DATAONE_API_BASE}/api/data/DEF_MAINTENANCE_INTERVAL?maintenance_interval_id__in=${intervalIds.join(",")}&limit=500`, {
        signal: AbortSignal.timeout(10000),
      });
      const intervalDefsData = await intervalDefsResponse.json();
      intervalDefs = intervalDefsData.data || [];
    }

    const maintenanceDefMap = new Map<number, any>((maintenanceDefs.data || []).map((d: any) => [d.maintenance_id, d]));
    const intervalDefMap = new Map<number, any>(intervalDefs.map((d: any) => [d.maintenance_interval_id, d]));
    
    const vinMaintenanceMap = new Map<number, any>();
    for (const vm of vinMaintenanceData.data) {
      vinMaintenanceMap.set(vm.vin_maintenance_id, vm);
    }

    const itemsMap = new Map<number, MaintenanceItem>();
    
    for (const vm of vinMaintenanceData.data) {
      const def = maintenanceDefMap.get(vm.maintenance_id);
      if (!def) continue;

      if (!itemsMap.has(vm.maintenance_id)) {
        itemsMap.set(vm.maintenance_id, {
          maintenance_id: vm.maintenance_id,
          maintenance_category: def.maintenance_category || "General",
          maintenance_name: def.maintenance_name || "Unknown",
          maintenance_notes: def.maintenance_notes,
          intervals: [],
          miles: null,
          months: null,
        });
      }
    }

    for (const interval of (intervals.data || [])) {
      const vm = vinMaintenanceMap.get(interval.vin_maintenance_id);
      if (!vm) continue;

      const item = itemsMap.get(vm.maintenance_id);
      if (!item) continue;

      const intervalDef = intervalDefMap.get(interval.maintenance_interval_id);
      if (intervalDef) {
        item.intervals.push({
          interval_id: intervalDef.maintenance_interval_id,
          interval_type: intervalDef.interval_type,
          value: intervalDef.value,
          units: intervalDef.units,
          initial_value: intervalDef.initial_value,
        });

        if (intervalDef.units === "Miles" && (item.miles === null || intervalDef.value < item.miles)) {
          item.miles = intervalDef.value;
        }
        if (intervalDef.units === "Months" && (item.months === null || intervalDef.value < item.months)) {
          item.months = intervalDef.value;
        }
      }
    }

    const items = Array.from(itemsMap.values()).sort((a, b) => {
      const catCompare = a.maintenance_category.localeCompare(b.maintenance_category);
      if (catCompare !== 0) return catCompare;
      return a.maintenance_name.localeCompare(b.maintenance_name);
    });

    return { ok: true, vin, squish, count: items.length, items };
  } catch (error) {
    console.error("[DataOne] Maintenance schedule error:", error);
    return { ok: false, vin, squish, count: 0, items: [], error: String(error) };
  }
}

export async function getMaintenanceScheduleCached(vin: string): Promise<{
  ok: boolean;
  vin: string;
  squish: string;
  count: number;
  items: MaintenanceItem[];
  vehicleInfo?: VehicleInfo;
  error?: string;
  source: "api" | "cache";
  cachedAt?: Date;
}> {
  const squish = toSquish(vin);
  const now = new Date();
  
  try {
    const cached = await db.select().from(dataoneCache)
      .where(and(
        eq(dataoneCache.squish, squish),
        gt(dataoneCache.expiresAt, now)
      ))
      .limit(1);
    
    if (cached.length > 0) {
      console.log(`[DataOne Cache] HIT for squish ${squish}`);
      const c = cached[0];
      return {
        ok: true,
        vin,
        squish,
        count: c.itemCount,
        items: c.maintenanceItems as MaintenanceItem[],
        vehicleInfo: c.vehicleInfo as VehicleInfo | undefined,
        source: "cache",
        cachedAt: c.fetchedAt,
      };
    }
    
    console.log(`[DataOne Cache] MISS for squish ${squish}, fetching from API...`);
    
    const [apiResult, vehicleResult] = await Promise.all([
      getMaintenanceSchedule(vin),
      decodeVin(vin),
    ]);
    
    const expiresAt = new Date(now.getTime() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    
    await db.insert(dataoneCache).values({
      squish,
      vin,
      vehicleInfo: vehicleResult.ok ? vehicleResult.vehicle : null,
      maintenanceItems: apiResult.items,
      itemCount: apiResult.count,
      source: 'api',
      fetchedAt: now,
      expiresAt,
    }).onConflictDoUpdate({
      target: dataoneCache.squish,
      set: {
        vin,
        vehicleInfo: vehicleResult.ok ? vehicleResult.vehicle : null,
        maintenanceItems: apiResult.items,
        itemCount: apiResult.count,
        source: 'api',
        fetchedAt: now,
        expiresAt,
      },
    });
    
    console.log(`[DataOne Cache] Stored ${apiResult.count} items for squish ${squish}`);
    
    return {
      ok: apiResult.ok,
      vin,
      squish,
      count: apiResult.count,
      items: apiResult.items,
      vehicleInfo: vehicleResult.ok ? vehicleResult.vehicle : undefined,
      error: apiResult.error,
      source: "api",
    };
  } catch (error) {
    console.error("[DataOne Cache] Error:", error);
    const apiResult = await getMaintenanceSchedule(vin);
    return {
      ...apiResult,
      source: "api",
    };
  }
}

export function triageMaintenanceItems(
  items: MaintenanceItem[],
  currentMileage: number,
  dueSoonMiles: number = 1000
): TriagedItem[] {
  return items.map(item => {
    let dueStatus: TriagedItem['dueStatus'] = 'UPCOMING';
    let dueMileage: number | null = null;
    let milesUntilDue: number | null = null;
    
    if (item.miles) {
      const intervalsSincePurchase = Math.floor(currentMileage / item.miles);
      dueMileage = (intervalsSincePurchase + 1) * item.miles;
      milesUntilDue = dueMileage - currentMileage;
      
      if (milesUntilDue <= 0) {
        dueStatus = 'DUE_NOW';
      } else if (milesUntilDue <= dueSoonMiles) {
        dueStatus = 'DUE_SOON';
      } else {
        dueStatus = 'UPCOMING';
      }
    }
    
    return {
      ...item,
      dueStatus,
      dueMileage,
      milesUntilDue,
    };
  }).sort((a, b) => {
    const statusOrder = { 'DUE_NOW': 0, 'DUE_SOON': 1, 'UPCOMING': 2, 'OK': 3 };
    const statusDiff = statusOrder[a.dueStatus] - statusOrder[b.dueStatus];
    if (statusDiff !== 0) return statusDiff;
    
    if (a.milesUntilDue !== null && b.milesUntilDue !== null) {
      return a.milesUntilDue - b.milesUntilDue;
    }
    return 0;
  });
}

export async function invalidateCache(vin: string): Promise<boolean> {
  try {
    const squish = toSquish(vin);
    await db.delete(dataoneCache).where(eq(dataoneCache.squish, squish));
    console.log(`[DataOne Cache] Invalidated cache for squish ${squish}`);
    return true;
  } catch (error) {
    console.error("[DataOne Cache] Failed to invalidate:", error);
    return false;
  }
}
