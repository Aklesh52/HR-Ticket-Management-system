import { useEffect, useMemo, useState } from 'react'
import RoleMatrix from './components/RoleMatrix'
import TicketCard from './components/TicketCard'
import Reports from './components/Reports'
import DepartmentSettings from './components/DepartmentSettings'
import ToastList from './components/ToastList'
import AdvancedMatrixSettings from './components/AdvancedMatrixSettings'
import { ROLE_MATRIX } from './config/roleMatrix'

const STORAGE_KEY = 'hr_ticket_management_tickets'
const ROLE_KEY = 'hr_ticket_management_role'
const DEPARTMENTS_KEY = 'hr_ticket_management_departments'
const DEPARTMENT_SESSION_KEY = 'hr_ticket_management_department_session'
const TIME_OFFSET_KEY = 'hr_ticket_time_offset_days'

const categories = ['IT', 'Payroll', 'Leave', 'Onboarding']
const statusOptions = ['All', 'Open', 'In Progress', 'Done', 'Rejected', 'Resolved']

const ROLE_MATRIX_KEY = 'hr_ticket_role_matrix'


function loadSavedTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTickets(tickets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
}

function loadDepartments() {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadRoleMatrix() {
  try {
    const raw = localStorage.getItem(ROLE_MATRIX_KEY)
    return raw ? JSON.parse(raw) : ROLE_MATRIX
  } catch {
    return ROLE_MATRIX
  }
}

function saveRoleMatrix(matrix) {
  localStorage.setItem(ROLE_MATRIX_KEY, JSON.stringify(matrix))
}

function saveDepartments(departments) {
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments))
}

function loadSession() {
  try {
    const raw = localStorage.getItem(DEPARTMENT_SESSION_KEY)
    return raw ? JSON.parse(raw) : { role: '' }
  } catch {
    return { role: '' }
  }
}

export default function App() {
  const [role, setRole] = useState(localStorage.getItem(ROLE_KEY) || '')
  const [tickets, setTickets] = useState([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('IT')
  const [description, setDescription] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [adminView, setAdminView] = useState('tickets')
  const [departments, setDepartments] = useState(loadDepartments())
  const [roleMatrix, setRoleMatrix] = useState(loadRoleMatrix())
  const [departmentId, setDepartmentId] = useState(loadSession().departmentId || '')
  const [deptUsername, setDeptUsername] = useState('')
  const [deptPassword, setDeptPassword] = useState('')
  const [notifications, setNotifications] = useState([])
  const [ticketRemarks, setTicketRemarks] = useState({})

  useEffect(() => {
    setTickets(loadSavedTickets())
  }, [])

  useEffect(() => {
    // ensure time offset is present
    if (!localStorage.getItem(TIME_OFFSET_KEY)) localStorage.setItem(TIME_OFFSET_KEY, '0')
  }, [])

  useEffect(() => {
    if (role) {
      localStorage.setItem(ROLE_KEY, role)
    } else {
      localStorage.removeItem(ROLE_KEY)
    }

    if (departmentId) {
      localStorage.setItem(DEPARTMENT_SESSION_KEY, JSON.stringify({ departmentId }))
    } else {
      localStorage.removeItem(DEPARTMENT_SESSION_KEY)
    }
  }, [role, departmentId])

  useEffect(() => {
    // persist role matrix whenever changed
    saveRoleMatrix(roleMatrix)
  }, [roleMatrix])

  const employeeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.createdBy === 'employee'),
    [tickets]
  )

  const adminTickets = useMemo(() => {
    if (statusFilter === 'All') return tickets
    return tickets.filter((ticket) => ticket.status === statusFilter)
  }, [tickets, statusFilter])

  const handleLogin = (nextRole) => {
    setRole(nextRole)
    setMessage('')
    setError('')
  }

  const handleDepartmentLogin = (event) => {
    event.preventDefault()
    const match = departments.find((dept) => dept.username === deptUsername && dept.password === deptPassword)
    if (!match) {
      setError('Invalid department username or password.')
      setMessage('')
      return
    }
    setRole('department')
    setDepartmentId(match.id)
    setMessage(`Signed in as ${match.name}`)
    setError('')
    setDeptUsername('')
    setDeptPassword('')
  }

  const handleLogout = () => {
    setRole('')
    setDepartmentId('')
    setMessage('')
    setError('')
  }

  const saveDepartment = (department) => {
    if (departments.some((dept) => dept.username === department.username)) {
      setError('A department with this username already exists.')
      setMessage('')
      return
    }
    const nextDepartments = [...departments, { ...department, id: Date.now().toString(), createdAt: new Date().toISOString() }]
    setDepartments(nextDepartments)
    saveDepartments(nextDepartments)
    setError('')
    setMessage('Department onboarded successfully.')
  }

  const removeDepartment = (id) => {
    const nextDepartments = departments.filter((dept) => dept.id !== id)
    setDepartments(nextDepartments)
    saveDepartments(nextDepartments)
    setMessage('Department removed.')
    setError('')
  }

  const addNotification = (message) => {
    const id = Date.now().toString()
    setNotifications((current) => [...current, { id, message }])
    setTimeout(() => {
      setNotifications((current) => current.filter((toast) => toast.id !== id))
    }, 4500)
  }

  const removeNotification = (id) => {
    setNotifications((current) => current.filter((toast) => toast.id !== id))
  }

  const appendAuditEntry = (ticket, action, actor, remark = '') => {
    const entry = {
      time: new Date().toISOString(),
      actor,
      action,
      remark,
    }
    return {
      ...ticket,
      auditTrail: [...(ticket.auditTrail || []), entry],
    }
  }

  const getDepartmentById = (id) => departments.find((dept) => dept.id === id)

  const departmentTickets = useMemo(() => {
    const department = getDepartmentById(departmentId)
    if (!department) return []
    return tickets.filter((ticket) => ticket.type === 'child' && ticket.department === department.name)
  }, [tickets, departmentId, departments])

  const departmentName = getDepartmentById(departmentId)?.name || ''

  const departmentIsActive = role === 'department' && departmentId && departmentName

  const currentActor = role === 'admin' ? 'HR Admin' : role === 'employee' ? 'Employee' : departmentName || 'Department'

  const handleSubmitTicket = (event) => {
    event.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Please complete both title and description.')
      setMessage('')
      return
    }

    // Basic ticket object
    const baseId = Date.now().toString()
    const newTicket = {
      id: baseId,
      title: title.trim(),
      category,
      description: description.trim(),
      status: 'Open',
      createdAt: new Date().toISOString(),
      createdBy: 'employee',
      type: 'single', // single | parent | child
    }

    let nextTickets = [newTicket, ...tickets]

    // If onboarding and a grade is selected, split into parent + children
    if (category === 'Onboarding' && selectedGrade && roleMatrix[selectedGrade]) {
      const matrix = roleMatrix[selectedGrade]
      const parent = { ...newTicket, id: baseId + '-P', type: 'parent', grade: selectedGrade, children: [], createdBy: 'HRBP', auditTrail: [] }
      const children = matrix.required.map((r, idx) => {
        const childId = `${baseId}-C${idx + 1}`
        const due = new Date()
        due.setDate(due.getDate() + (r.tatDays || 1))
        return {
          id: childId,
          parentId: parent.id,
          title: `${parent.title} — ${r.department} tasks`,
          category: r.department,
          department: r.department,
          items: r.items,
          status: 'Open',
          createdAt: new Date().toISOString(),
          dueDate: due.toISOString(),
          tatDays: r.tatDays || 1,
          createdBy: 'HRBP',
          type: 'child',
          auditTrail: [{ time: new Date().toISOString(), actor: 'HRBP', action: 'Created', remark: '' }],
        }
      })

      parent.children = children.map((c) => c.id)
      parent.type = 'parent'
      parent.status = 'Open'
      parent.auditTrail = [{ time: new Date().toISOString(), actor: 'HRBP', action: 'Created', remark: '' }]
      // save: parent + children; ensure parent appears before children
      nextTickets = [parent, ...children, ...tickets]
      children.forEach((child) => {
        const deptObj = departments.find((d) => d.name === child.department)
        const primary = deptObj?.primaryEmail || child.department
        addNotification(`📧 Email Notification sent to ${primary}: Ticket ${child.id} Raised`)
      })
    }

    setTickets(nextTickets)
    saveTickets(nextTickets)
    setTitle('')
    setCategory('IT')
    setDescription('')
    setSelectedGrade('')
    setError('')
    setMessage('Ticket submitted successfully.')
  }

  // grade selection for onboarding tickets
  const [selectedGrade, setSelectedGrade] = useState('')

  const updateTicketStatus = (id, nextStatus, remark = '') => {
    let nextTickets = tickets.map((ticket) => {
      if (ticket.id !== id) return ticket
      const updated = appendAuditEntry({ ...ticket, status: nextStatus }, nextStatus, currentActor, remark)
      return updated
    })

    const changed = nextTickets.find((t) => t.id === id)
    if (changed && changed.type === 'child') {
      const parent = nextTickets.find((t) => t.id === changed.parentId)
      if (parent) {
        const childObjs = nextTickets.filter((t) => parent.children?.includes(t.id))
        const closedStates = ['Done', 'Rejected', 'Resolved']
        const allClosed = childObjs.every((c) => closedStates.includes(c.status))
        if (allClosed && parent.status !== 'Resolved') {
          nextTickets = nextTickets.map((t) =>
            t.id === parent.id ? appendAuditEntry({ ...t, status: 'Resolved' }, 'Resolved', 'System', 'All child tickets closed') : t
          )
          setMessage('All child tickets closed; parent auto-closed.')
        }
      }
    }

    setTickets(nextTickets)
    saveTickets(nextTickets)
    setMessage(`Ticket updated to ${nextStatus}.`)
    setError('')
  }

  const handleDepartmentAction = (ticketId, action) => {
    const remark = (ticketRemarks[ticketId] || '').trim()
    if ((action === 'Done' || action === 'Rejected') && !remark) {
      setError('Please add a remark before marking this ticket as Done or Rejected.')
      setMessage('')
      return
    }
    updateTicketStatus(ticketId, action, remark)
    setTicketRemarks((prev) => ({ ...prev, [ticketId]: '' }))
  }

  const forceEscalate = (id) => {
    const ticket = tickets.find((t) => t.id === id)
    const nextTickets = tickets.map((t) => (t.id === id ? { ...t, escalated: true } : t))
    setTickets(nextTickets)
    saveTickets(nextTickets)
    const deptName = ticket?.department
    const deptObj = departments.find((d) => d.name === deptName)
    const escEmail = deptObj?.escalationEmail
    if (escEmail) {
      addNotification(`🚨 CRITICAL ESCALATION: Notification email routed to ${escEmail} for immediate resolution.`)
    } else {
      setMessage('Ticket escalated to superior.')
    }
  }

  const getNow = () => {
    const offset = parseInt(localStorage.getItem(TIME_OFFSET_KEY) || '0', 10)
    const now = new Date()
    now.setDate(now.getDate() + offset)
    return now
  }

  const setTimeOffsetDays = (d) => {
    localStorage.setItem(TIME_OFFSET_KEY, String(d))
    // trigger re-render
    setTickets([...tickets])
  }

  const renderStatusBadge = (status) => {
    const classes = {
      Open: 'bg-amber-100 text-amber-800',
      'In Progress': 'bg-sky-100 text-sky-800',
      Done: 'bg-emerald-100 text-emerald-800',
      Rejected: 'bg-rose-100 text-rose-800',
      Resolved: 'bg-slate-200 text-slate-900',
    }
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes[status] || 'bg-slate-100 text-slate-700'}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">HR Ticket Management</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Simple ticket tracking for employees and HR
            </h1>
          </div>
          {role && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                Signed in as <span className="font-semibold text-slate-900">{role === 'employee' ? 'Employee' : role === 'admin' ? 'HR Admin' : departmentName || 'Department'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          )}
        </header>
        <ToastList list={notifications} onRemove={removeNotification} />

        {!role ? (
          <main className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Choose your role</h2>
            <p className="mt-2 text-slate-600">Select either Employee or HR Admin to continue.</p>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <button
                className="rounded-3xl bg-sky-600 px-6 py-5 text-left text-white shadow-sm transition hover:bg-sky-700"
                onClick={() => handleLogin('employee')}
              >
                <p className="text-xl font-semibold">Employee</p>
                <p className="mt-1 text-sm text-slate-100">Submit tickets and track your requests.</p>
              </button>
              <button
                className="rounded-3xl bg-slate-900 px-6 py-5 text-left text-white shadow-sm transition hover:bg-slate-700"
                onClick={() => handleLogin('admin')}
              >
                <p className="text-xl font-semibold">HR Admin</p>
                <p className="mt-1 text-sm text-slate-100">View all tickets and update status.</p>
              </button>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xl font-semibold text-slate-900">Department Login</p>
                <p className="mt-2 text-sm text-slate-600">Use department credentials created by HR.</p>
                <form onSubmit={handleDepartmentLogin} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Username</label>
                    <input value={deptUsername} onChange={(e) => setDeptUsername(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="Department username" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                    <input type="password" value={deptPassword} onChange={(e) => setDeptPassword(e.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="Password" />
                  </div>
                  {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                  <button type="submit" className="inline-flex rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">Sign in</button>
                </form>
                <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Onboarded departments</p>
                  {departments.length === 0 ? (
                    <p className="mt-2">No departments configured yet.</p>
                  ) : (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                      {departments.map((dept) => (
                        <li key={dept.id}>{dept.name} ({dept.username})</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </main>
        ) : role === 'employee' ? (
          <main className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-sky-600">Employee Dashboard</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Submit a new ticket</h2>
                </div>
                <p className="text-sm text-slate-600">Your tickets are saved locally in your browser.</p>
              </div>

              <form onSubmit={handleSubmitTicket} className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    Title
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                      placeholder="Enter a short title"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    Category
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {category === 'Onboarding' && (
                  <RoleMatrix selectedGrade={selectedGrade} onChange={setSelectedGrade} />
                )}

                <label className="space-y-2 text-sm text-slate-700">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows="5"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="Explain your request or issue."
                  />
                </label>

                {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

                <button className="inline-flex rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Submit Ticket
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Your tickets</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Activity and status</h2>
                </div>
                <p className="text-sm text-slate-600">You can refresh or reopen the browser later to continue.</p>
              </div>

              <div className="mt-6 space-y-4">
                {employeeTickets.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                    No tickets yet. Submit your first request above.
                  </div>
                ) : (
                  employeeTickets.map((ticket) => (
                    <article key={ticket.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{ticket.category}</p>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">{ticket.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">{renderStatusBadge(ticket.status)}</div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{ticket.description}</p>
                      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                        Submitted {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </main>
        ) : role === 'department' ? (
          <main className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-sky-600">Department Dashboard</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">{departmentName} Department</h2>
                </div>
                <p className="text-sm text-slate-600">Only child tickets assigned to your department are visible here.</p>
              </div>
            </section>
            {departmentTickets.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No child tickets assigned to your department yet.
              </div>
            ) : (
              <div className="space-y-4">
                {departmentTickets.map((ticket) => (
                  <article key={ticket.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{ticket.category}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">{ticket.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {ticket.escalated && <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-semibold">ESCALATED TO SUPERIOR</span>}
                        {renderStatusBadge(ticket.status)}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-700">{ticket.description}</p>
                    {ticket.items && (
                      <div className="mt-4 text-sm text-slate-700">
                        <div className="font-semibold text-slate-800">Items requested:</div>
                        <ul className="mt-2 list-disc pl-5 text-slate-700">
                          {ticket.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>Submitted {new Date(ticket.createdAt).toLocaleString()}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">Created by {ticket.createdBy}</span>
                      {ticket.dueDate && (
                        <span className={`rounded-full px-3 py-1 ${new Date(ticket.dueDate) < getNow() && ticket.status !== 'Resolved' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100'}`}>
                          Due {new Date(ticket.dueDate).toLocaleDateString()}{new Date(ticket.dueDate) < getNow() && ticket.status !== 'Resolved' ? ' • Overdue' : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-slate-700">Action remark (required for Done / Rejected)</label>
                      <textarea value={ticketRemarks[ticket.id] || ''} onChange={(event) => setTicketRemarks((prev) => ({ ...prev, [ticket.id]: event.target.value }))} rows="3" className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900" placeholder="Enter your remark" />
                    </div>
                    {ticket.auditTrail?.length > 0 && (
                      <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="font-semibold text-slate-900">Audit notes</div>
                        <div className="mt-2 space-y-2">
                          {ticket.auditTrail.map((entry, index) => (
                            <div key={index} className="rounded-2xl bg-white p-3 shadow-sm">
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.actor} • {new Date(entry.time).toLocaleString()}</div>
                              <div className="mt-1 text-sm text-slate-700">{entry.action}{entry.remark ? ` — ${entry.remark}` : ''}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap gap-3">
                      {ticket.status !== 'In Progress' && ticket.status !== 'Done' && ticket.status !== 'Rejected' && (
                        <button type="button" onClick={() => handleDepartmentAction(ticket.id, 'In Progress')} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">Mark In Progress</button>
                      )}
                      {ticket.status !== 'Done' && ticket.status !== 'Resolved' && (
                        <button type="button" onClick={() => handleDepartmentAction(ticket.id, 'Done')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Mark Done</button>
                      )}
                      {ticket.status !== 'Rejected' && (
                        <button type="button" onClick={() => handleDepartmentAction(ticket.id, 'Rejected')} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Reject</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        ) : (
          <main className="space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-sky-600">HR Admin Dashboard</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">Manage all tickets</h2>
                </div>
                <p className="text-sm text-slate-600">Filter by status and update ticket progress.</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStatusFilter(option)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        statusFilter === option
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-600">Showing {adminTickets.length} ticket(s).</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setAdminView('tickets')} className={`rounded-full px-4 py-2 text-sm font-semibold ${adminView === 'tickets' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Tickets
                </button>
                <button onClick={() => setAdminView('reports')} className={`rounded-full px-4 py-2 text-sm font-semibold ${adminView === 'reports' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Reports
                </button>
                <button onClick={() => setAdminView('settings')} className={`rounded-full px-4 py-2 text-sm font-semibold ${adminView === 'settings' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Settings
                </button>
              </div>
            </section>

            {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
            {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            {adminView === 'tickets' ? (
              <section className="space-y-4">
                {adminTickets.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                    No tickets match this filter yet.
                  </div>
                ) : (
                  adminTickets.map((ticket) => (
                    <article key={ticket.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{ticket.category}</p>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">{ticket.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {ticket.escalated && <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-semibold">ESCALATED TO SUPERIOR</span>}
                          {renderStatusBadge(ticket.status)}
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{ticket.description}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span>Submitted {new Date(ticket.createdAt).toLocaleString()}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">Created by {ticket.createdBy}</span>
                        {ticket.department && <span className="rounded-full bg-slate-100 px-3 py-1">Dept: {ticket.department}</span>}
                        {ticket.dueDate && (
                          <span className={`rounded-full px-3 py-1 ${new Date(ticket.dueDate) < getNow() && ticket.status !== 'Resolved' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100'}`}>
                            Due {new Date(ticket.dueDate).toLocaleDateString()}{new Date(ticket.dueDate) < getNow() && ticket.status !== 'Resolved' ? ' • Overdue' : ''}
                          </span>
                        )}
                      </div>
                      {ticket.auditTrail?.length > 0 && (
                        <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                          <div className="font-semibold text-slate-900">Action remarks</div>
                          <div className="mt-2 space-y-2">
                            {ticket.auditTrail.map((entry, index) => (
                              entry.remark ? (
                                <div key={index} className="rounded-2xl bg-white p-3 shadow-sm">
                                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.actor} • {new Date(entry.time).toLocaleString()}</div>
                                  <div className="mt-1 text-sm text-slate-700">{entry.remark}</div>
                                </div>
                              ) : null
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-5 flex flex-wrap gap-3">
                        {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => updateTicketStatus(ticket.id, 'In Progress')}
                            className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                          >
                            Mark In Progress
                          </button>
                        )}
                        {ticket.status !== 'Resolved' && (
                          <button
                            type="button"
                            onClick={() => updateTicketStatus(ticket.id, 'Resolved')}
                            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button onClick={() => forceEscalate(ticket.id)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Force Escalation</button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            ) : adminView === 'settings' ? (
              <div className="grid gap-6">
                <DepartmentSettings departments={departments} onSave={saveDepartment} onRemove={removeDepartment} />
                <AdvancedMatrixSettings onSave={(m) => setRoleMatrix(m)} />
              </div>
            ) : (
              <Reports tickets={tickets} departments={departments} getNow={getNow} setTimeOffsetDays={setTimeOffsetDays} />
            )}
          </main>
        )}
      </div>
    </div>
  )
}
