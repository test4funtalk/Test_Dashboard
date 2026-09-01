import api from './api';

const notificationService = {
  getNotifications: (params) =>
    api.get('/api/admin/notifications', { params }),

  getUnreadCount: () =>
    api.get('/api/admin/notifications/unread-count'),

  markAsRead: (id) =>
    api.patch(`/api/admin/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/api/admin/notifications/read-all'),
};

export default notificationService;
