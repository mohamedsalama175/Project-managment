import React, { useState, useEffect } from 'react';
import { apiClient, ApiRole } from '../../api/client';

export const CreateUser: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('field_engineer');
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getRoles()
      .then((res) => {
        if (res.data) setRoles(res.data);
      })
      .catch(() => {
        setRoles([
          { id: '1', name: 'admin', displayName: 'Administrator', isSystem: true, usersCount: 1, permissions: [] },
          { id: '2', name: 'field_engineer', displayName: 'Field Engineer', isSystem: false, usersCount: 0, permissions: [] },
          { id: '3', name: 'project_manager', displayName: 'Project Manager', isSystem: false, usersCount: 0, permissions: [] },
          { id: '4', name: 'contributor', displayName: 'Contributor', isSystem: false, usersCount: 0, permissions: [] },
        ]);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await apiClient.createUser({
        name,
        email,
        password,
        jobTitle: 'Field Engineer',
        department: 'Operations',
        roles: [role],
        weeklyCapacityHours: 40,
        status: 'active',
      });
      setMessage('User created successfully!');
      setName('');
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Failed to create user'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mt-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create User</h2>
      {message && <div className="mb-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.displayName || r.name}
              </option>
            ))}
          </select>
          {role === 'field_engineer' && (
            <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              Restricted to assigned tasks only. Cannot create projects, view financials, or access admin settings.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
};

export default CreateUser;
