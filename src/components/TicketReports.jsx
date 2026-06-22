import { useState, useMemo } from 'react'

const STATUS_COLORS = {
  Open: 'bg-amber-400',
  Received: 'bg-amber-400',
  'In Progress': 'bg-sky-500',
  Done: 'bg-emerald-500',
  Resolved: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
}

const CATEGORY_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-pink-500',
]

function getResolvedDate(ticket) {
  if (!ticket.auditTrail) return null
  const entry = [...ticket.auditTrail].reverse().find(e => e.action === 'Resolved' || e.action === 'Done')
  return entry ? entry.time : null
}

function calcDuration(created, resolved) {
  if (!created || !resolved) return null
  const ms = new Date(resolved) - new Date(created)
  if (ms < 0) return null
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${mins}m`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TicketReports({ tickets, title, subtitle }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const filteredTickets = useMemo(() => {
    let list = [...tickets]
    if (fromDate) {
      const fromTime = new Date(fromDate).getTime()
      list = list.filter(t => new Date(t.createdAt).getTime() >= fromTime)
    }
    if (toDate) {
      const toTime = new Date(toDate).setHours(23, 59, 59, 999)
      list = list.filter(t => new Date(t.createdAt).getTime() <= toTime)
    }
    if (statusFilter !== 'All') list = list.filter(t => t.status === statusFilter)
    if (categoryFilter !== 'All') list = list.filter(t => t.category === categoryFilter)
    return list
  }, [tickets, fromDate, toDate, statusFilter, categoryFilter])

  const allStatuses = useMemo(() => [...new Set(tickets.map(t => t.status).filter(Boolean))].sort(), [tickets])
  const allCategories = useMemo(() => [...new Set(tickets.map(t => t.category).filter(Boolean))].sort(), [tickets])

  const statusReport = useMemo(() => {
    const counts = {}
    filteredTickets.forEach(t => {
      const s = t.status || 'Unknown'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count, pct: filteredTickets.length ? Math.round((count / filteredTickets.length) * 100) : 0 }))
  }, [filteredTickets])

  const categoryReport = useMemo(() => {
    const counts = {}
    filteredTickets.forEach(t => {
      const c = t.category || 'Unknown'
      counts[c] = (counts[c] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count, pct: filteredTickets.length ? Math.round((count / filteredTickets.length) * 100) : 0 }))
  }, [filteredTickets])

  const detailedRows = useMemo(() => {
    return filteredTickets.map(t => {
      const resolvedAt = getResolvedDate(t)
      return {
        id: t.id,
        title: t.title,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
        resolvedAt,
        duration: calcDuration(t.createdAt, resolvedAt),
      }
    })
  }, [filteredTickets])

  const avgDuration = useMemo(() => {
    const durations = detailedRows.filter(r => r.duration).map(r => {
      const created = new Date(r.createdAt)
      const resolved = new Date(r.resolvedAt)
      return resolved - created
    })
    if (durations.length === 0) return null
    const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length
    const days = Math.floor(avgMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((avgMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m`
  }, [detailedRows])

  const maxStatus = statusReport.length > 0 ? statusReport[0].count : 1
  const maxCategory = categoryReport.length > 0 ? categoryReport[0].count : 1

  const handleExportCSV = () => {
    const rows = [['ID', 'Title', 'Category', 'Status', 'Created At', 'Resolved At', 'Duration']]
    detailedRows.forEach(r => {
      rows.push([
        `"${r.id || ''}"`,
        `"${(r.title || '').replace(/"/g, '""')}"`,
        `"${r.category || ''}"`,
        `"${r.status || ''}"`,
        `"${r.createdAt ? fmtDate(r.createdAt) : ''}"`,
        `"${r.resolvedAt ? fmtDate(r.resolvedAt) : ''}"`,
        `"${r.duration || 'In Progress'}"`,
      ])
    })
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ticket_Detailed_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">{title || 'Ticket Reports'}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle || 'Status-wise, category-wise breakdowns and detailed ticket report with date range filtering.'}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="All">All Statuses</option>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="All">All Categories</option>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Showing {filteredTickets.length} of {tickets.length} ticket(s)
          </span>
          <button onClick={() => { setFromDate(''); setToDate(''); setStatusFilter('All'); setCategoryFilter('All') }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition">
            Clear All Filters
          </button>
          <button onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-xs shadow-sm transition">
            Export Detailed CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tickets</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{filteredTickets.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Resolved</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{filteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Done').length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Active</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{filteredTickets.filter(t => !['Resolved', 'Done', 'Rejected'].includes(t.status)).length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Avg. Resolution Time</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{avgDuration || '—'}</div>
        </div>
      </div>

      {/* Status-wise Report */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Status-wise Report</h4>
        {statusReport.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No tickets found for the selected filters.</div>
        ) : (
          <div className="space-y-3">
            {statusReport.map(({ status, count, pct }) => (
              <div key={status} className="flex items-center gap-4">
                <span className="w-28 text-xs font-semibold text-slate-700 shrink-0">{status}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-xl overflow-hidden">
                  <div
                    className={`h-full rounded-xl ${STATUS_COLORS[status] || 'bg-slate-400'} flex items-center justify-end pr-3 transition-all duration-500`}
                    style={{ width: `${Math.max((count / maxStatus) * 100, 8)}%` }}
                  >
                    <span className="text-[11px] font-bold text-white">{count}</span>
                  </div>
                </div>
                <span className="w-12 text-right text-xs font-bold text-slate-500">{pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category-wise Report */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Category-wise Report</h4>
        {categoryReport.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No tickets found for the selected filters.</div>
        ) : (
          <div className="space-y-3">
            {categoryReport.map(({ category, count, pct }, idx) => (
              <div key={category} className="flex items-center gap-4">
                <span className="w-28 text-xs font-semibold text-slate-700 shrink-0">{category}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-xl overflow-hidden">
                  <div
                    className={`h-full rounded-xl ${CATEGORY_COLORS[idx % CATEGORY_COLORS.length]} flex items-center justify-end pr-3 transition-all duration-500`}
                    style={{ width: `${Math.max((count / maxCategory) * 100, 8)}%` }}
                  >
                    <span className="text-[11px] font-bold text-white">{count}</span>
                  </div>
                </div>
                <span className="w-12 text-right text-xs font-bold text-slate-500">{pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Ticket Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-1">Detailed Ticket Report</h4>
        <p className="text-xs text-slate-500 mb-4">Created date, resolved date, and resolution time for every ticket.</p>

        {detailedRows.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No tickets found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 pr-3 font-semibold text-slate-600">ID</th>
                  <th className="pb-2 pr-3 font-semibold text-slate-600">Title</th>
                  <th className="pb-2 pr-3 font-semibold text-slate-600">Category</th>
                  <th className="pb-2 pr-3 font-semibold text-slate-600">Status</th>
                  <th className="pb-2 pr-3 font-semibold text-slate-600">Created At</th>
                  <th className="pb-2 pr-3 font-semibold text-slate-600">Resolved At</th>
                  <th className="pb-2 font-semibold text-slate-600">Duration</th>
                </tr>
              </thead>
              <tbody>
                {detailedRows.map(r => {
                  const isOpen = !['Resolved', 'Done', 'Rejected'].includes(r.status)
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 pr-3 font-mono text-slate-500">{r.id}</td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-900 max-w-[200px] truncate">{r.title}</td>
                      <td className="py-2.5 pr-3 text-slate-700">{r.category}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[r.status] || 'bg-slate-200'} ${['Done', 'Resolved'].includes(r.status) ? 'text-white' : 'text-slate-900'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-700 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                      <td className="py-2.5 pr-3 text-slate-700 whitespace-nowrap">{r.resolvedAt ? fmtDate(r.resolvedAt) : <span className="text-slate-400 italic">Pending</span>}</td>
                      <td className="py-2.5 font-semibold whitespace-nowrap">
                        {r.duration ? (
                          <span className="text-emerald-700">{r.duration}</span>
                        ) : isOpen ? (
                          <span className="text-amber-600 italic">In Progress</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
