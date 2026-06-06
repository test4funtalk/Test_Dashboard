import api from './api';

const userService = {
  getUsers: (params) =>
    api.get('/api/profile/admin/users', { params }),

  updateUser: (userId, payload) =>
    api.put(`/api/profile/admin/updateUser/${userId}`, payload),

  deleteUser: (userId) =>
    api.delete(`/api/profile/admin/deleteUser/${userId}`),

  changeToHost: (userId) =>
    api.patch(`/api/profile/admin/change-to-host/${userId}`),
};

export default userService;
