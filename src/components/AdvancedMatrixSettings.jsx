import React, { useState, useEffect } from 'react'
import { ROLE_MATRIX as DEFAULT } from '../config/roleMatrix'

const ROLE_MATRIX_KEY = 'hr_ticket_role_matrix'

function loadMatrix() {
  try {
    const raw = localStorage.getItem(ROLE_MATRIX_KEY)
    return raw ? JSON.parse(raw) : DEFAULT
  } catch {
    return DEFAULT
  }
}

export default function AdvancedMatrixSettings({ onSave }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setText(JSON.stringify(loadMatrix(), null, 2))
  }, [])

  const handleSave = () => {
    try {
      const parsed = JSON.parse(text)
      localStorage.setItem(ROLE_MATRIX_KEY, JSON.stringify(parsed))
      setError('')
      if (onSave) onSave(parsed)
    } catch (e) {
      setError('Invalid JSON: ' + e.message)
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-600">Role Matrix</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Advanced RL/Grade Matrix Settings</h2>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-600">Edit the role-to-department requirements as JSON. Each grade should map to departments and their items and TATs.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm" />
      {error && <div className="mt-2 text-sm text-rose-700">{error}</div>}
      <div className="mt-4 flex gap-2">
        <button onClick={handleSave} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save Matrix</button>
        <button onClick={() => setText(JSON.stringify(DEFAULT, null, 2))} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold">Reset to Default</button>
      </div>
    </div>
  )
}
