// AeroSpec API client with authentication support

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// API methods
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    apiRequest<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  // Homes
  getHomes: () => apiRequest<{ homes: any[] }>('/homes'),
  getHomeRooms: (homeId: string) =>
    apiRequest<{ rooms: any[] }>(`/homes/${homeId}/rooms`),

  // Rooms
  getRoom: (roomId: string) => apiRequest<any>(`/rooms/${roomId}`),

  // Devices
  getDevices: () => apiRequest<{ devices: any[] }>('/devices'),
  getDeviceReadings: (deviceId: string, range: string = '24h', page: number = 1, limit: number = 1000) =>
    apiRequest<{
      readings: any[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      }
    }>(`/devices/${deviceId}/readings?range=${range}&page=${page}&limit=${limit}`),

  // Crowd map
  getMapCells: (bbox: string, hours: number = 24) =>
    apiRequest<{ cells: any[] }>(`/map/cells?bbox=${bbox}&hours=${hours}`),
  getOpenAQLatest: (bbox: string) =>
    apiRequest<{ stations: any[] }>(`/external/openaq/latest?bbox=${bbox}`),

  // Alerts
  getAlerts: () => apiRequest<{ rules: any[]; events: any[] }>('/alerts'),
  getAlertEvents: (status?: string, limit?: number) =>
    apiRequest<{ events: any[] }>(
      `/alerts/events?${new URLSearchParams({
        ...(status && { status }),
        ...(limit && { limit: limit.toString() }),
      })}`
    ),
  acknowledgeAlert: (alertId: string) =>
    apiRequest<{ success: boolean }>(`/alerts/${alertId}/ack`, { method: 'POST' }),
  dismissAlert: (alertId: string) =>
    apiRequest<{ success: boolean }>(`/alerts/${alertId}/dismiss`, { method: 'POST' }),

  // Reports
  getWeeklyReports: () => apiRequest<{ reports: any[] }>('/reports/weekly'),
  getReport: (reportId: string) => apiRequest<any>(`/reports/${reportId}`),

  // Admin
  getAdminDevices: () => apiRequest<any>('/admin/devices'),
  getAdminStats: () => apiRequest<any>('/admin/stats'),
  initiateOTA: (firmwareVersion: string, targetDeviceIds: string[]) =>
    apiRequest<any>('/admin/ota', {
      method: 'POST',
      body: JSON.stringify({ firmwareVersion, targetDeviceIds }),
    }),
};

// Export helper function
export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const token = getAuthToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, { headers });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
