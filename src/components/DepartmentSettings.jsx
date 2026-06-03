import React, { useState } from 'react'

export default function DepartmentSettings({ departments, onSave, onRemove }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [escalationEmail, setEscalationEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('Name, username, and password are required.')
      return
    }
    setError('')
    onSave({ name: name.trim(), username: username.trim(), password: password.trim(), primaryEmail: primaryEmail.trim(), escalationEmail: escalationEmail.trim() })
    setName('')
    setUsername('')
    setPassword('')
    setPrimaryEmail('')
    setEscalationEmail('')
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-600">Department Settings</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Onboard a new department</h2>
        </div>
        <p className="text-sm text-slate-600">Create login credentials for department users.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm text-slate-700">
          Department Name
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="HRBP, Compliance, Finance" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="username" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="password" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Primary Notification Email
          <input value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="it-support@company.com" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          Escalation Email
          <input value={escalationEmail} onChange={(e) => setEscalationEmail(e.target.value)} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="it-head@company.com" />
        </label>
        <div className="sm:col-span-3">
          {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" className="mt-2 rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">Create Department</button>
        </div>
      </form>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-700">Existing Departments</h3>
        {departments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No departments have been onboarded yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {departments.map((dept) => (
              <div key={dept.id} className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{dept.name}</div>
                  <div className="text-sm text-slate-500">username: {dept.username}</div>
                  <div className="text-sm text-slate-500">primary: {dept.primaryEmail || '—'}</div>
                  <div className="text-sm text-slate-500">escalation: {dept.escalationEmail || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => onRemove(dept.id)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
