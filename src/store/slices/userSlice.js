import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import userService from '../../services/userService';

// ─── thunks ───────────────────────────────────────────────────────────────────

export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await userService.getUsers(params);
      return { ...data.data, role: params?.role };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
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

export const adjustWallet = createAsyncThunk(
  'user/adjustWallet',
  async ({ userId, adjustment, reason }, { rejectWithValue }) => {
    try {
      const { data } = await userService.adjustWallet(userId, { adjustment, reason });
      return { userId, wallet: data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to adjust wallet');
    }
  }
);

// ─── slice ────────────────────────────────────────────────────────────────────

const initialState = {
  users: [],
  hosts: [],
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, limit: 20, pages: 0 },

  stats: { totalUsers: 0, activeUsers: 0, verifiedUsers: 0, onlineUsers: 0, totalHosts: 0 },

  updateLoading: false,
  updateError: null,
  updateSuccess: false,

  deletingId: null,
  deleteError: null,

  promotingId: null,
  promoteError: null,

  adjustLoading: false,
  adjustError: null,
  adjustSuccess: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetUpdateStatus(state) {
      state.updateSuccess = false;
      state.updateError = null;
    },
    resetAdjustStatus(state) {
      state.adjustSuccess = false;
      state.adjustError = null;
    },
    clearUserErrors(state) {
      state.error = null;
      state.deleteError = null;
      state.promoteError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchUsers — single endpoint returns a mixed-role page; split it client-side
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        const all = action.payload?.users ?? [];
        const { role } = action.payload;
        if (role === 'host') {
          state.hosts = all;
        } else if (role === 'user') {
          state.users = all;
        } else {
          // no role filter was sent — fall back to splitting the mixed page
          state.users = all.filter((u) => u.role === 'user');
          state.hosts = all.filter((u) => u.role === 'host');
        }
        state.pagination = action.payload?.pagination ?? state.pagination;
        if (action.payload?.stats) state.stats = action.payload.stats;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
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
        if (state.pagination.total > 0) state.pagination.total -= 1;
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

    // adjustWallet
    builder
      .addCase(adjustWallet.pending, (state) => {
        state.adjustLoading = true;
        state.adjustError = null;
        state.adjustSuccess = false;
      })
      .addCase(adjustWallet.fulfilled, (state) => {
        state.adjustLoading = false;
        state.adjustSuccess = true;
      })
      .addCase(adjustWallet.rejected, (state, action) => {
        state.adjustLoading = false;
        state.adjustError = action.payload;
      });
  },
});

export const { resetUpdateStatus, resetAdjustStatus, clearUserErrors } = userSlice.actions;
export default userSlice.reducer;
