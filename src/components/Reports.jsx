import { useState, useMemo } from 'react'

export default function Reports({ tickets, childTickets, departments, getNow }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')

  const total = tickets.length
  const open = tickets.filter(t => t.status === 'Open').length
  const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Done').length

  const allDeptNames = useMemo(() => {
    const fromDepts = departments.map(d => d.name)
    const fromTickets = childTickets.map(t => t.department).filter(Boolean)
    return [...new Set([...fromDepts, ...fromTickets])]
  }, [departments, childTickets])

  const breaches = useMemo(() =>
    childTickets.filter(t => t.dueDate && new Date(t.dueDate) < getNow() && !['Resolved', 'Done', 'Rejected'].includes(t.status)),
  [childTickets, getNow])

  const handleExportCSV = () => {
    let filtered = [...childTickets]

    if (fromDate) {
      const fromTime = new Date(fromDate).getTime()
      filtered = filtered.filter(t => new Date(t.createdAt).getTime() >= fromTime)
    }
    if (toDate) {
      const toTime = new Date(toDate).setHours(23, 59, 59, 999)
      filtered = filtered.filter(t => new Date(t.createdAt).getTime() <= toTime)
    }
    if (selectedDept !== 'All') {
      filtered = filtered.filter(t => t.department === selectedDept)
    }

    const csvRows = [
      ['Ticket ID', 'Parent ID', 'Department', 'Title', 'Status', 'Grade', 'TAT Days', 'Due Date', 'Created At', 'Remarks']
    ]

    filtered.forEach(t => {
      const remarks = (t.auditTrail || []).map(e => e.remark).filter(Boolean).join(' | ')
      csvRows.push([
        `"${t.id || ''}"`,
        `"${t.parentId || ''}"`,
        `"${t.department || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.status || ''}"`,
        `"${t.grade || '—'}"`,
        `"${t.tatDays || ''}"`,
        `"${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}"`,
        `"${t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}"`,
        `"${remarks || '—'}"`,
      ])
    })

    const csvContent = '\uFEFF' + csvRows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `HR_Tickets_Report_${new Date().toISOString().slice(0, 10)}.csv`)
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
        <p className="mt-1 text-sm text-slate-500">Filter and export child tickets as a CSV spreadsheet.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase">Department</label>
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:outline-none">
              <option value="All">All Departments</option>
              {allDeptNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleExportCSV}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 text-sm shadow-sm transition duration-200">
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
