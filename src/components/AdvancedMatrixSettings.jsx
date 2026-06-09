import React, { useState, useEffect } from 'react'
import { ROLE_MATRIX as DEFAULT } from '../config/roleMatrix'

const ROLE_MATRIX_KEY = 'hr_role_matrix'
const CUSTOM_ITEMS_KEY = 'hr_ticket_custom_items'
const DEPARTMENT_EMAILS_KEY = 'hr_ticket_department_emails'

const DEFAULT_CUSTOM_ITEMS = [
  { name: 'Laptop', department: 'IT', category: 'Hardware' },
  { name: 'Access', department: 'IT', category: 'Software' },
  { name: 'Diary', department: 'Admin', category: 'Stationery' },
  { name: 'Pen', department: 'Admin', category: 'Stationery' },
  { name: 'Stationery', department: 'Admin', category: 'Stationery' },
]

const DEFAULT_DEPARTMENT_EMAILS = {
  IT: 'it@example.com',
  Admin: 'admin@example.com',
  Payroll: 'payroll@example.com',
  Onboarding: 'onboarding@example.com',
  Compliance: 'compliance@example.com',
  Finance: 'finance@example.com',
  "Onboarding Matrix": 'onboarding.matrix@example.com',
}

function loadMatrix() {
  try {
    const raw = localStorage.getItem(ROLE_MATRIX_KEY)
    return raw ? JSON.parse(raw) : DEFAULT
  } catch {
    return DEFAULT
  }
}

function loadCustomItems() {
  try {
    const raw = localStorage.getItem(CUSTOM_ITEMS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_CUSTOM_ITEMS
  } catch {
    return DEFAULT_CUSTOM_ITEMS
  }
}

function loadDepartmentEmails() {
  try {
    const raw = localStorage.getItem(DEPARTMENT_EMAILS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_DEPARTMENT_EMAILS
  } catch {
    return DEFAULT_DEPARTMENT_EMAILS
  }
}

export default function AdvancedMatrixSettings({ onSave }) {
  const [matrix, setMatrix] = useState(loadMatrix())
  const [customItems, setCustomItems] = useState(loadCustomItems())
  const [departmentEmails, setDepartmentEmails] = useState(loadDepartmentEmails())
  
  // Dynamic Item Fields
  const [newItemName, setNewItemName] = useState('')
  const [newItemDept, setNewItemDept] = useState('IT')

  // New Grade Fields
  const [selectedGrade, setSelectedGrade] = useState('RL5')
  const [newGradeId, setNewGradeId] = useState('')
  const [newGradeLabel, setNewGradeLabel] = useState('')

  // Department Email Fields
  const [selectedEmailDept, setSelectedEmailDept] = useState('IT')
  const [newEmail, setNewEmail] = useState('')

  // JSON view toggle
  const [showRawJson, setShowRawJson] = useState(false)
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setRawText(JSON.stringify(matrix, null, 2))
  }, [matrix])

  // Save changes
  const updateMatrix = (newMatrix) => {
    setMatrix(newMatrix)
    localStorage.setItem(ROLE_MATRIX_KEY, JSON.stringify(newMatrix))
    if (onSave) onSave(newMatrix)
  }

  // Dynamic Item Management
  const handleAddCustomItem = (e) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    
    const name = newItemName.trim()
    if (customItems.some(item => item.name.toLowerCase() === name.toLowerCase() && item.department === newItemDept)) {
      setError(`"${name}" is already assigned to the ${newItemDept} department.`)
      return
    }

    const updatedItems = [...customItems, { name, department: newItemDept }]
    setCustomItems(updatedItems)
    localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(updatedItems))
    setNewItemName('')
    setError('')
  }

  const handleRemoveCustomItem = (name, dept) => {
    const updatedItems = customItems.filter(item => !(item.name === name && item.department === dept))
    setCustomItems(updatedItems)
    localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(updatedItems))
  }

  // Add a new grade
  const handleCreateGrade = (e) => {
    e.preventDefault()
    const id = newGradeId.trim().toUpperCase()
    const label = newGradeLabel.trim()
    if (!id || !label) {
      setError('Grade ID and Label are required to create a grade.')
      return
    }
    if (matrix[id]) {
      setError(`Grade with ID "${id}" already exists.`)
      return
    }

    const updatedMatrix = {
      ...matrix,
      [id]: {
        label,
        required: []
      }
    }
    updateMatrix(updatedMatrix)
    setSelectedGrade(id)
    setNewGradeId('')
    setNewGradeLabel('')
    setError('')
  }

  // Delete a grade
  const handleDeleteGrade = (gradeId) => {
    if (Object.keys(matrix).length <= 1) {
      setError('You must keep at least one grade in the matrix.')
      return
    }
    const updatedMatrix = { ...matrix }
    delete updatedMatrix[gradeId]
    updateMatrix(updatedMatrix)
    // Select first remaining grade
    setSelectedGrade(Object.keys(updatedMatrix)[0])
    setError('')
  }

  // Toggle item checkbox inside a grade
  const handleToggleItem = (gradeId, dept, itemName) => {
    const currentGradeData = matrix[gradeId] || { label: gradeId, required: [] }
    const requirements = [...currentGradeData.required]
    
    const deptReqIndex = requirements.findIndex(r => r.department === dept)
    
    if (deptReqIndex > -1) {
      const deptReq = { ...requirements[deptReqIndex] }
      let items = [...deptReq.items]
      if (items.includes(itemName)) {
        items = items.filter(i => i !== itemName)
      } else {
        items.push(itemName)
      }
      
      if (items.length === 0) {
        // Remove department entirely if no items checked
        requirements.splice(deptReqIndex, 1)
      } else {
        deptReq.items = items
        requirements[deptReqIndex] = deptReq
      }
    } else {
      // Create new department entry
      requirements.push({
        department: dept,
        items: [itemName],
        tatDays: 3 // default TAT
      })
    }

    const updatedMatrix = {
      ...matrix,
      [gradeId]: {
        ...currentGradeData,
        required: requirements
      }
    }
    updateMatrix(updatedMatrix)
  }

  // Edit TAT for a department in a grade
  const handleUpdateTAT = (gradeId, dept, tatVal) => {
    const currentGradeData = matrix[gradeId]
    if (!currentGradeData) return

    const requirements = [...currentGradeData.required]
    const deptReqIndex = requirements.findIndex(r => r.department === dept)

    const parsedTAT = parseInt(tatVal, 10) || 1

    if (deptReqIndex > -1) {
      requirements[deptReqIndex] = {
        ...requirements[deptReqIndex],
        tatDays: parsedTAT
      }
    } else {
      requirements.push({
        department: dept,
        items: [],
        tatDays: parsedTAT
      })
    }

    const updatedMatrix = {
      ...matrix,
      [gradeId]: {
        ...currentGradeData,
        required: requirements
      }
    }
    updateMatrix(updatedMatrix)
  }

  // Department Email Management
  const handleUpdateDepartmentEmail = (e) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    const updatedEmails = {
      ...departmentEmails,
      [selectedEmailDept]: newEmail.trim(),
    }
    setDepartmentEmails(updatedEmails)
    localStorage.setItem(DEPARTMENT_EMAILS_KEY, JSON.stringify(updatedEmails))
    setNewEmail('')
    setError('')
  }

  // Save JSON manually
  const handleSaveRaw = () => {
    try {
      const parsed = JSON.parse(rawText)
      updateMatrix(parsed)
      setError('')
    } catch (e) {
      setError('Invalid JSON format: ' + e.message)
    }
  }

  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to restore defaults? All custom configurations will be replaced.')) {
      updateMatrix(DEFAULT)
      setCustomItems(DEFAULT_CUSTOM_ITEMS)
      localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(DEFAULT_CUSTOM_ITEMS))
      setDepartmentEmails(DEFAULT_DEPARTMENT_EMAILS)
      localStorage.setItem(DEPARTMENT_EMAILS_KEY, JSON.stringify(DEFAULT_DEPARTMENT_EMAILS))
      setSelectedGrade('RL5')
      setError('')
    }
  }

  const activeGradeData = matrix[selectedGrade] || { label: '', required: [] }
  const uniqueDepartments = Array.from(new Set(['IT', 'Admin', 'Payroll', 'Onboarding', 'Compliance', 'Finance', 'Onboarding Matrix', ...customItems.map(item => item.department)]))

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700 flex justify-between items-center animate-fade-in shadow-sm">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-800 font-semibold">Dismiss</button>
        </div>
      )}

      {/* Grid container for management & mapping split */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Dynamic Asset/Item Manager Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Asset Inventory
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-900">Dynamic Asset Management</h3>
              <p className="mt-1 text-sm text-slate-500">Add custom items & map them to a department.</p>
            </div>

            <form onSubmit={handleAddCustomItem} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Item Name</label>
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Macbook Pro, Biometric Card"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Department Owner</label>
                <select
                  value={newItemDept}
                  onChange={(e) => setNewItemDept(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                >
                  <option value="IT">IT</option>
                  <option value="Admin">Admin</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Finance">Finance</option>
                  <option value="Onboarding Matrix">Onboarding Matrix</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 text-sm shadow-sm transition duration-200 flex items-center justify-center gap-2"
              >
                <span>+ Add Custom Item</span>
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Currently Configured Assets</h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {customItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm border border-slate-100 group">
                    <div>
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-indigo-600 font-medium">{item.department}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomItem(item.name, item.department)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create Grade form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Add New Grade</h3>
            <p className="text-sm text-slate-500 mt-1">Add a level / grade to include in onboarding.</p>
            
            <form onSubmit={handleCreateGrade} className="mt-4 space-y-3">
              <input
                value={newGradeId}
                onChange={(e) => setNewGradeId(e.target.value)}
                placeholder="e.g. RL3, RL6"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <input
                value={newGradeLabel}
                onChange={(e) => setNewGradeLabel(e.target.value)}
                placeholder="e.g. Senior Associate (RL3)"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 text-xs transition duration-200"
              >
                Create Grade
              </button>
            </form>
          </div>

          {/* Department Email Manager */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Email Configuration
              </span>
              <h3 className="mt-3 text-xl font-bold text-slate-900">Department Email Management</h3>
              <p className="mt-1 text-sm text-slate-500">Configure email addresses for each department.</p>
            </div>

            <form onSubmit={handleUpdateDepartmentEmail} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Department</label>
                <select
                  value={selectedEmailDept}
                  onChange={(e) => setSelectedEmailDept(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                >
                  {uniqueDepartments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={departmentEmails[selectedEmailDept]}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-sm shadow-sm transition duration-200 flex items-center justify-center gap-2"
              >
                <span>Update Email</span>
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Current Department Emails</h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {Object.entries(departmentEmails).map(([dept, email]) => (
                  <div key={dept} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm border border-slate-100">
                    <div>
                      <div className="font-semibold text-slate-800">{dept}</div>
                      <div className="text-xs text-emerald-600 font-medium">{email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grade Matrix Mapping Builder Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                  Grade SLA Mapping
                </span>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">Grade Matrix Mapping</h3>
                <p className="mt-1 text-sm text-slate-500">Configure requirements dynamically for selected employee grades.</p>
              </div>

              {/* Grade Selector */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  {Object.keys(matrix).map((g) => (
                    <option key={g} value={g}>{matrix[g].label || g}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDeleteGrade(selectedGrade)}
                  className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 p-2.5 text-xs font-semibold hover:bg-rose-100 transition"
                  title="Delete Selected Grade"
                >
                  Delete Grade
                </button>
              </div>
            </div>

            {/* Matrix Visual Grid Builder */}
            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-900 mb-4">
                Requirement Mapping for <span className="text-indigo-600 font-extrabold">{activeGradeData.label}</span>
              </h4>

              <div className="grid gap-6 md:grid-cols-2">
                {uniqueDepartments.map((dept) => {
                  const deptReq = activeGradeData.required?.find(r => r.department === dept) || { items: [], tatDays: 3 }
                  const deptItems = customItems.filter(item => item.department === dept)

                  return (
                    <div key={dept} className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm flex flex-col justify-between">
                      <div>
                        {/* Dept Header & TAT SLA */}
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-base font-extrabold text-slate-900">{dept} SLA</span>
                          
                          {/* SLA / TAT Control */}
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-xl">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SLA TAT:</span>
                            <input
                              type="number"
                              min="1"
                              value={deptReq.tatDays}
                              onChange={(e) => handleUpdateTAT(selectedGrade, dept, e.target.value)}
                              className="w-12 bg-white text-center rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-slate-600">days</span>
                          </div>
                        </div>

                        {/* Items checkboxes */}
                        <div className="space-y-2 mt-2">
                          {deptItems.length === 0 ? (
                            <p className="text-xs italic text-slate-400">No items configured under {dept}. Add some on the left.</p>
                          ) : (
                            deptItems.map((item, idx) => {
                              const isChecked = deptReq.items?.includes(item.name) || false
                              return (
                                <label key={idx} className={`flex items-center gap-3 rounded-xl p-2.5 border transition cursor-pointer text-sm ${isChecked ? 'bg-indigo-50/50 border-indigo-150 text-slate-900 font-semibold' : 'bg-slate-50/30 border-slate-100 hover:bg-slate-50 text-slate-600'}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleItem(selectedGrade, dept, item.name)}
                                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                  />
                                  <span>{item.name}</span>
                                </label>
                              )
                            })
                          )}
                        </div>
                      </div>

                      {/* Summary indicator */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                        <span>Items checked:</span>
                        <span className="font-semibold text-indigo-600">{deptReq.items?.length || 0} active</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Advanced Collapsible options */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Advanced / Raw Controls</h3>
            <p className="text-sm text-slate-500 mt-1">Directly edit raw matrix JSON or reset values to defaults.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="rounded-xl border border-slate-250 px-4 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              {showRawJson ? 'Hide JSON Editor' : 'Show JSON Editor'}
            </button>
            <button
              onClick={handleResetDefaults}
              className="rounded-xl border border-rose-200 text-rose-600 bg-rose-50 px-4 py-2 text-xs font-semibold hover:bg-rose-100 transition"
            >
              Reset to System Defaults
            </button>
          </div>
        </div>

        {showRawJson && (
          <div className="mt-5 space-y-4">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleSaveRaw}
              className="rounded-xl bg-slate-950 text-white px-5 py-2 text-xs font-semibold hover:bg-slate-900"
            >
              Save Raw JSON Changes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
