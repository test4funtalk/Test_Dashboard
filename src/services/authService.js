import api from './api';

const authService = {
  login: (email, password) =>
    api.post('/api/admin-auth/login', { email, password }),

  getMe: () => api.get('/api/admin-auth/adminme'),

  getAdminList: () => api.get('/api/admin-auth/adminlist'),

  createAdmin: (payload) => api.post('/api/admin-auth/admincreate', payload),

  deactivateAdmin: (adminId) =>
    api.patch(`/api/admin-auth/admin/${adminId}/deactivate`),

  changePassword: (currentPassword, newPassword) =>
    api.patch('/api/admin-auth/admin/change-password', { currentPassword, newPassword }),
};

export default authService;
