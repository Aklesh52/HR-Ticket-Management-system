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

export default function TicketReports({ tickets, title, subtitle }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

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
    return list
  }, [tickets, fromDate, toDate])

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

  const maxStatus = statusReport.length > 0 ? statusReport[0].count : 1
  const maxCategory = categoryReport.length > 0 ? categoryReport[0].count : 1

  const handleExportCSV = () => {
    const rows = [['ID', 'Title', 'Category', 'Status', 'Created At']]
    filteredTickets.forEach(t => {
      rows.push([
        `"${t.id || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.category || ''}"`,
        `"${t.status || ''}"`,
        `"${t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}"`,
      ])
    })
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ticket_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">{title || 'Ticket Reports'}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle || 'View status-wise and category-wise breakdowns with date filtering.'}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
          <div className="flex items-end">
            <button onClick={() => { setFromDate(''); setToDate('') }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
              Clear Filters
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Showing {filteredTickets.length} of {tickets.length} ticket(s)
          </span>
          <button onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 text-xs shadow-sm transition">
            Export CSV
          </button>
        </div>
      </div>

      {/* Status-wise Report */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Status-wise Report</h4>
        {statusReport.length === 0 ? (
          <div className="text-xs text-slate-500 italic">No tickets found for the selected date range.</div>
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
          <div className="text-xs text-slate-500 italic">No tickets found for the selected date range.</div>
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusReport.map(({ status, count }) => (
          <div key={status} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{status}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
