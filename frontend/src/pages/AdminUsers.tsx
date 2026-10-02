import { useEffect, useState } from 'react';
import { Crown, Pencil, ShieldAlert, ShieldCheck, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { adminUserService } from '../services/admin-user.service';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { User, UserRole } from '../types/user.types';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { show, confirm } = useToast();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  // Create form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  // Edit modal
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STAFF');
  const [editSaving, setEditSaving] = useState(false);
  // Shared UI state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const load = () => {
    adminUserService.list()
      .then((result) => setUsers(result.data))
      .catch((issue) => setMessage(issue instanceof Error ? issue.message : 'Unable to load users.'));
  };

  useEffect(load, []);

  // ── Create ──────────────────────────────────────────────────────────────
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const result = await adminUserService.create({ fullName, email, password, role: role as 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' });
      setUsers((current) => [result.data, ...current]);
      setFullName(''); setEmail(''); setPassword(''); setRole('STAFF');
      show('Account created successfully.', 'success');
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to create account.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const openEdit = (target: User) => {
    setEditTarget(target);
    setEditName(target.fullName);
    setEditRole(target.role);
    setMessage('');
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setMessage('');
    try {
      const result = await adminUserService.update(editTarget.id, { fullName: editName, role: editRole });
      setUsers((current) => current.map((u) => u.id === editTarget.id ? result.data : u));
      setEditTarget(null);
      show('Account updated successfully.', 'success');
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to update account.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const remove = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) { show('You cannot delete your own account.', 'warning'); return; }
    if ((targetUser.role === 'SUPER_ADMIN' || targetUser.role === 'ADMIN') && !isSuperAdmin) {
      show('Only the Super Administrator can delete Admin accounts.', 'warning');
      return;
    }
    if (!(await confirm({ title: 'Delete this account?', message: `${targetUser.fullName} (${targetUser.email}) will be removed permanently. This cannot be undone.`, confirmLabel: 'Delete account' }))) return;
    setDeletingId(targetUser.id);
    setMessage('');
    try {
      await adminUserService.remove(targetUser.id);
      setUsers((current) => current.filter((item) => item.id !== targetUser.id));
      show('Account deleted.', 'success');
    } catch (issue) {
      show(issue instanceof Error ? issue.message : 'Unable to delete account.', 'error');
    } finally {
      setDeletingId('');
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredUsers = users.filter((item) => {
    const matchSearch =
      !search ||
      item.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || item.role === roleFilter;
    return matchSearch && matchRole;
  });

  const countAdmin = users.filter((u) => u.role === 'ADMIN').length;
  const countStaff = users.filter((u) => u.role === 'STAFF').length;

  const roleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: 12, border: '1px solid #fde68a' }}><Crown style={{ width: 13 }} /> Super Admin</span>;
      case 'ADMIN':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#e0e7ff', color: '#3730a3', fontWeight: 600, fontSize: 12, border: '1px solid #c7d2fe' }}><ShieldCheck style={{ width: 13 }} /> Administrator</span>;
      case 'STAFF':
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#dcfce7', color: '#166534', fontWeight: 600, fontSize: 12, border: '1px solid #bbf7d0' }}><UserCheck style={{ width: 13 }} /> Staff</span>;
      default:
        return <span className="pill">Student</span>;
    }
  };

  return (
    <section className="admin-page">

      {/* Header */}
      <div className="admin-title">
        <div>
          <span className="eyebrow">USER MANAGEMENT</span>
          <h1>Users &amp; Roles</h1>
          <p className="admin-lead">
            {isSuperAdmin
              ? 'As Super Admin you manage all Administrator and Staff accounts.'
              : 'Manage Staff accounts. Super Admin manages Administrator accounts.'}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="metric-grid" style={{ marginBottom: 24 }}>
        {isSuperAdmin && (
          <article>
            <ShieldCheck style={{ color: '#4f46e5' }} />
            <span>Administrators</span>
            <b>{countAdmin}</b>
          </article>
        )}
        <article>
          <UserCheck style={{ color: '#16a34a' }} />
          <span>Staff Members</span>
          <b>{countStaff}</b>
        </article>
      </div>

      {/* Security notice for ADMIN */}
      {!isSuperAdmin && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#1e40af' }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <div>
            <b>Super Admin &amp; Administrator accounts are hidden</b>
            <p style={{ margin: '2px 0 0', color: '#3b82f6' }}>
              Only Staff accounts are visible here. Contact Super Admin to manage Administrator accounts.
            </p>
          </div>
        </div>
      )}

      {/* Create Form */}
      <form className="admin-panel profile-form" onSubmit={submit}>
        <div className="settings-section full">
          <UserPlus />
          <div>
            <h2>Create {isSuperAdmin ? 'Admin or Staff' : 'Staff'} account</h2>
            <p>{isSuperAdmin ? 'Super Admin can create Administrator and Staff accounts.' : 'Add new staff members who handle event check-in.'}</p>
          </div>
        </div>

        <label>Full name
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Maxamed Cali" />
        </label>
        <label>Email address
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </label>
        <label>Password
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </label>
        <label>Role / Darajada
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="STAFF">Staff (Shaqaale — Check-in only)</option>
            {isSuperAdmin && <option value="ADMIN">Administrator (Maamule)</option>}
          </select>
        </label>

        {message && (
          <div className={`status-bar ${message.toLowerCase().includes('success') || message === 'Account deleted.' ? 'status-bar-pass' : 'status-bar-fail'} full`}>
            <b>{message}</b>
          </div>
        )}

        <button className="button" disabled={saving}><UserPlus />{saving ? 'Creating…' : 'Create account'}</button>
      </form>

      {/* Users Table */}
      <div className="admin-panel">
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="eyebrow">{isSuperAdmin ? 'ADMIN & STAFF ACCOUNTS' : 'STAFF ACCOUNTS'}</span>
            <h2><Users /> {isSuperAdmin ? 'Administrators & Staff' : 'Staff members'} ({filteredUsers.length})</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="search"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
            />
            {isSuperAdmin && (
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Administrators</option>
                <option value="STAFF">Staff</option>
              </select>
            )}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => {
                const isSelf = item.id === currentUser?.id;
                const isProtected = (item.role === 'SUPER_ADMIN' || item.role === 'ADMIN') && !isSuperAdmin;
                const canEdit = !isSelf && !isProtected;

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b>{item.fullName}</b>
                        {isSelf && <small style={{ padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280', fontSize: 11 }}>(You)</small>}
                      </div>
                    </td>
                    <td>{item.email}</td>
                    <td>{roleBadge(item.role)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isSelf ? (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Current user</span>
                      ) : isProtected ? (
                        <span style={{ fontSize: 12, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ShieldAlert style={{ width: 14 }} /> Protected
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          {canEdit && (
                            <button
                              onClick={() => openEdit(item)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Pencil style={{ width: 13 }} /> Edit
                            </button>
                          )}
                          <button
                            className="user-delete-button"
                            onClick={() => void remove(item)}
                            disabled={deletingId === item.id}
                          >
                            <Trash2 />
                            {deletingId === item.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '30px 15px', color: '#6b7280' }}>
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgb(21 26 70 / .64)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 24 }}
          onMouseDown={() => setEditTarget(null)}
        >
          <form
            className="admin-panel profile-form"
            style={{ width: 'min(480px,100%)', margin: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={saveEdit}
          >
            <div className="settings-section full" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Pencil />
                <div>
                  <h2 style={{ margin: 0 }}>Edit account</h2>
                  <p style={{ margin: 0 }}>{editTarget.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#667085', padding: 4 }}
                aria-label="Close"
              >
                <X style={{ width: 22 }} />
              </button>
            </div>

            <label>Full name
              <input required value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>

            <label>Role / Darajada
              <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}>
                <option value="STAFF">Staff (Shaqaale — Check-in only)</option>
                {isSuperAdmin && <option value="ADMIN">Administrator (Maamule)</option>}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10, gridColumn: '1/-1' }}>
              <button type="button" className="button button-outline" onClick={() => setEditTarget(null)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="button" disabled={editSaving} style={{ flex: 1 }}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
