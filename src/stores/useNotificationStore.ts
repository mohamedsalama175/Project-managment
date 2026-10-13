import { create } from 'zustand';
import {
  apiClient,
  ApiNotification,
  ApiNotificationPreference,
} from '../api/client';

interface NotificationState {
  notifications: ApiNotification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  filterUnreadOnly: boolean;
  preferences: ApiNotificationPreference[];
  isPreferencesOpen: boolean;

  // Actions
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  setIsOpen: (isOpen: boolean) => void;
  setFilterUnreadOnly: (unreadOnly: boolean) => void;
  setIsPreferencesOpen: (isOpen: boolean) => void;
  fetchPreferences: () => Promise<void>;
  savePreferences: (prefs: ApiNotificationPreference[]) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  filterUnreadOnly: false,
  preferences: [],
  isPreferencesOpen: false,

  fetchNotifications: async (unreadOnly?: boolean) => {
    const isUnread = unreadOnly ?? get().filterUnreadOnly;
    set({ isLoading: true });
    try {
      const res = await apiClient.getNotifications(isUnread, 30);
      set({
        notifications: res.data,
        unreadCount: res.meta?.unread_count ?? 0,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await apiClient.getUnreadNotificationsCount();
      set({ unreadCount: res.unread_count });
    } catch {
      // Non-blocking for background polling
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      const now = new Date().toISOString();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read_at: n.read_at || now })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  },

  setIsOpen: (isOpen: boolean) => {
    set({ isOpen });
    if (isOpen) {
      get().fetchNotifications();
    }
  },

  setFilterUnreadOnly: (filterUnreadOnly: boolean) => {
    set({ filterUnreadOnly });
    get().fetchNotifications(filterUnreadOnly);
  },

  setIsPreferencesOpen: (isPreferencesOpen: boolean) => {
    set({ isPreferencesOpen });
    if (isPreferencesOpen) {
      get().fetchPreferences();
    }
  },

  fetchPreferences: async () => {
    try {
      const res = await apiClient.getNotificationPreferences();
      set({ preferences: res.data });
    } catch (err) {
      console.error('Failed to load notification preferences', err);
    }
  },

  savePreferences: async (prefs: ApiNotificationPreference[]) => {
    try {
      const res = await apiClient.updateNotificationPreferences(prefs);
      set({ preferences: res.data });
    } catch (err) {
      console.error('Failed to save notification preferences', err);
      throw err;
    }
  },
}));
