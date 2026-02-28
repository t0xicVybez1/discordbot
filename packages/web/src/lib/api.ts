import axios from 'axios';
import type {
  ApiResponse,
  GuildSettings,
  AutoModConfig,
  WelcomeConfig,
  GuildOverview,
  SystemStats,
} from '@discordbot/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────
export const authApi = {
  getOAuthUrl: () => api.get<ApiResponse<{ url: string; state: string }>>('/auth/url'),
  callback: (code: string, state: string) =>
    api.post<ApiResponse<{ user: import('@discordbot/shared').PortalUser; accessToken: string; refreshToken: string }>>('/auth/callback', { code, state }),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get<ApiResponse<import('@discordbot/shared').PortalUser>>('/auth/me'),
};

// ─── Guilds ───────────────────────────────────────────────────────
export const guildsApi = {
  list: () => api.get<ApiResponse<GuildOverview[]>>('/guilds'),
  get: (guildId: string) => api.get<ApiResponse<GuildOverview>>(`/guilds/${guildId}`),
  channels: (guildId: string) => api.get<ApiResponse<unknown[]>>(`/guilds/${guildId}/channels`),
  roles: (guildId: string) => api.get<ApiResponse<unknown[]>>(`/guilds/${guildId}/roles`),
  analytics: (guildId: string) => api.get<ApiResponse<import('@discordbot/shared').GuildAnalytics>>(`/guilds/${guildId}/analytics`),
};

// ─── Settings ─────────────────────────────────────────────────────
export const settingsApi = {
  get: (guildId: string) => api.get<ApiResponse<GuildSettings>>(`/guilds/${guildId}/settings`),
  update: (guildId: string, data: Partial<GuildSettings>) =>
    api.patch<ApiResponse<GuildSettings>>(`/guilds/${guildId}/settings`, data),
  getAutoMod: (guildId: string) => api.get<ApiResponse<AutoModConfig>>(`/guilds/${guildId}/settings/automod`),
  updateAutoMod: (guildId: string, data: Partial<AutoModConfig>) =>
    api.patch<ApiResponse<AutoModConfig>>(`/guilds/${guildId}/settings/automod`, data),
  getWelcome: (guildId: string) => api.get<ApiResponse<WelcomeConfig>>(`/guilds/${guildId}/settings/welcome`),
  updateWelcome: (guildId: string, data: Partial<WelcomeConfig>) =>
    api.patch<ApiResponse<WelcomeConfig>>(`/guilds/${guildId}/settings/welcome`, data),
  getReactionRoles: (guildId: string) => api.get(`/guilds/${guildId}/reaction-roles`),
  createReactionRole: (guildId: string, data: object) =>
    api.post(`/guilds/${guildId}/reaction-roles`, data),
  deleteReactionRole: (guildId: string, id: string) =>
    api.delete(`/guilds/${guildId}/reaction-roles/${id}`),
};

// ─── Moderation ───────────────────────────────────────────────────
export const moderationApi = {
  getCases: (guildId: string, params?: object) =>
    api.get(`/guilds/${guildId}/cases`, { params }),
  getCase: (guildId: string, caseNumber: number) =>
    api.get(`/guilds/${guildId}/cases/${caseNumber}`),
  updateCase: (guildId: string, caseNumber: number, data: object) =>
    api.patch(`/guilds/${guildId}/cases/${caseNumber}`, data),
  getWarnings: (guildId: string, params?: object) =>
    api.get(`/guilds/${guildId}/warnings`, { params }),
  clearWarning: (guildId: string, id: string) =>
    api.delete(`/guilds/${guildId}/warnings/${id}`),
  getLogs: (guildId: string, params?: object) =>
    api.get(`/guilds/${guildId}/logs`, { params }),
};

// ─── Addons ───────────────────────────────────────────────────────
export const addonsApi = {
  listAll: () => api.get('/addons'),
  listGuild: (guildId: string) => api.get(`/guilds/${guildId}/addons`),
  install: (guildId: string, addonId: string) =>
    api.post(`/guilds/${guildId}/addons/${addonId}`),
  uninstall: (guildId: string, addonId: string) =>
    api.delete(`/guilds/${guildId}/addons/${addonId}`),
  getSettings: (guildId: string, addonId: string) =>
    api.get(`/guilds/${guildId}/addons/${addonId}/settings`),
  updateSettings: (guildId: string, addonId: string, settings: object) =>
    api.patch(`/guilds/${guildId}/addons/${addonId}/settings`, settings),
};

// ─── Admin ────────────────────────────────────────────────────────
export const adminApi = {
  getGuilds: (params?: object) => api.get('/admin/guilds', { params }),
  getStats: () => api.get<ApiResponse<SystemStats>>('/admin/stats'),
  getUsers: (params?: object) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: object) => api.patch(`/admin/users/${id}`, data),
  getLogs: (params?: object) => api.get('/admin/logs', { params }),
};

export default api;
