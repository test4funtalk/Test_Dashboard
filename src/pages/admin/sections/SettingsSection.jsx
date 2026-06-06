import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { changePassword, resetChangePasswordStatus } from '../../../store/slices/authSlice';

const SettingsSection = () => {
  const dispatch = useDispatch();
  const { changePasswordLoading, changePasswordError, changePasswordSuccess } = useSelector((s) => s.auth);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [localPwErr, setLocalPwErr] = useState('');

  useEffect(() => {
    if (changePasswordSuccess) {
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      const t = setTimeout(() => dispatch(resetChangePasswordStatus()), 4000);
      return () => clearTimeout(t);
    }
  }, [changePasswordSuccess, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalPwErr('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setLocalPwErr('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setLocalPwErr('Password must be at least 8 characters');
      return;
    }
    dispatch(changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }));
  };

  const FIELDS = [
    { key: 'currentPassword', label: 'Current Password', field: 'current' },
    { key: 'newPassword', label: 'New Password', field: 'new' },
    { key: 'confirmPassword', label: 'Confirm New Password', field: 'confirm' },
  ];

  return (
    <div className="max-w-lg">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100">
            <Key size={18} className="text-neutral-600" />
          </div>
          <div>
            <p className="font-semibold">Change Password</p>
            <p className="text-sm text-neutral-400">Update your admin account password</p>
          </div>
        </div>

        {changePasswordSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle size={16} /> Password changed successfully
          </div>
        )}

        {(changePasswordError || localPwErr) && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertCircle size={16} /> {changePasswordError || localPwErr}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {FIELDS.map(({ key, label, field }) => (
            <div key={key}>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
              <div className="flex items-center overflow-hidden rounded-xl border border-neutral-200 focus-within:border-neutral-400">
                <input
                  type={showPw[field] ? 'text' : 'password'}
                  required
                  value={pwForm[key]}
                  onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => ({ ...p, [field]: !p[field] }))}
                  className="px-3 text-neutral-400 hover:text-neutral-700"
                >
                  {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={changePasswordLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-medium text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePasswordLoading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            {changePasswordLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsSection;
