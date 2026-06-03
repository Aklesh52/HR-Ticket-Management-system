import React from 'react'

export default function Reports({ tickets, departments, getNow, setTimeOffsetDays }) {
  const total = tickets.length
  const open = tickets.filter(t => t.status === 'Open').length
  const resolved = tickets.filter(t => t.status === 'Resolved').length

  const departmentNames = Array.from(new Set([
    ...departments.map((d) => d.name),
    ...tickets.map((t) => t.department || t.category).filter(Boolean),
  ]))

  const breaches = tickets.filter(t => t.type === 'child' && t.dueDate && new Date(t.dueDate) < getNow() && t.status !== 'Resolved')

  return (
    <div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Total Tickets</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{total}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Open</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{open}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Resolved</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{resolved}</div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700">Department distribution</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {departmentNames.map((d) => (
            <div key={d} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <div className="text-slate-500">{d}</div>
              <div className="font-bold text-slate-900">{tickets.filter(t => (t.department || t.category) === d).length}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700">TAT breaches (children)</h4>
        <div className="mt-2 space-y-2">
          {breaches.length === 0 ? (
            <div className="text-sm text-slate-500">No breaches.</div>
          ) : (
            breaches.map(t => (
              <div key={t.id} className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{t.title} • Due {new Date(t.dueDate).toLocaleDateString()}</div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-700">Simulate date</h4>
        <div className="mt-2 flex items-center gap-2">
          <input type="number" defaultValue={parseInt(localStorage.getItem('hr_ticket_time_offset_days') || '0', 10)} onChange={(e) => setTimeOffsetDays(parseInt(e.target.value || '0', 10))} className="rounded-2xl border border-slate-200 px-3 py-2" />
          <div className="text-sm text-slate-500">days offset from today</div>
        </div>
      </div>
    </div>
  )
}
