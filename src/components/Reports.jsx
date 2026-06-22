import { useState, useMemo } from 'react'

function getAuditTimestamp(auditTrail, actions) {
  let trail = auditTrail
  if (typeof trail === 'string') { try { trail = JSON.parse(trail) } catch { trail = [] } }
  if (!Array.isArray(trail) || trail.length === 0) return null
  const entry = [...trail].reverse().find(e => actions.includes(e.action))
  return entry ? entry.time : null
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = d.toLocaleString('en-IN', { month: 'short' })
  const yr = d.getFullYear()
  const hr = d.getHours()
  const min = String(d.getMinutes()).padStart(2, '0')
  const sec = String(d.getSeconds()).padStart(2, '0')
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const hr12 = hr % 12 || 12
  return `${day} ${mon} ${yr}, ${String(hr12).padStart(2, '0')}:${min}:${sec} ${ampm}`
}

export default function Reports({ tickets, childTickets, departments, getNow }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const total = tickets.length
  const open = tickets.filter(t => t.status === 'Open').length
  const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Done').length

  const breaches = useMemo(() =>
    childTickets.filter(t => t.dueDate && new Date(t.dueDate) < getNow() && !['Resolved', 'Done', 'Rejected'].includes(t.status)),
  [childTickets, getNow])

  const filteredCount = useMemo(() => {
    let list = [...tickets]
    if (fromDate) { list = list.filter(t => new Date(t.createdAt).getTime() >= new Date(fromDate).getTime()) }
    if (toDate) { list = list.filter(t => new Date(t.createdAt).getTime() <= new Date(toDate).setHours(23, 59, 59, 999)) }
    return list.length
  }, [tickets, fromDate, toDate])

  const handleExportCSV = () => {
    let filtered = [...tickets]

    if (fromDate) {
      const fromTime = new Date(fromDate).getTime()
      filtered = filtered.filter(t => new Date(t.createdAt).getTime() >= fromTime)
    }
    if (toDate) {
      const toTime = new Date(toDate).setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.createdAt).getTime() <= toTime)
    }

    const csvRows = [
      ['ID', 'Title', 'Category', 'Status', 'Created At', 'Resolved At', 'Closed At']
    ]

    filtered.forEach(t => {
      const resolvedAt = getAuditTimestamp(t.auditTrail, ['Resolved', 'Done'])
      const closedAt = getAuditTimestamp(t.auditTrail, ['Rejected', 'Resolved', 'Done'])
      csvRows.push([
        `"${t.id || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.category || ''}"`,
        `"${t.status || ''}"`,
        `"${fmtDate(t.createdAt)}"`,
        `"${resolvedAt ? fmtDate(resolvedAt) : ''}"`,
        `"${closedAt ? fmtDate(closedAt) : ''}"`,
      ])
    })

    const csvContent = '\uFEFF' + csvRows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Parent_Tickets_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const deptDistribution = useMemo(() => {
    const counts = {}
    childTickets.forEach(t => { if (t.department) counts[t.department] = (counts[t.department] || 0) + 1 })
    return counts
  }, [childTickets])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Parent Tickets</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{total}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Open</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{open}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Resolved / Closed</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{resolved}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Excel Report Exporter</h3>
        <p className="mt-1 text-sm text-slate-500">Filter and export parent tickets with creation, resolution, and closure timestamps.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            {filteredCount} ticket(s) will be exported
          </span>
        </div>
        <button onClick={handleExportCSV}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 text-sm shadow-sm transition duration-200">
          Export to CSV
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Child Ticket Distribution by Department</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(deptDistribution).map(([d, count]) => (
            <div key={d} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 min-w-[120px] shadow-sm">
              <div className="text-xs text-slate-500 font-medium">{d}</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{count}</div>
            </div>
          ))}
          {Object.keys(deptDistribution).length === 0 && (
            <div className="text-xs text-slate-500 italic">No child tickets recorded yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-3">SLA / TAT Breaches (Active Overdue Tickets)</h4>
        <div className="space-y-2">
          {breaches.length === 0
            ? <div className="text-xs text-slate-500 italic">No SLA breaches recorded.</div>
            : breaches.map(t => (
              <div key={t.id} className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-800 flex justify-between items-center">
                <span className="font-semibold">{t.title}</span>
                <span className="text-xs font-bold bg-rose-200 text-rose-900 px-3 py-1 rounded-full">Overdue (Due {new Date(t.dueDate).toLocaleDateString()})</span>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900">Simulate Date Offset for SLA/TAT Testing</h4>
        <p className="text-xs text-slate-500 mt-0.5">Move forward in time to test overdue escalations.</p>
        <div className="mt-3 flex items-center gap-3">
          <input type="number" defaultValue={parseInt(localStorage.getItem('hr_time_offset') || '0', 10)}
            onChange={e => { localStorage.setItem('hr_time_offset', String(parseInt(e.target.value || '0', 10))) }}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 font-bold focus:outline-none w-28" />
          <div className="text-xs text-slate-500 font-semibold">days offset from today</div>
        </div>
      </div>
    </div>
  )
}
