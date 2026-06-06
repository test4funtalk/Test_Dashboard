import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import userService from '../../services/userService';

// ─── thunks ───────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await userService.getUsers({ ...params, role: 'user' });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const fetchHosts = createAsyncThunk(
  'user/fetchHosts',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await userService.getUsers({ ...params, role: 'host' });
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch hosts');
    }
  }
);

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async ({ userId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await userService.updateUser(userId, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update user');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'user/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      await userService.deleteUser(userId);
      return userId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete user');
    }
  }
);

export const changeToHost = createAsyncThunk(
  'user/changeToHost',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await userService.changeToHost(userId);
      return { userId, user: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to promote to host');
    }
  }
);

// ─── slice ────────────────────────────────────────────────────────────────────

const initialState = {
  users: [],
  usersLoading: false,
  usersError: null,
  usersPagination: { total: 0, page: 1, limit: 20, pages: 0 },

  hosts: [],
  hostsLoading: false,
  hostsError: null,
  hostsPagination: { total: 0, page: 1, limit: 20, pages: 0 },

  stats: { totalUsers: 0, activeUsers: 0, verifiedUsers: 0, onlineUsers: 0, totalHosts: 0 },

  updateLoading: false,
  updateError: null,
  updateSuccess: false,

  deletingId: null,
  deleteError: null,

  promotingId: null,
  promoteError: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetUpdateStatus(state) {
      state.updateSuccess = false;
      state.updateError = null;
    },
    clearUserErrors(state) {
      state.usersError = null;
      state.hostsError = null;
      state.deleteError = null;
      state.promoteError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchUsers
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.usersLoading = true;
        state.usersError = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersLoading = false;
        state.users = action.payload?.users ?? [];
        state.usersPagination = action.payload?.pagination ?? state.usersPagination;
        if (action.payload?.stats) state.stats = action.payload.stats;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersLoading = false;
        state.usersError = action.payload;
      });

    // fetchHosts
    builder
      .addCase(fetchHosts.pending, (state) => {
        state.hostsLoading = true;
        state.hostsError = null;
      })
      .addCase(fetchHosts.fulfilled, (state, action) => {
        state.hostsLoading = false;
        state.hosts = action.payload?.users ?? [];
        state.hostsPagination = action.payload?.pagination ?? state.hostsPagination;
        if (action.payload?.stats) state.stats = action.payload.stats;
      })
      .addCase(fetchHosts.rejected, (state, action) => {
        state.hostsLoading = false;
        state.hostsError = action.payload;
      });

    // updateUser
    builder
      .addCase(updateUser.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updateLoading = false;
        state.updateSuccess = true;
        const updated = action.payload;
        if (!updated) return;
        const uIdx = state.users.findIndex((u) => u._id === updated._id);
        if (uIdx !== -1) state.users[uIdx] = updated;
        const hIdx = state.hosts.findIndex((h) => h._id === updated._id);
        if (hIdx !== -1) state.hosts[hIdx] = updated;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
      });

    // deleteUser
    builder
      .addCase(deleteUser.pending, (state, action) => {
        state.deletingId = action.meta.arg;
        state.deleteError = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deletingId = null;
        state.users = state.users.filter((u) => u._id !== action.payload);
        state.hosts = state.hosts.filter((h) => h._id !== action.payload);
        if (state.usersPagination.total > 0) state.usersPagination.total -= 1;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deletingId = null;
        state.deleteError = action.payload;
      });

    // changeToHost
    builder
      .addCase(changeToHost.pending, (state, action) => {
        state.promotingId = action.meta.arg;
        state.promoteError = null;
      })
      .addCase(changeToHost.fulfilled, (state, action) => {
        state.promotingId = null;
        state.users = state.users.filter((u) => u._id !== action.payload.userId);
        state.stats.totalHosts = (state.stats.totalHosts || 0) + 1;
      })
      .addCase(changeToHost.rejected, (state, action) => {
        state.promotingId = null;
        state.promoteError = action.payload;
      });
  },
});

export const { resetUpdateStatus, clearUserErrors } = userSlice.actions;
export default userSlice.reducer;
