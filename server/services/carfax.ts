import { db } from "../db";
import { carfaxCache } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const CARFAX_API_URL = "https://servicesocket.carfax.com/data/1";
const CACHE_TTL_HOURS = 24;

interface CarfaxRequest {
  requestTime: number;
  vin: string;
  productDataId: string;
  locationId: string;
}

interface CarfaxServiceCategory {
  serviceName: string;
  dateOfLastService: string;
  odometerOfLastService?: string;
}

interface CarfaxDisplayRecord {
  displayDate: string;
  odometer?: string;
  text: string[];
  type: 'service' | 'recall';
}

interface CarfaxServiceHistory {
  vin: string;
  make: string;
  model: string;
  year: string;
  bodyTypeDescription?: string;
  engineInformation?: string;
  driveline?: string;
  serviceCategories?: CarfaxServiceCategory[];
  displayRecords?: CarfaxDisplayRecord[];
  numberOfServiceRecords?: number;
}

interface CarfaxError {
  code: number;
  message: string;
}

interface CarfaxResponse {
  carfaxRequest?: CarfaxRequest;
  errorMessages?: {
    errors?: CarfaxError[];
  };
  serviceHistory?: CarfaxServiceHistory;
}

export interface CarfaxResult {
  ok: boolean;
  vin: string;
  vehicleInfo?: {
    year: string;
    make: string;
    model: string;
    bodyType?: string;
    engine?: string;
    driveline?: string;
  };
  serviceCategories: CarfaxServiceCategory[];
  displayRecords: CarfaxDisplayRecord[];
  numberOfServiceRecords: number;
  error?: string;
  source: 'api' | 'cache';
  cachedAt?: Date;
}

function isConfigured(): boolean {
  return !!(process.env.CARFAX_PRODUCT_DATA_ID && process.env.CARFAX_LOCATION_ID);
}

export async function getServiceHistory(vin: string): Promise<CarfaxResult> {
  if (!isConfigured()) {
    return {
      ok: false,
      vin,
      serviceCategories: [],
      displayRecords: [],
      numberOfServiceRecords: 0,
      error: "CARFAX integration not configured",
      source: 'api',
    };
  }

  try {
    const requestBody = {
      vin: vin.toUpperCase(),
      productDataId: process.env.CARFAX_PRODUCT_DATA_ID,
      locationId: process.env.CARFAX_LOCATION_ID,
    };

    console.log(`[CARFAX] Fetching service history for VIN: ${vin}`);

    const response = await fetch(CARFAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return {
        ok: false,
        vin,
        serviceCategories: [],
        displayRecords: [],
        numberOfServiceRecords: 0,
        error: `HTTP error: ${response.status}`,
        source: 'api',
      };
    }

    const data: CarfaxResponse = await response.json();

    if (data.errorMessages?.errors && data.errorMessages.errors.length > 0) {
      const error = data.errorMessages.errors[0];
      console.log(`[CARFAX] API error: ${error.code} - ${error.message}`);
      return {
        ok: false,
        vin,
        serviceCategories: [],
        displayRecords: [],
        numberOfServiceRecords: 0,
        error: error.message,
        source: 'api',
      };
    }

    const history = data.serviceHistory;
    if (!history) {
      return {
        ok: false,
        vin,
        serviceCategories: [],
        displayRecords: [],
        numberOfServiceRecords: 0,
        error: "No service history returned",
        source: 'api',
      };
    }

    const displayRecords = (history.displayRecords || []).sort((a, b) => {
      if (a.displayDate === 'Not Reported') return 1;
      if (b.displayDate === 'Not Reported') return -1;
      return new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime();
    });

    console.log(`[CARFAX] Found ${displayRecords.length} service records for VIN: ${vin}`);

    return {
      ok: true,
      vin,
      vehicleInfo: {
        year: history.year,
        make: history.make,
        model: history.model,
        bodyType: history.bodyTypeDescription,
        engine: history.engineInformation,
        driveline: history.driveline,
      },
      serviceCategories: history.serviceCategories || [],
      displayRecords,
      numberOfServiceRecords: displayRecords.filter(r => r.type === 'service').length,
      source: 'api',
    };
  } catch (error: any) {
    console.error("[CARFAX] Error fetching service history:", error);
    return {
      ok: false,
      vin,
      serviceCategories: [],
      displayRecords: [],
      numberOfServiceRecords: 0,
      error: error.message || String(error),
      source: 'api',
    };
  }
}

export async function getServiceHistoryCached(vin: string): Promise<CarfaxResult> {
  const vinUpper = vin.toUpperCase();
  const now = new Date();

  try {
    const cached = await db.select().from(carfaxCache)
      .where(and(
        eq(carfaxCache.vin, vinUpper),
        gt(carfaxCache.expiresAt, now)
      ))
      .limit(1);

    if (cached.length > 0) {
      console.log(`[CARFAX Cache] HIT for VIN ${vinUpper}`);
      const c = cached[0];
      return {
        ok: true,
        vin: vinUpper,
        vehicleInfo: c.vehicleInfo as CarfaxResult['vehicleInfo'],
        serviceCategories: (c.serviceCategories as CarfaxServiceCategory[]) || [],
        displayRecords: (c.displayRecords as CarfaxDisplayRecord[]) || [],
        numberOfServiceRecords: c.numberOfServiceRecords || 0,
        source: 'cache',
        cachedAt: c.fetchedAt,
      };
    }

    console.log(`[CARFAX Cache] MISS for VIN ${vinUpper}, fetching from API...`);

    const apiResult = await getServiceHistory(vinUpper);

    if (apiResult.ok) {
      const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

      await db.insert(carfaxCache).values({
        vin: vinUpper,
        vehicleInfo: apiResult.vehicleInfo || null,
        serviceCategories: apiResult.serviceCategories,
        displayRecords: apiResult.displayRecords,
        numberOfServiceRecords: apiResult.numberOfServiceRecords,
        fetchedAt: now,
        expiresAt,
      }).onConflictDoUpdate({
        target: carfaxCache.vin,
        set: {
          vehicleInfo: apiResult.vehicleInfo || null,
          serviceCategories: apiResult.serviceCategories,
          displayRecords: apiResult.displayRecords,
          numberOfServiceRecords: apiResult.numberOfServiceRecords,
          fetchedAt: now,
          expiresAt,
        },
      });

      console.log(`[CARFAX Cache] Stored ${apiResult.numberOfServiceRecords} records for VIN ${vinUpper}`);
    }

    return apiResult;
  } catch (error: any) {
    console.error("[CARFAX Cache] Error:", error);
    return await getServiceHistory(vinUpper);
  }
}

export function getCarfaxStatus(): { configured: boolean } {
  return { configured: isConfigured() };
}

export function matchServiceToOemMaintenance(
  serviceCategories: CarfaxServiceCategory[],
  oemMaintenanceName: string
): CarfaxServiceCategory | null {
  const normalizedOem = oemMaintenanceName.toLowerCase();

  const matchPatterns: Record<string, string[]> = {
    'oil': ['oil change', 'engine oil', 'oil and filter'],
    'tire rotation': ['tire rotation', 'rotate tires'],
    'cabin air filter': ['cabin air filter'],
    'air filter': ['air filter', 'air cleaner'],
    'coolant': ['coolant', 'antifreeze', 'radiator flush'],
    'transmission': ['transmission fluid', 'trans fluid'],
    'brake': ['brake', 'brake pad', 'brake lining'],
    'spark plug': ['spark plug'],
    'battery': ['battery'],
    'belt': ['serpentine belt', 'drive belt', 'accessory belt'],
    'fuel filter': ['fuel filter'],
    'differential': ['differential'],
    'transfer case': ['transfer case'],
    'power steering': ['power steering'],
    'emission': ['emission', 'emissions'],
  };

  for (const [key, patterns] of Object.entries(matchPatterns)) {
    if (patterns.some(p => normalizedOem.includes(p))) {
      const match = serviceCategories.find(cat => 
        cat.serviceName.toLowerCase().includes(key) ||
        patterns.some(p => cat.serviceName.toLowerCase().includes(p))
      );
      if (match) return match;
    }
  }

  return null;
}
