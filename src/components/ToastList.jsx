import React from 'react'

export default function ToastList({ list, onRemove }) {
  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-3">
      {list.map((toast) => (
        <div key={toast.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">📧 Email Notification</div>
              <p className="mt-2 text-sm text-slate-700">{toast.message}</p>
            </div>
            <button type="button" onClick={() => onRemove(toast.id)} className="text-slate-400 transition hover:text-slate-700">×</button>
          </div>
        </div>
      ))}
    </div>
  )
}
