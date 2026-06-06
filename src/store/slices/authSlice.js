import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

const parseLocalAdmin = () => {
  try {
    const raw = localStorage.getItem('admin');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialState = {
  currentAdmin: parseLocalAdmin(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  adminList: [],
  adminListLoading: false,
  adminListError: null,

  createLoading: false,
  createError: null,
  createSuccess: false,

  deactivatingId: null,
  deactivateError: null,

  changePasswordLoading: false,
  changePasswordError: null,
  changePasswordSuccess: false,
};

export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await authService.login(email, password);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authService.getMe();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

export const fetchAdminList = createAsyncThunk(
  'auth/fetchAdminList',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authService.getAdminList();
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch admin list');
    }
  }
);

export const createAdmin = createAsyncThunk(
  'auth/createAdmin',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await authService.createAdmin(payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create admin');
    }
  }
);

export const deactivateAdmin = createAsyncThunk(
  'auth/deactivateAdmin',
  async (adminId, { rejectWithValue }) => {
    try {
      const { data } = await authService.deactivateAdmin(adminId);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to deactivate admin');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const { data } = await authService.changePassword(currentPassword, newPassword);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to change password');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.currentAdmin = null;
      state.token = null;
      state.isAuthenticated = false;
      state.adminList = [];
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
    },
    resetCreateSuccess(state) {
      state.createSuccess = false;
      state.createError = null;
    },
    resetChangePasswordStatus(state) {
      state.changePasswordSuccess = false;
      state.changePasswordError = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // loginAdmin
    builder
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        const res = action.payload;
        state.token = res.token;
        state.isAuthenticated = true;
        const d = res.data;
        state.currentAdmin = {
          adminId: d.adminId,
          email: d.email,
          isSuperAdmin: d.isSuperAdmin,
          isActive: d.status === 'active',
          lastLogin: d.lastLogin,
          createdAt: d.createdAt,
          updatedAt: d.userUpdatedAt,
          user: {
            _id: d.userId,
            username: d.username,
            phone: d.phone,
            avatar: d.avatar,
            avatarConfig: d.avatarConfig,
            gender: d.gender,
            dob: d.dob,
            role: d.role,
            status: d.status,
            isVerified: d.isVerified,
            motherTongue: d.motherTongue,
            balance: d.balance,
          },
        };
        localStorage.setItem('token', res.token);
        localStorage.setItem('admin', JSON.stringify(state.currentAdmin));
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // fetchMe
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAdmin = action.payload;
        localStorage.setItem('admin', JSON.stringify(action.payload));
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
      });

    // fetchAdminList
    builder
      .addCase(fetchAdminList.pending, (state) => {
        state.adminListLoading = true;
        state.adminListError = null;
      })
      .addCase(fetchAdminList.fulfilled, (state, action) => {
        state.adminListLoading = false;
        state.adminList = action.payload;
      })
      .addCase(fetchAdminList.rejected, (state, action) => {
        state.adminListLoading = false;
        state.adminListError = action.payload;
      });

    // createAdmin
    builder
      .addCase(createAdmin.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
        state.createSuccess = false;
      })
      .addCase(createAdmin.fulfilled, (state) => {
        state.createLoading = false;
        state.createSuccess = true;
      })
      .addCase(createAdmin.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = action.payload;
      });

    // deactivateAdmin
    builder
      .addCase(deactivateAdmin.pending, (state, action) => {
        state.deactivatingId = action.meta.arg;
        state.deactivateError = null;
      })
      .addCase(deactivateAdmin.fulfilled, (state, action) => {
        state.deactivatingId = null;
        // use meta.arg (the adminId passed to the thunk) — payload shape varies by API
        const adminId = action.meta.arg;
        const idx = state.adminList.findIndex((a) => a.adminId === adminId);
        if (idx !== -1) state.adminList[idx] = { ...state.adminList[idx], isActive: false };
      })
      .addCase(deactivateAdmin.rejected, (state, action) => {
        state.deactivatingId = null;
        state.deactivateError = action.payload;
      });

    // changePassword
    builder
      .addCase(changePassword.pending, (state) => {
        state.changePasswordLoading = true;
        state.changePasswordError = null;
        state.changePasswordSuccess = false;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.changePasswordLoading = false;
        state.changePasswordSuccess = true;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.changePasswordLoading = false;
        state.changePasswordError = action.payload;
      });
  },
});

export const { logout, resetCreateSuccess, resetChangePasswordStatus, clearAuthError } =
  authSlice.actions;

export default authSlice.reducer;
