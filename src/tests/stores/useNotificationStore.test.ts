import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { apiClient } from '../../api/client';

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      isLoading: false,
      filterUnreadOnly: false,
      preferences: [],
      isPreferencesOpen: false,
    });
  });

  it('initializes with default state', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isOpen).toBe(false);
  });

  it('toggles isOpen and triggers fetchNotifications when opened', async () => {
    const fetchSpy = vi.spyOn(apiClient, 'getNotifications').mockResolvedValue({
      data: [
        {
          id: 'notif-1',
          type: 'task.assigned',
          title: 'New Task Assigned',
          message: 'You have been assigned to Foundation Task',
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
      meta: { unread_count: 1 },
    } as any);

    useNotificationStore.getState().setIsOpen(true);
    expect(useNotificationStore.getState().isOpen).toBe(true);

    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('marks a single notification as read and decrements count', async () => {
    vi.spyOn(apiClient, 'markNotificationAsRead').mockResolvedValue({} as any);

    useNotificationStore.setState({
      notifications: [
        {
          id: 'notif-1',
          type: 'task.assigned',
          event_type: 'task.assigned',
          title: 'Task Assigned',
          body: 'Check task',
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
      unreadCount: 1,
    });

    await useNotificationStore.getState().markAsRead('notif-1');

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications[0].read_at).toBeTruthy();
  });

  it('marks all notifications as read', async () => {
    vi.spyOn(apiClient, 'markAllNotificationsAsRead').mockResolvedValue({} as any);

    useNotificationStore.setState({
      notifications: [
        {
          id: 'notif-1',
          type: 'task.assigned',
          event_type: 'task.assigned',
          title: 'Task 1',
          body: 'Task 1 message',
          read_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          type: 'task.review',
          event_type: 'task.review',
          title: 'Review 2',
          body: 'Review message',
          read_at: null,
          created_at: new Date().toISOString(),
        },
      ],
      unreadCount: 2,
    });

    await useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications[0].read_at).toBeTruthy();
    expect(state.notifications[1].read_at).toBeTruthy();
  });

  it('fetches unread count independently for polling', async () => {
    vi.spyOn(apiClient, 'getUnreadNotificationsCount').mockResolvedValue({
      unread_count: 5,
    } as any);

    await useNotificationStore.getState().fetchUnreadCount();

    expect(useNotificationStore.getState().unreadCount).toBe(5);
  });
});
