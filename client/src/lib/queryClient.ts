import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrMethod: string,
  optionsOrUrl?: string | RequestInit,
  data?: unknown | undefined,
): Promise<any> {
  let url: string;
  let options: RequestInit = {};

  // Support two calling patterns:
  // 1. apiRequest(url) or apiRequest(url, { method, body, ... }) - fetch-like
  // 2. apiRequest(method, url, data) - legacy pattern
  if (typeof optionsOrUrl === 'string') {
    // Legacy pattern: apiRequest(method, url, data)
    url = optionsOrUrl;
    options = {
      method: urlOrMethod,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    };
  } else if (optionsOrUrl && typeof optionsOrUrl === 'object') {
    // Fetch-like pattern: apiRequest(url, options)
    url = urlOrMethod;
    options = {
      ...optionsOrUrl,
      headers: {
        "Content-Type": "application/json",
        ...(optionsOrUrl.headers || {}),
      },
    };
  } else {
    // Simple GET: apiRequest(url)
    url = urlOrMethod;
    options = { method: 'GET' };
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Return JSON for convenience
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
