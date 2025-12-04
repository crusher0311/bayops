/**
 * PartsTech API Integration
 * Provides VIN decode, parts search, and ordering capabilities
 */

const PARTSTECH_API_BASE = 'https://api.partstech.com';

interface PartstechCredentials {
  username: string;
  apiKey: string;
  partnerId: string;
  partnerKey: string;
}

interface AccessTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  username?: string;
  partner?: string;
}

interface PartstechVehicle {
  year: number;
  make: string;
  model: string;
  submodel?: string;
  engine?: string;
  vehicleId?: string;
}

interface PartstechPart {
  partNumber: string;
  description: string;
  brand: string;
  brandId?: string;
  price?: number;
  listPrice?: number;
  corePrice?: number;
  quantity?: number;
  available?: boolean;
  supplier?: string;
  supplierId?: string;
  store?: string;
  storeId?: string;
  lineCode?: string;
  image?: string;
  notes?: string[];
  attributes?: Record<string, string>;
}

interface PartstechSearchResult {
  parts: PartstechPart[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Token cache to avoid re-authenticating on every request
let cachedToken: { token: string; expiresAt: number } | null = null;

function getCredentials(): PartstechCredentials {
  const username = process.env.PARTSTECH_USERNAME;
  const apiKey = process.env.PARTSTECH_API_KEY;
  const partnerId = process.env.PARTSTECH_PARTNER_ID;
  const partnerKey = process.env.PARTSTECH_PARTNER_KEY;

  if (!username || !apiKey) {
    throw new Error('PartsTech user credentials not configured. Please set PARTSTECH_USERNAME and PARTSTECH_API_KEY.');
  }

  if (!partnerId || !partnerKey) {
    throw new Error('PartsTech partner credentials not configured. Please set PARTSTECH_PARTNER_ID and PARTSTECH_PARTNER_KEY.');
  }

  return { username, apiKey, partnerId, partnerKey };
}

/**
 * Get a valid access token, using cache if available
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const credentials = getCredentials();

  const response = await fetch(`${PARTSTECH_API_BASE}/oauth/access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accessType: 'user',
      credentials: {
        user: {
          id: credentials.username,
          key: credentials.apiKey,
        },
        partner: {
          id: credentials.partnerId,
          key: credentials.partnerKey,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PartsTech authentication failed: ${error}`);
  }

  const data: AccessTokenResponse = await response.json();
  
  // Cache the token (expiresIn is in seconds)
  cachedToken = {
    token: data.accessToken,
    expiresAt: Date.now() + (data.expiresIn * 1000),
  };

  return data.accessToken;
}

/**
 * Make an authenticated request to PartsTech API
 */
async function partstechRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${PARTSTECH_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PartsTech API error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Decode VIN to get vehicle information
 * Throws on API errors, returns null only for genuine "not found"
 */
export async function decodeVIN(vin: string): Promise<PartstechVehicle | null> {
  const data = await partstechRequest<any>(`/catalog/vin/${vin}`);
  
  if (!data || !data.vehicle) {
    return null;
  }

  const vehicle = data.vehicle;
  return {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    submodel: vehicle.submodel,
    engine: vehicle.engine,
    vehicleId: vehicle.vehicleId,
  };
}

/**
 * Search for parts by keyword and optional vehicle context
 * Throws on API errors so callers can handle appropriately
 */
export async function searchParts(
  query: string,
  options: {
    vin?: string;
    vehicleId?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<PartstechSearchResult> {
  const { vin, vehicleId, categoryId, page = 1, pageSize = 20 } = options;

  const body: any = {
    searchTerm: query,
    page,
    pageSize,
  };

  // Add vehicle context if available
  if (vin) {
    body.vin = vin;
  } else if (vehicleId) {
    body.vehicleId = vehicleId;
  }

  if (categoryId) {
    body.categoryId = categoryId;
  }

  const data = await partstechRequest<any>('/catalog/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const parts: PartstechPart[] = (data.parts || []).map((part: any) => ({
    partNumber: part.partNumber || part.partNo,
    description: part.description || part.partDescription,
    brand: part.brand || part.brandName,
    brandId: part.brandId,
    price: part.price || part.unitPrice,
    listPrice: part.listPrice,
    corePrice: part.corePrice,
    quantity: part.quantityAvailable || part.quantity,
    available: part.available !== false,
    supplier: part.supplier || part.supplierName,
    supplierId: part.supplierId,
    store: part.store || part.storeName,
    storeId: part.storeId,
    lineCode: part.lineCode,
    image: part.image || part.imageUrl,
    notes: part.notes,
    attributes: part.attributes,
  }));

  return {
    parts,
    totalCount: data.totalCount || parts.length,
    page,
    pageSize,
  };
}

/**
 * Get part details by part number
 * Throws on API errors, returns null only for genuine "not found"
 */
export async function getPartDetails(partNumber: string, brandId?: string): Promise<PartstechPart | null> {
  let endpoint = `/catalog/parts/${encodeURIComponent(partNumber)}`;
  if (brandId) {
    endpoint += `?brandId=${encodeURIComponent(brandId)}`;
  }

  const data = await partstechRequest<any>(endpoint);

  if (!data || !data.part) {
    return null;
  }

  const part = data.part;
  return {
    partNumber: part.partNumber || part.partNo,
    description: part.description || part.partDescription,
    brand: part.brand || part.brandName,
    brandId: part.brandId,
    price: part.price || part.unitPrice,
    listPrice: part.listPrice,
    corePrice: part.corePrice,
    quantity: part.quantityAvailable || part.quantity,
    available: part.available !== false,
    supplier: part.supplier || part.supplierName,
    supplierId: part.supplierId,
    store: part.store || part.storeName,
    storeId: part.storeId,
    lineCode: part.lineCode,
    image: part.image || part.imageUrl,
    notes: part.notes,
    attributes: part.attributes,
  };
}

/**
 * Get available suppliers
 * Throws on API errors
 */
export async function getSuppliers(): Promise<Array<{ id: string; name: string }>> {
  const data = await partstechRequest<any>('/suppliers');
  return (data.suppliers || []).map((s: any) => ({
    id: s.id || s.supplierId,
    name: s.name || s.supplierName,
  }));
}

/**
 * Get vehicle years/makes/models for dropdown selection
 * Throws on API errors
 */
export async function getVehicleYears(): Promise<number[]> {
  const data = await partstechRequest<any>('/taxonomy/vehicles/years');
  return data.years || [];
}

export async function getVehicleMakes(year: number): Promise<Array<{ id: string; name: string }>> {
  const data = await partstechRequest<any>(`/taxonomy/vehicles/makes?year=${year}`);
  return (data.makes || []).map((m: any) => ({
    id: m.id || m.makeId,
    name: m.name || m.makeName,
  }));
}

export async function getVehicleModels(year: number, makeId: string): Promise<Array<{ id: string; name: string }>> {
  const data = await partstechRequest<any>(`/taxonomy/vehicles/models?year=${year}&makeId=${makeId}`);
  return (data.models || []).map((m: any) => ({
    id: m.id || m.modelId,
    name: m.name || m.modelName,
  }));
}

/**
 * Get part categories for browsing
 * Throws on API errors
 */
export async function getCategories(): Promise<Array<{ id: string; name: string; subcategories?: any[] }>> {
  const data = await partstechRequest<any>('/taxonomy/categories');
  return (data.categories || []).map((c: any) => ({
    id: c.id || c.categoryId,
    name: c.name || c.categoryName,
    subcategories: c.subcategories,
  }));
}

/**
 * Check if PartsTech is configured (requires both user and partner credentials)
 */
export function isPartstechConfigured(): boolean {
  return !!(
    process.env.PARTSTECH_USERNAME && 
    process.env.PARTSTECH_API_KEY &&
    process.env.PARTSTECH_PARTNER_ID &&
    process.env.PARTSTECH_PARTNER_KEY
  );
}
