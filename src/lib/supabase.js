import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Field Mapping: DB → App ──────────────────────────────────────────────────

function parentDbToApp(row) {
  if (!row) return row
  let auditTrail = row.audit_trail || []
  if (typeof auditTrail === 'string') { try { auditTrail = JSON.parse(auditTrail) } catch { auditTrail = [] } }
  if (!Array.isArray(auditTrail)) auditTrail = []
  return {
    id: row.id,
    title: row.title,
    category: row.category || 'Onboarding',
    description: row.description || '',
    status: row.status,
    createdAt: row.created_at,
    createdBy: row.created_by || 'employee',
    type: 'parent',
    grade: row.grade_name || '',
    employeeName: row.employee_name || '',
    children: row.children || [],
    auditTrail,
  }
}

function childDbToApp(row) {
  if (!row) return row
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title || '',
    category: row.category || '',
    department: row.department_name || '',
    departmentName: row.department_name || '',
    items: row.required_items || [],
    status: row.current_status,
    createdAt: row.created_at,
    dueDate: row.due_date || null,
    tatDays: row.tat_days || 1,
    createdBy: 'HRBP',
    type: 'child',
    escalated: row.escalated || false,
    auditTrail: row.mandatory_remarks || [],
  }
}

function departmentDbToApp(row) {
  if (!row) return row
  return {
    id: row.id,
    name: row.name,
    matrixKey: row.matrix_key || '',
    username: row.username,
    password: row.password,
    primaryEmail: row.primary_email || '',
    escalationEmail: row.escalation_email || '',
    createdAt: row.created_at,
  }
}

// ─── Field Mapping: App → DB ──────────────────────────────────────────────────

function parentAppToDb(ticket) {
  return {
    id: ticket.id,
    title: ticket.title,
    category: ticket.category || 'Onboarding',
    description: ticket.description || '',
    status: ticket.status,
    employee_name: ticket.employeeName || '',
    grade_name: ticket.grade || '',
    created_by: ticket.createdBy || 'employee',
    children: ticket.children || [],
    audit_trail: ticket.auditTrail || [],
    created_at: ticket.createdAt || new Date().toISOString(),
  }
}

function childAppToDb(ticket) {
  return {
    id: ticket.id,
    parent_id: ticket.parentId,
    title: ticket.title || '',
    category: ticket.category || '',
    department_name: ticket.department || ticket.departmentName || '',
    required_items: ticket.items || [],
    current_status: ticket.status,
    mandatory_remarks: ticket.auditTrail || [],
    escalation_email: ticket.escalationEmail || '',
    escalated: ticket.escalated || false,
    due_date: ticket.dueDate || null,
    tat_days: ticket.tatDays || 1,
    created_at: ticket.createdAt || new Date().toISOString(),
  }
}

// ─── Parent Tickets CRUD ──────────────────────────────────────────────────────

export async function fetchParentTickets() {
  const { data, error } = await supabase
    .from('hr_parent_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchParentTickets:', error); return [] }
  return (data || []).map(parentDbToApp)
}

export async function insertParentTicket(ticket) {
  const { error } = await supabase
    .from('hr_parent_tickets')
    .insert(parentAppToDb(ticket))
  if (error) { console.error('insertParentTicket:', error); return { error } }
  return { success: true }
}

export async function updateParentStatus(id, status, auditEntry) {
  const { data: existing, error: fetchErr } = await supabase
    .from('hr_parent_tickets')
    .select('audit_trail')
    .eq('id', id)
    .single()
  if (fetchErr) { console.error('updateParentStatus fetch:', fetchErr); return false }

  let trail = existing?.audit_trail || []
  if (typeof trail === 'string') { try { trail = JSON.parse(trail) } catch { trail = [] } }
  if (!Array.isArray(trail)) trail = []
  const updatedTrail = [...trail, auditEntry]
  const { error } = await supabase
    .from('hr_parent_tickets')
    .update({ status, audit_trail: updatedTrail })
    .eq('id', id)
  if (error) { console.error('updateParentStatus:', error); return false }
  return true
}

export async function updateParentChildren(id, childrenArray) {
  const { error } = await supabase
    .from('hr_parent_tickets')
    .update({ children: childrenArray })
    .eq('id', id)
  if (error) { console.error('updateParentChildren:', error); return false }
  return true
}

// ─── Child Tickets CRUD ───────────────────────────────────────────────────────

export async function fetchChildTickets() {
  const { data, error } = await supabase
    .from('hr_child_tickets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchChildTickets:', error); return [] }
  return (data || []).map(childDbToApp)
}

export async function insertChildTicket(ticket) {
  const { error } = await supabase
    .from('hr_child_tickets')
    .insert(childAppToDb(ticket))
  if (error) { console.error('insertChildTicket:', error); return false }
  return true
}

export async function insertChildTicketsBulk(tickets) {
  const rows = tickets.map(childAppToDb)
  const { error } = await supabase
    .from('hr_child_tickets')
    .insert(rows)
  if (error) { console.error('insertChildTicketsBulk:', error); return { error } }
  return { success: true }
}

export async function updateChildStatus(id, status, auditEntry) {
  const { data: existing, error: fetchErr } = await supabase
    .from('hr_child_tickets')
    .select('mandatory_remarks')
    .eq('id', id)
    .single()
  if (fetchErr) { console.error('updateChildStatus fetch:', fetchErr); return false }

  const updatedRemarks = [...(existing?.mandatory_remarks || []), auditEntry]
  const { error } = await supabase
    .from('hr_child_tickets')
    .update({ current_status: status, mandatory_remarks: updatedRemarks })
    .eq('id', id)
  if (error) { console.error('updateChildStatus:', error); return false }
  return true
}

export async function escalateChildTicket(id) {
  const { error } = await supabase
    .from('hr_child_tickets')
    .update({ escalated: true })
    .eq('id', id)
  if (error) { console.error('escalateChildTicket:', error); return false }
  return true
}

// ─── Departments CRUD ─────────────────────────────────────────────────────────

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('hr_departments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchDepartments:', error); return [] }
  return (data || []).map(departmentDbToApp)
}

export async function upsertDepartment(dept) {
  const row = {
    id: dept.id,
    name: dept.name,
    matrix_key: dept.matrixKey || dept.name,
    username: dept.username,
    password: dept.password,
    primary_email: dept.primaryEmail || '',
    escalation_email: dept.escalationEmail || '',
    created_at: dept.createdAt || new Date().toISOString(),
  }
  const { error } = await supabase
    .from('hr_departments')
    .upsert(row, { onConflict: 'id' })
  if (error) { console.error('upsertDepartment:', error); return false }
  return true
}

export async function deleteDepartment(id) {
  const { error } = await supabase
    .from('hr_departments')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteDepartment:', error); return false }
  return true
}

// ─── Role Matrix Config ───────────────────────────────────────────────────────

export async function fetchRoleMatrix() {
  const { data, error } = await supabase
    .from('hr_role_matrix')
    .select('matrix_data')
    .eq('id', 'default')
    .single()
  if (error) { console.error('fetchRoleMatrix:', error); return null }
  return data?.matrix_data || null
}

export async function updateRoleMatrix(matrix) {
  const { error } = await supabase
    .from('hr_role_matrix')
    .upsert({ id: 'default', matrix_data: matrix, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) { console.error('updateRoleMatrix:', error); return false }
  return true
}

// ─── Config Store (custom items, department emails) ───────────────────────────

export async function fetchConfig(key) {
  const { data, error } = await supabase
    .from('hr_config')
    .select('value')
    .eq('key', key)
    .single()
  if (error) { console.error('fetchConfig:', error); return null }
  return data?.value || null
}

export async function updateConfig(key, value) {
  const { error } = await supabase
    .from('hr_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) { console.error('updateConfig:', error); return false }
  return true
}

// ─── Realtime Subscriptions ───────────────────────────────────────────────────

export function subscribeToParentTickets(callback) {
  return supabase
    .channel('hr_parent_tickets_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_parent_tickets' }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        callback({ ...payload, new: parentDbToApp(payload.new) })
      } else if (payload.eventType === 'DELETE') {
        callback(payload)
      }
    })
    .subscribe()
}

export function subscribeToChildTickets(callback) {
  return supabase
    .channel('hr_child_tickets_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_child_tickets' }, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        callback({ ...payload, new: childDbToApp(payload.new) })
      } else if (payload.eventType === 'DELETE') {
        callback(payload)
      }
    })
    .subscribe()
}
