import { useEffect, useMemo, useState, useCallback } from 'react'
import RoleMatrix from './components/RoleMatrix'
import Reports from './components/Reports'
import DepartmentSettings from './components/DepartmentSettings'
import ToastList from './components/ToastList'
import AdvancedMatrixSettings from './components/AdvancedMatrixSettings'
import TicketReports from './components/TicketReports'
import { ROLE_MATRIX } from './config/roleMatrix'
import {
  fetchParentTickets, insertParentTicket, insertChildTicketsBulk,
  updateParentStatus, updateParentChildren,
  fetchChildTickets, updateChildStatus, escalateChildTicket,
  fetchDepartments, upsertDepartment, deleteDepartment,
  fetchRoleMatrix, updateRoleMatrix as saveRoleMatrix,
  fetchConfig, updateConfig,
  subscribeToParentTickets, subscribeToChildTickets,
} from './lib/supabase'

const SESSION_KEY = 'hr_session'
const TIME_KEY = 'hr_time_offset'
const CATEGORIES = ['IT', 'Payroll', 'Leave', 'Onboarding']
const STATUSES = ['All', 'Open', 'In Progress', 'Done', 'Rejected', 'Resolved']
const CLOSED = ['Done', 'Rejected', 'Resolved']
const PAGE_SIZE = 10

function CollapsibleTicket({ ticket, isClosed, children }) {
  const [open, setOpen] = useState(!isClosed)
  if (!isClosed) return children
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${open ? 'border-indigo-200 bg-indigo-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold transition-all duration-200 ${open ? 'bg-indigo-600 text-white rotate-90' : 'bg-slate-100 text-slate-500'}`}>
          ▸
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{ticket.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {ticket.category && <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{ticket.category}</span>}
            {ticket.status && <span className="text-[10px] font-semibold text-slate-500">{ticket.status}</span>}
            {ticket.createdAt && <span className="text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${open ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {open ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-indigo-100">{children}</div>}
    </div>
  )
}

function NavIcon({ name }) {
  const c = 'w-5 h-5 shrink-0'
  if (name === 'dashboard') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>
  if (name === 'matrix') return <svg className={c} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="4" cy="5" r="1.5" fill="currentColor" stroke="none"/><line x1="7" y1="5" x2="17" y2="5"/><circle cx="4" cy="10" r="1.5" fill="currentColor" stroke="none"/><line x1="7" y1="10" x2="17" y2="10"/><circle cx="4" cy="15" r="1.5" fill="currentColor" stroke="none"/><line x1="7" y1="15" x2="17" y2="15"/></svg>
  if (name === 'departments') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><path d="M4 4h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 3h3v3H5V7zm5 0h3v3h-3V7zm-5 5h3v3H5v-3zm5 0h3v3h-3v-3z"/></svg>
  if (name === 'reports') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><rect x="2" y="10" width="3" height="7" rx="0.5"/><rect x="6.5" y="6" width="3" height="11" rx="0.5"/><rect x="11" y="3" width="3" height="14" rx="0.5"/><rect x="15.5" y="8" width="3" height="9" rx="0.5"/></svg>
  if (name === 'newticket') return <svg className={c} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="7.5"/><line x1="10" y1="6.5" x2="10" y2="13.5"/><line x1="6.5" y1="10" x2="13.5" y2="10"/></svg>
  if (name === 'timeline') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="3" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="10" cy="17" r="2"/><rect x="9.2" y="4.5" width="1.6" height="4" rx="0.5"/><rect x="9.2" y="11.5" width="1.6" height="4" rx="0.5"/></svg>
  if (name === 'history') return <svg className={c} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5"/><polyline points="10,5.5 10,10 13.5,12"/></svg>
  if (name === 'pending') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><rect x="3" y="3" width="14" height="14" rx="2"/><rect x="5" y="7" width="10" height="1.5" rx="0.5" fill="white"/><rect x="5" y="10" width="7" height="1.5" rx="0.5" fill="white"/></svg>
  if (name === 'logout') return <svg className={c} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3M13 14l4-4-4-4M17 10H7"/></svg>
  return null
}

function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= totalPages; i++) pages.push(i)
  return (
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
      <span className="text-xs text-slate-500">{total} result(s) — Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">Prev</button>
        {pages.map(p => (
          <button key={p} onClick={() => onPageChange(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{p}</button>
        ))}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">Next</button>
      </div>
    </div>
  )
}

function TimelineStep({ child, getNow }) {
  const done = ['Done', 'Resolved'].includes(child.status)
  const rejected = child.status === 'Rejected'
  const progress = child.status === 'In Progress'
  const overdue = child.dueDate && new Date(child.dueDate) < getNow() && !done && !rejected

  const dotColor = done ? 'bg-emerald-500 ring-emerald-200' : rejected ? 'bg-rose-500 ring-rose-200' : progress ? 'bg-amber-400 ring-amber-200 animate-pulse' : 'bg-slate-300 ring-slate-100'
  const lineColor = done ? 'bg-emerald-400' : 'bg-slate-200'
  const badgeColor = done ? 'bg-emerald-100 text-emerald-800' : rejected ? 'bg-rose-100 text-rose-800' : progress ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'

  const lastEntry = (child.auditTrail || []).filter(e => e.remark).slice(-1)[0]

  let tatText = ''
  if (child.dueDate) {
    const diff = Math.ceil((new Date(child.dueDate) - getNow()) / (1000 * 60 * 60 * 24))
    if (done || rejected) tatText = `Completed`
    else if (diff < 0) tatText = `Overdue by ${Math.abs(diff)}d`
    else if (diff === 0) tatText = 'Due today'
    else tatText = `${diff}d remaining`
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full ring-4 ${dotColor} z-10`} />
        <div className={`w-0.5 flex-1 min-h-[2rem] ${lineColor}`} />
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{child.department}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badgeColor}`}>{child.status}</span>
          {overdue && <span className="rounded-full bg-rose-100 text-rose-700 px-2.5 py-0.5 text-[11px] font-bold">Overdue</span>}
        </div>
        {child.items && <p className="mt-1 text-xs text-slate-500">{child.items.join(', ')}</p>}
        {tatText && <p className={`mt-1 text-xs font-semibold ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>{tatText}</p>}
        {lastEntry && <p className="mt-1 text-xs text-slate-400 italic">"{lastEntry.remark}" — {lastEntry.actor}</p>}
      </div>
    </div>
  )
}

export default function App() {
  const [role, setRole] = useState(() => {
    try { const r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r).role || '' : '' } catch { return '' }
  })
  const [departmentId, setDepartmentId] = useState(() => {
    try { const r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r).departmentId || '' : '' } catch { return '' }
  })
  const [tickets, setTickets] = useState([])
  const [childTickets, setChildTickets] = useState([])
  const [departments, setDepartments] = useState([])
  const [roleMatrix, setRoleMatrix] = useState(ROLE_MATRIX)
  const [customItems, setCustomItems] = useState([])
  const [departmentEmails, setDepartmentEmails] = useState({})
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('IT')
  const [description, setDescription] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [notifications, setNotifications] = useState([])
  const [ticketRemarks, setTicketRemarks] = useState({})
  const [theme, setTheme] = useState(() => localStorage.getItem('hr_theme') || 'indigo-modern')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('hr_font') || 'medium')
  const [deptUsername, setDeptUsername] = useState('')
  const [deptPassword, setDeptPassword] = useState('')

  const [activeView, setActiveView] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState(null)

  const themeBg = { 'corporate-blue': 'bg-blue-50/30', 'slate-minimalist': 'bg-slate-100', 'indigo-modern': 'bg-slate-50', 'emerald-eco': 'bg-emerald-50/20', 'dark-mode': 'bg-zinc-950 text-zinc-100' }
  const themeCard = { 'corporate-blue': 'bg-white border-blue-100', 'slate-minimalist': 'bg-white border-slate-200', 'indigo-modern': 'bg-white border-slate-200', 'emerald-eco': 'bg-white border-emerald-100', 'dark-mode': 'bg-zinc-900 border-zinc-800 text-zinc-100' }
  const fontScale = { small: 'text-xs md:text-sm leading-tight', medium: 'text-sm md:text-base leading-normal', large: 'text-base md:text-lg leading-relaxed' }

  useEffect(() => { localStorage.setItem('hr_theme', theme); localStorage.setItem('hr_font', fontSize) }, [theme, fontSize])
  useEffect(() => { localStorage.setItem(SESSION_KEY, JSON.stringify({ role, departmentId })) }, [role, departmentId])

  const deptName = useMemo(() => departments.find(d => d.id === departmentId)?.name || '', [departments, departmentId])
  const currentActor = role === 'admin' ? 'HR Admin' : role === 'employee' ? 'Employee' : deptName || 'Department'

  const addNotification = (msg) => {
    const id = Date.now().toString()
    setNotifications(c => [...c, { id, message: msg }])
    setTimeout(() => setNotifications(c => c.filter(t => t.id !== id)), 4500)
  }
  const appendAudit = (ticket, action, actor, remark = '') => ({
    ...ticket, auditTrail: [...(ticket.auditTrail || []), { time: new Date().toISOString(), actor, action, remark }]
  })
  const getNow = () => {
    const offset = parseInt(localStorage.getItem(TIME_KEY) || '0', 10)
    const now = new Date(); now.setDate(now.getDate() + offset); return now
  }
  const resolveDeptKey = (dept) => {
    if (!dept) return ''
    const explicit = (dept.matrixKey || '').trim().toLowerCase()
    if (explicit) return explicit
    const name = dept.name.toLowerCase()
    const allKeys = Object.values(roleMatrix).flatMap(g => (g.required || []).map(r => r.department.toLowerCase()))
    for (const k of [...new Set(allKeys)]) { if (name.includes(k)) return k }
    return name
  }

  // ─── Initial Data Load from Supabase ──────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      const [p, c, d, m, ci, de] = await Promise.all([
        fetchParentTickets(),
        fetchChildTickets(),
        fetchDepartments(),
        fetchRoleMatrix(),
        fetchConfig('custom_items'),
        fetchConfig('department_emails'),
      ])
      setTickets(p)
      setChildTickets(c)
      setDepartments(d)
      if (m) setRoleMatrix(m)
      if (ci) setCustomItems(ci)
      if (de) setDepartmentEmails(de)
      setLoading(false)
    }
    loadAll()
  }, [])

  // ─── Realtime Subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const parentSub = subscribeToParentTickets((payload) => {
      if (payload.eventType === 'INSERT') {
        setTickets(prev => {
          if (prev.some(t => t.id === payload.new.id)) return prev
          return [payload.new, ...prev]
        })
      } else if (payload.eventType === 'UPDATE') {
        setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
      } else if (payload.eventType === 'DELETE') {
        setTickets(prev => prev.filter(t => t.id !== payload.old.id))
      }
    })
    const childSub = subscribeToChildTickets((payload) => {
      if (payload.eventType === 'INSERT') {
        setChildTickets(prev => {
          if (prev.some(t => t.id === payload.new.id)) return prev
          return [payload.new, ...prev]
        })
      } else if (payload.eventType === 'UPDATE') {
        setChildTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
      } else if (payload.eventType === 'DELETE') {
        setChildTickets(prev => prev.filter(t => t.id !== payload.old.id))
      }
    })
    return () => { parentSub.unsubscribe(); childSub.unsubscribe() }
  }, [])

  // ─── Auth Handlers ────────────────────────────────────────────────────────
  const handleLogin = (nextRole) => { setRole(nextRole); setActiveView('dashboard'); setMessage(''); setError(''); setSearchQuery(''); setCurrentPage(1); setSelectedTicket(null) }
  const handleDepartmentLogin = (e) => {
    e.preventDefault()
    const match = departments.find(d => d.username === deptUsername && d.password === deptPassword)
    if (!match) { setError('Invalid department credentials.'); setMessage(''); return }
    setRole('department'); setDepartmentId(match.id); setActiveView('dashboard'); setMessage(`Signed in as ${match.name}`); setError(''); setDeptUsername(''); setDeptPassword('')
  }
  const handleLogout = () => { setRole(''); setDepartmentId(''); setMessage(''); setError(''); setActiveView('dashboard'); setSelectedTicket(null) }

  // ─── Department CRUD (Supabase) ───────────────────────────────────────────
  const saveDepartment = async (dept) => {
    if (departments.some(d => d.username === dept.username)) { setError('Username already exists.'); setMessage(''); return }
    const newDept = { ...dept, id: Date.now().toString(), createdAt: new Date().toISOString() }
    const ok = await upsertDepartment(newDept)
    if (ok) {
      setDepartments(prev => [...prev, newDept])
      setError(''); setMessage('Department onboarded.')
    } else {
      setError('Failed to save department to cloud.'); setMessage('')
    }
  }
  const removeDepartment = async (id) => {
    const ok = await deleteDepartment(id)
    if (ok) {
      setDepartments(prev => prev.filter(d => d.id !== id))
      setMessage('Department removed.'); setError('')
    } else {
      setError('Failed to remove department from cloud.'); setMessage('')
    }
  }

  // ─── Ticket Creation (Supabase) ───────────────────────────────────────────
  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) { setError('Title and description required.'); setMessage(''); return }
    const baseId = Date.now().toString()
    const now = new Date().toISOString()

    if (category === 'Onboarding' && selectedGrade && roleMatrix[selectedGrade]) {
      const matrix = roleMatrix[selectedGrade]
      const parent = { id: baseId + '-P', title: title.trim(), category: 'Onboarding', description: description.trim(), status: 'Open', createdAt: now, createdBy: 'employee', type: 'parent', grade: selectedGrade, children: [], auditTrail: [{ time: now, actor: 'HRBP', action: 'Created', remark: '' }] }
      const children = matrix.required.map((r, idx) => {
        const childId = `${baseId}-C${idx + 1}`
        const due = new Date(); due.setDate(due.getDate() + (r.tatDays || 1))
        return { id: childId, parentId: parent.id, title: `${parent.title} — ${r.department} tasks`, category: r.department, department: r.department, departmentName: r.department, items: r.items, status: 'Received', createdAt: now, dueDate: due.toISOString(), tatDays: r.tatDays || 1, createdBy: 'HRBP', type: 'child', escalated: false, auditTrail: [{ time: now, actor: 'HRBP', action: 'Created', remark: '' }] }
      })
      parent.children = children.map(c => c.id)

      const pOk = await insertParentTicket(parent)
      const cOk = await insertChildTicketsBulk(children)
      if (pOk.success && cOk.success) {
        setTickets(prev => [parent, ...prev])
        setChildTickets(prev => [...children, ...prev])
        children.forEach(child => {
          const dObj = departments.find(d => resolveDeptKey(d) === child.department.toLowerCase())
          addNotification(`Email sent to ${dObj?.primaryEmail || child.department}: Ticket ${child.id} raised`)
        })
      } else {
        const errMsg = pOk.error ? (pOk.error.message || JSON.stringify(pOk.error)) : cOk.error ? (cOk.error.message || JSON.stringify(cOk.error)) : 'Unknown error'
        setError('Failed: ' + errMsg); return
      }
    } else {
      const newTicket = { id: baseId, title: title.trim(), category, description: description.trim(), status: 'Open', createdAt: now, createdBy: 'employee', type: 'single' }
      const result = await insertParentTicket(newTicket)
      if (result.success) {
        setTickets(prev => [newTicket, ...prev])
      } else {
        const errMsg = result.error ? (result.error.message || JSON.stringify(result.error)) : 'Unknown error'
        setError('Failed: ' + errMsg); return
      }
    }
    setTitle(''); setCategory('IT'); setDescription(''); setSelectedGrade(''); setError(''); setMessage('Ticket submitted successfully.')
  }

  // ─── Ticket Status Update (Supabase) ──────────────────────────────────────
  const updateTicketStatus = async (id, nextStatus, remark = '') => {
    const auditEntry = { time: new Date().toISOString(), actor: currentActor, action: nextStatus, remark }
    const now = new Date().toISOString()

    // Update child ticket
    const childUpdated = childTickets.find(t => t.id === id)
    if (childUpdated) {
      await updateChildStatus(id, nextStatus, auditEntry)
      const nextChild = childTickets.map(t => t.id === id ? appendAudit({ ...t, status: nextStatus }, nextStatus, currentActor, remark) : t)

      // Check if all siblings are closed → auto-resolve parent
      const parent = tickets.find(t => t.id === childUpdated.parentId)
      if (parent) {
        const siblings = nextChild.filter(t => t.parentId === parent.id)
        if (siblings.every(s => CLOSED.includes(s.status)) && parent.status !== 'Resolved') {
          const parentAudit = { time: now, actor: 'System', action: 'Resolved', remark: 'All child tickets closed' }
          await updateParentStatus(parent.id, 'Resolved', parentAudit)
          setTickets(prev => prev.map(t => t.id === parent.id ? appendAudit({ ...t, status: 'Resolved' }, 'Resolved', 'System', 'All child tickets closed') : t))
          setMessage('All child tickets closed; parent auto-resolved.')
        }
      }
      setChildTickets(nextChild)
    } else {
      // Update parent/single ticket
      await updateParentStatus(id, nextStatus, auditEntry)
      setTickets(prev => prev.map(t => t.id === id ? appendAudit({ ...t, status: nextStatus }, nextStatus, currentActor, remark) : t))
    }
    setMessage(`Ticket updated to ${nextStatus}.`); setError('')
  }

  const handleDepartmentAction = (ticketId, action) => {
    const remark = (ticketRemarks[ticketId] || '').trim()
    if ((action === 'Done' || action === 'Rejected') && !remark) { setError('Remarks required before Done or Rejected.'); setMessage(''); return }
    updateTicketStatus(ticketId, action, remark); setTicketRemarks(prev => ({ ...prev, [ticketId]: '' }))
  }

  const forceEscalate = async (id) => {
    await escalateChildTicket(id)
    setChildTickets(prev => prev.map(t => t.id === id ? { ...t, escalated: true } : t))
    const ticket = childTickets.find(t => t.id === id)
    const dObj = departments.find(d => resolveDeptKey(d) === (ticket?.department || '').toLowerCase())
    if (dObj?.escalationEmail) addNotification(`CRITICAL ESCALATION: Routed to ${dObj.escalationEmail}`)
    else setMessage('Ticket escalated to superior.')
  }

  // ─── Matrix Config Save (Supabase) ────────────────────────────────────────
  const handleSaveMatrix = async (m) => {
    setRoleMatrix(m)
    await saveRoleMatrix(m)
  }

  const handleSaveCustomItems = async (items) => {
    setCustomItems(items)
    await updateConfig('custom_items', items)
  }

  const handleSaveDepartmentEmails = async (emails) => {
    setDepartmentEmails(emails)
    await updateConfig('department_emails', emails)
  }

  // ─── Derived State ────────────────────────────────────────────────────────
  const departmentTickets = useMemo(() => {
    const dept = departments.find(d => d.id === departmentId)
    if (!dept) return []
    const key = resolveDeptKey(dept)
    return childTickets.filter(t => t.department && t.department.toLowerCase() === key)
  }, [childTickets, departmentId, departments, roleMatrix])

  const deptMetrics = useMemo(() => ({
    total: departmentTickets.length,
    received: departmentTickets.filter(t => t.status === 'Received' || t.status === 'Open').length,
    progress: departmentTickets.filter(t => t.status === 'In Progress').length,
    closed: departmentTickets.filter(t => t.status === 'Done' || t.status === 'Resolved').length,
    rejected: departmentTickets.filter(t => t.status === 'Rejected').length,
  }), [departmentTickets])

  const employeeTickets = useMemo(() => tickets.filter(t => t.createdBy === 'employee'), [tickets])
  const employeeParentTickets = useMemo(() => employeeTickets.filter(t => t.type === 'parent'), [employeeTickets])
  const adminTickets = useMemo(() => statusFilter === 'All' ? tickets : tickets.filter(t => t.status === statusFilter), [tickets, statusFilter])
  const isClosed = (t) => CLOSED.includes(t.status)

  const paginate = (items) => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = q ? items.filter(t => (t.title || '').toLowerCase().includes(q) || (t.department || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q) || (t.status || '').toLowerCase().includes(q)) : items
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const page = Math.min(currentPage, totalPages)
    const start = (page - 1) * PAGE_SIZE
    return { items: filtered.slice(start, start + PAGE_SIZE), totalPages, total: filtered.length, page }
  }

  const renderBadge = (status) => {
    const c = { Open: 'bg-amber-100 text-amber-800', 'In Progress': 'bg-sky-100 text-sky-800', Done: 'bg-emerald-100 text-emerald-800', Rejected: 'bg-rose-100 text-rose-800', Resolved: 'bg-slate-200 text-slate-900', Received: 'bg-amber-100 text-amber-800' }
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${c[status] || 'bg-slate-100 text-slate-700'}`}>{status}</span>
  }

  const sidebarNav = useMemo(() => {
    if (role === 'admin') return [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }, { id: 'matrix', label: 'Dynamic Matrix Grid', icon: 'matrix' }, { id: 'departments', label: 'Department Settings', icon: 'departments' }, { id: 'reports', label: 'Advanced Reports', icon: 'reports' }, { id: 'detailed-reports', label: 'Detailed Reports', icon: 'reports' }]
    if (role === 'department') return [{ id: 'dashboard', label: 'Received Metrics', icon: 'dashboard' }, { id: 'pending', label: 'Pending Tickets', icon: 'pending' }, { id: 'reports', label: 'Reports', icon: 'reports' }, { id: 'data-gaps', label: 'Data Gap Reports', icon: 'reports' }]
    if (role === 'employee') return [{ id: 'new-ticket', label: 'Raise Ticket', icon: 'newticket' }, { id: 'timeline', label: 'Live Progress Tracker', icon: 'timeline' }, { id: 'reports', label: 'Reports', icon: 'reports' }, { id: 'history', label: 'Personal History', icon: 'history' }]
    return []
  }, [role])

  const deptPending = useMemo(() => departmentTickets.filter(t => !isClosed(t)), [departmentTickets])
  const deptHistory = useMemo(() => departmentTickets.filter(t => isClosed(t)), [departmentTickets])

  const sidebarBadges = useMemo(() => {
    if (role === 'department') return { pending: deptPending.length }
    if (role === 'employee') return { history: employeeTickets.length }
    return {}
  }, [role, deptPending, employeeTickets])

  const searchRef = <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} placeholder="Search tickets..." className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />

  // ─── Admin Dashboard ──────────────────────────────────────────────────────
  const renderAdminDashboard = () => {
    const p = paginate(adminTickets)
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`rounded-2xl border p-5 shadow-sm ${themeCard[theme]}`}><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Tickets</div><div className="mt-2 text-3xl font-bold text-slate-900">{tickets.length}</div></div>
          <div className={`rounded-2xl border p-5 shadow-sm ${themeCard[theme]}`}><div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Open</div><div className="mt-2 text-3xl font-bold text-slate-900">{tickets.filter(t => t.status === 'Open').length}</div></div>
          <div className={`rounded-2xl border p-5 shadow-sm ${themeCard[theme]}`}><div className="text-xs font-semibold uppercase tracking-wider text-sky-600">In Progress</div><div className="mt-2 text-3xl font-bold text-slate-900">{tickets.filter(t => t.status === 'In Progress').length}</div></div>
          <div className={`rounded-2xl border p-5 shadow-sm ${themeCard[theme]}`}><div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Resolved</div><div className="mt-2 text-3xl font-bold text-slate-900">{tickets.filter(t => CLOSED.includes(t.status)).length}</div></div>
        </div>
        {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        <div className="flex items-center gap-3">{searchRef}</div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(opt => (<button key={opt} type="button" onClick={() => { setStatusFilter(opt); setCurrentPage(1) }} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${statusFilter === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{opt}</button>))}
        </div>
        <div className="space-y-3">
          {p.total === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No tickets match this filter.</div> : p.items.map(t => (
            <CollapsibleTicket key={t.id} ticket={t} isClosed={isClosed(t)}>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-semibold text-slate-700">{t.category}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{t.title}</h3></div>
                  <div className="flex items-center gap-2">{t.escalated && <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-[11px] font-bold">ESCALATED</span>}{renderBadge(t.status)}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{t.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{new Date(t.createdAt).toLocaleString()}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5">{t.createdBy}</span>
                  {t.department && <span className="rounded-full bg-slate-100 px-2.5 py-0.5">Dept: {t.department}</span>}
                  {t.dueDate && <span className={`rounded-full px-2.5 py-0.5 ${new Date(t.dueDate) < getNow() && !isClosed(t) ? 'bg-rose-100 text-rose-800' : 'bg-slate-100'}`}>Due {new Date(t.dueDate).toLocaleDateString()}{new Date(t.dueDate) < getNow() && !isClosed(t) ? ' Overdue' : ''}</span>}
                </div>
                {t.auditTrail?.filter(e => e.remark).length > 0 && (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                    {t.auditTrail.filter(e => e.remark).map((e, i) => <div key={i} className="py-1"><span className="font-semibold text-slate-500">{e.actor}:</span> {e.remark}</div>)}
                  </div>
                )}
                {!isClosed(t) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.status !== 'In Progress' && <button onClick={() => updateTicketStatus(t.id, 'In Progress')} className="rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition">In Progress</button>}
                    <button onClick={() => updateTicketStatus(t.id, 'Resolved')} className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition">Resolved</button>
                    <button onClick={() => forceEscalate(t.id)} className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition">Escalate</button>
                  </div>
                )}
              </article>
            </CollapsibleTicket>
          ))}
          <Pagination page={p.page} totalPages={p.totalPages} total={p.total} onPageChange={setCurrentPage} />
        </div>
      </div>
    )
  }

  const renderAdminMatrix = () => (
    <div className="grid gap-6">
      <DepartmentSettings departments={departments} onSave={saveDepartment} onRemove={removeDepartment} />
      <AdvancedMatrixSettings onSave={handleSaveMatrix} initialMatrix={roleMatrix} initialCustomItems={customItems} initialDepartmentEmails={departmentEmails} onSaveCustomItems={handleSaveCustomItems} onSaveDepartmentEmails={handleSaveDepartmentEmails} />
    </div>
  )

  const renderAdminDepartments = () => (
    <div className="space-y-4">
      <DepartmentSettings departments={departments} onSave={saveDepartment} onRemove={removeDepartment} />
    </div>
  )

  const renderEmployeeNewTicket = () => (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Raise a New Ticket</h2>
        <p className="mt-1 text-sm text-slate-500">Submit a request that will be routed to the appropriate department.</p>
        <form onSubmit={handleSubmitTicket} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-slate-700">Title<input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" placeholder="Short title" /></label>
            <label className="space-y-1.5 text-sm text-slate-700">Category<select value={category} onChange={e => setCategory(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
          </div>
          {category === 'Onboarding' && <RoleMatrix selectedGrade={selectedGrade} onChange={setSelectedGrade} roleMatrix={roleMatrix} />}
          <label className="space-y-1.5 text-sm text-slate-700">Description<textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" placeholder="Explain your request." /></label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
          <button className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition">Submit Ticket</button>
        </form>
      </div>
    </div>
  )

  const renderEmployeeTimeline = () => {
    const p = paginate(employeeParentTickets)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">{searchRef}</div>
        {p.total === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No onboarding tickets yet.</div> : p.items.map(parent => {
          const kids = childTickets.filter(c => c.parentId === parent.id)
          const allDone = kids.length > 0 && kids.every(k => CLOSED.includes(k.status))
          return (
            <div key={parent.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{parent.title}</h3>
                  <p className="text-xs text-slate-500">Grade: {parent.grade || '—'} | Submitted: {new Date(parent.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {allDone && <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[11px] font-bold">All Complete</span>}
                  {renderBadge(parent.status)}
                </div>
              </div>
              {selectedTicket === parent.id ? (
                <div className="mt-4">
                  <button onClick={() => setSelectedTicket(null)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Collapse tracker</button>
                  <div className="mt-3 border-l-2 border-slate-200 ml-1.5">
                    {kids.map(child => <TimelineStep key={child.id} child={child} getNow={getNow} />)}
                  </div>
                </div>
              ) : (
                <button onClick={() => setSelectedTicket(parent.id)} className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Track {kids.length} department task(s)</button>
              )}
            </div>
          )
        })}
        <Pagination page={p.page} totalPages={p.totalPages} total={p.total} onPageChange={setCurrentPage} />
      </div>
    )
  }

  const renderEmployeeHistory = () => {
    const allEmployeeTickets = [...tickets].filter(t => t.createdBy === 'employee').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const p = paginate(allEmployeeTickets)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">{searchRef}</div>
        {p.total === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No tickets in your history yet.</div> : p.items.map(t => {
          const kids = childTickets.filter(c => c.parentId === t.id)
          const isParent = t.type === 'parent'
          return (
            <CollapsibleTicket key={t.id} ticket={t} isClosed={isClosed(t)}>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{t.category}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{t.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">{renderBadge(t.status)}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{t.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{new Date(t.createdAt).toLocaleString()}</span>
                  {isParent && <span className="rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 font-semibold">Grade: {t.grade || '—'}</span>}
                  {isParent && <span className="rounded-full bg-slate-100 px-2.5 py-0.5">{kids.length} department task(s)</span>}
                </div>
                {isParent && kids.length > 0 && (
                  <div className="mt-3">
                    {selectedTicket === t.id ? (
                      <div>
                        <button onClick={() => setSelectedTicket(null)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Collapse tracker</button>
                        <div className="mt-3 border-l-2 border-slate-200 ml-1.5">
                          {kids.map(child => <TimelineStep key={child.id} child={child} getNow={getNow} />)}
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedTicket(t.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View department progress</button>
                    )}
                  </div>
                )}
                {t.auditTrail?.filter(e => e.remark).length > 0 && (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                    {t.auditTrail.filter(e => e.remark).map((e, i) => <div key={i} className="py-1"><span className="font-semibold text-slate-500">{e.actor}:</span> {e.remark}</div>)}
                  </div>
                )}
              </article>
            </CollapsibleTicket>
          )
        })}
        <Pagination page={p.page} totalPages={p.totalPages} total={p.total} onPageChange={setCurrentPage} />
      </div>
    )
  }

  const renderDeptDashboard = () => (
    <div className="space-y-6">
      {deptMetrics.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center"><div className="text-2xl font-bold text-amber-700">{deptMetrics.received}</div><div className="text-xs text-amber-600">Received</div></div>
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-center"><div className="text-2xl font-bold text-sky-700">{deptMetrics.progress}</div><div className="text-xs text-sky-600">In Progress</div></div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center"><div className="text-2xl font-bold text-emerald-700">{deptMetrics.closed}</div><div className="text-xs text-emerald-600">Closed</div></div>
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-center"><div className="text-2xl font-bold text-rose-700">{deptMetrics.rejected}</div><div className="text-xs text-rose-600">Rejected</div></div>
        </div>
      )}
      {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    </div>
  )

  const renderDeptTicketList = (ticketList, emptyMsg) => {
    const p = paginate(ticketList)
    return p.total === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">{emptyMsg}</div> : (
      <div className="space-y-3">
        {p.items.map(ticket => (
          <CollapsibleTicket key={ticket.id} ticket={ticket} isClosed={isClosed(ticket)}>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-xs font-semibold text-slate-700">{ticket.category}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{ticket.title}</h3></div>
                <div className="flex items-center gap-2">{ticket.escalated && <span className="rounded-full bg-red-100 text-red-800 px-2.5 py-0.5 text-[11px] font-bold">ESCALATED</span>}{renderBadge(ticket.status)}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{ticket.description}</p>
              {ticket.items && <div className="mt-3 text-sm text-slate-700"><span className="font-semibold">Items:</span> {ticket.items.join(', ')}</div>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                {ticket.dueDate && <span className={`rounded-full px-2.5 py-0.5 ${new Date(ticket.dueDate) < getNow() && !isClosed(ticket) ? 'bg-rose-100 text-rose-800' : 'bg-slate-100'}`}>Due {new Date(ticket.dueDate).toLocaleDateString()}{new Date(ticket.dueDate) < getNow() && !isClosed(ticket) ? ' Overdue' : ''}</span>}
              </div>
              {!isClosed(ticket) && (
                <>
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-700">Remark (required for Done/Rejected)</label>
                    <textarea value={ticketRemarks[ticket.id] || ''} onChange={e => setTicketRemarks(prev => ({ ...prev, [ticket.id]: e.target.value }))} rows="2" className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900" placeholder="Enter remark" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ticket.status !== 'In Progress' && ticket.status !== 'Done' && ticket.status !== 'Rejected' && ticket.status !== 'Resolved' && <button onClick={() => handleDepartmentAction(ticket.id, 'In Progress')} className="rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition">In Progress</button>}
                    {ticket.status !== 'Done' && ticket.status !== 'Rejected' && ticket.status !== 'Resolved' && <button onClick={() => handleDepartmentAction(ticket.id, 'Done')} className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition">Done</button>}
                    {ticket.status !== 'Rejected' && ticket.status !== 'Done' && ticket.status !== 'Resolved' && <button onClick={() => handleDepartmentAction(ticket.id, 'Rejected')} className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition">Reject</button>}
                  </div>
                </>
              )}
              {ticket.auditTrail?.length > 0 && (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                  {ticket.auditTrail.map((e, i) => <div key={i} className="py-1"><span className="font-semibold text-slate-500">{e.actor}:</span> {e.action}{e.remark ? ` — ${e.remark}` : ''}</div>)}
                </div>
              )}
            </article>
          </CollapsibleTicket>
        ))}
        <Pagination page={p.page} totalPages={p.totalPages} total={p.total} onPageChange={setCurrentPage} />
      </div>
    )
  }

  const renderDeptDataGaps = () => {
    const gapTickets = departmentTickets.filter(t => {
      const noRemark = !(t.auditTrail || []).some(e => e.remark && e.remark.trim())
      const stuckInProgress = t.status === 'In Progress' && t.dueDate && (new Date(t.dueDate) - getNow()) < (1000 * 60 * 60 * 24 * 2)
      const noItems = !t.items || t.items.length === 0
      return !isClosed(t) && (noRemark || stuckInProgress || noItems)
    })
    const p = paginate(gapTickets)
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-bold">Data Gap Summary:</span> {gapTickets.length} ticket(s) with missing remarks, incomplete items, or approaching deadline without updates.
        </div>
        {p.total === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">No data gaps detected. All tickets have complete information.</div> : (
          <div className="space-y-3">
            {p.items.map(ticket => {
              const noRemark = !(ticket.auditTrail || []).some(e => e.remark && e.remark.trim())
              const stuckInProgress = ticket.status === 'In Progress' && ticket.dueDate && (new Date(ticket.dueDate) - getNow()) < (1000 * 60 * 60 * 24 * 2)
              const noItems = !ticket.items || ticket.items.length === 0
              return (
                <article key={ticket.id} className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{ticket.category}</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{ticket.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">{renderBadge(ticket.status)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {noRemark && <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold">Missing Remark</span>}
                    {noItems && <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold">No Task Items</span>}
                    {stuckInProgress && <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-[11px] font-bold">Deadline Approaching</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                    {ticket.dueDate && <span>Due: {new Date(ticket.dueDate).toLocaleDateString()}</span>}
                  </div>
                </article>
              )
            })}
            <Pagination page={p.page} totalPages={p.totalPages} total={p.total} onPageChange={setCurrentPage} />
          </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    if (role === 'admin') {
      if (activeView === 'dashboard') return renderAdminDashboard()
      if (activeView === 'matrix') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Dynamic Matrix Grid</h2><p className="text-sm text-slate-500">Configure departments, grades, and onboarding items.</p></div>{renderAdminMatrix()}</>
      if (activeView === 'departments') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Department Settings</h2><p className="text-sm text-slate-500">Onboard and manage departments with login credentials and edit configurations.</p></div>{renderAdminDepartments()}</>
      if (activeView === 'reports') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Advanced Reports</h2><p className="text-sm text-slate-500">Export data, view SLA breaches, and analyze ticket distribution.</p></div><Reports tickets={tickets} childTickets={childTickets} departments={departments} getNow={getNow} /></>
      if (activeView === 'detailed-reports') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Detailed Reports</h2><p className="text-sm text-slate-500">Status-wise, category-wise breakdowns with created date, resolved date, and resolution time.</p></div><TicketReports tickets={tickets} title="All Tickets Report" subtitle="Detailed reporting for all tickets across the system." />
    }
    if (role === 'department') {
      if (activeView === 'dashboard') return renderDeptDashboard()
      if (activeView === 'pending') return <><div className="mb-2 flex items-center gap-3">{searchRef}</div>{renderDeptTicketList(deptPending, 'No pending tickets.')}</>
      if (activeView === 'reports') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Reports</h2><p className="text-sm text-slate-500">Status-wise and category-wise reports with date range filtering.</p></div><TicketReports tickets={departmentTickets} title="Department Reports" subtitle="View status and category breakdowns for your department tickets." /></>
      if (activeView === 'data-gaps') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Data Gap Reports</h2><p className="text-sm text-slate-500">Identify tickets with missing remarks, incomplete items, or approaching deadlines.</p></div>{renderDeptDataGaps()}</>
    }
    if (role === 'employee') {
      if (activeView === 'new-ticket') return renderEmployeeNewTicket()
      if (activeView === 'timeline') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Live Progress Timeline Tracker</h2><p className="text-sm text-slate-500">Click a ticket to see which departments have completed their tasks and which are still pending.</p></div>{renderEmployeeTimeline()}</>
      if (activeView === 'reports') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Reports</h2><p className="text-sm text-slate-500">Status-wise and category-wise reports with date range filtering.</p></div><TicketReports tickets={employeeTickets} title="My Ticket Reports" subtitle="View status and category breakdowns for your submitted tickets." /></>
      if (activeView === 'history') return <><div className="mb-4"><h2 className="text-xl font-bold text-slate-900">Personal History</h2><p className="text-sm text-slate-500">View all your submitted tickets and track their progress across departments.</p></div>{renderEmployeeHistory()}</>
    }
    return null
  }

  if (!role) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-200 ${themeBg[theme]} ${fontScale[fontSize]}`}>
        <ToastList list={notifications} onRemove={id => setNotifications(c => c.filter(t => t.id !== id))} />
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">HR Ticket Management</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Simple ticket tracking for employees and HR</h1>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Choose your role</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <button className="rounded-2xl bg-sky-600 px-5 py-5 text-left text-white shadow-sm transition hover:bg-sky-700" onClick={() => handleLogin('employee')}>
                <p className="text-lg font-semibold">Employee</p><p className="mt-1 text-sm text-sky-100">Submit tickets and track requests.</p>
              </button>
              <button className="rounded-2xl bg-slate-900 px-5 py-5 text-left text-white shadow-sm transition hover:bg-slate-700" onClick={() => handleLogin('admin')}>
                <p className="text-lg font-semibold">HR Admin</p><p className="mt-1 text-sm text-slate-300">View all tickets and manage departments.</p>
              </button>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-lg font-semibold text-slate-900">Department Login</p>
                <form onSubmit={handleDepartmentLogin} className="mt-4 space-y-3">
                  <input value={deptUsername} onChange={e => setDeptUsername(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" placeholder="Username" />
                  <input type="password" value={deptPassword} onChange={e => setDeptPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900" placeholder="Password" />
                  {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                  <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition">Sign in</button>
                </form>
                {departments.length > 0 && <div className="mt-3 text-xs text-slate-500">{departments.map(d => d.name).join(', ')}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${themeBg[theme]} ${fontScale[fontSize]}`}>
      <aside className="w-64 h-screen fixed left-0 top-0 bg-slate-900 text-slate-300 flex flex-col z-40">
        <div className="px-5 py-6 border-b border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">HR Ticket Mgmt</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {role === 'admin' ? 'A' : role === 'employee' ? 'E' : (deptName || 'D').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{role === 'admin' ? 'HR Admin' : role === 'employee' ? 'Employee' : deptName}</p>
              <p className="text-[11px] text-slate-500">{role === 'admin' ? 'Administrator' : role === 'employee' ? 'Staff Portal' : 'Department Portal'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarNav.map(item => {
            const badge = sidebarBadges[item.id]
            const isActive = activeView === item.id
            return (
              <button key={item.id} onClick={() => { setActiveView(item.id); setSearchQuery(''); setCurrentPage(1); setSelectedTicket(null) }}
                className={`flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition relative ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />}
                <NavIcon name={item.icon} />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300'}`}>{badge}</span>}
              </button>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800 space-y-3">
          <div className="px-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Theme</label>
            <select value={theme} onChange={e => setTheme(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 outline-none">
              <option value="indigo-modern">Indigo Modern</option>
              <option value="corporate-blue">Corporate Blue</option>
              <option value="slate-minimalist">Slate Minimalist</option>
              <option value="emerald-eco">Emerald Eco</option>
              <option value="dark-mode">Dark Mode</option>
            </select>
          </div>
          <div className="px-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Font Size</label>
            <select value={fontSize} onChange={e => setFontSize(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 outline-none">
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition">
            <NavIcon name="logout" />Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-6 min-h-screen">
        <ToastList list={notifications} onRemove={id => setNotifications(c => c.filter(t => t.id !== id))} />
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-slate-500 font-semibold">Loading from cloud database...</p>
            </div>
          </div>
        ) : renderContent()}
      </main>
    </div>
  )
}
