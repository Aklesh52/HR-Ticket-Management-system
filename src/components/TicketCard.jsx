import React from 'react'

export default function TicketCard({ ticket, onUpdateStatus, onForceEscalate, getNow }) {
  const isOverdue = ticket.dueDate ? new Date(ticket.dueDate) < getNow() && ticket.status !== 'Resolved' : false

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">{ticket.category}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{ticket.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {ticket.escalated && <span className="rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-semibold">ESCALATED TO SUPERIOR</span>}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ticket.status === 'Open' ? 'bg-amber-100 text-amber-800' : ticket.status === 'In Progress' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>{ticket.status}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-700">{ticket.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>Submitted {new Date(ticket.createdAt).toLocaleString()}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">Created by {ticket.createdBy}</span>
        {ticket.dueDate && (
          <span className={`rounded-full px-3 py-1 ${isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-slate-100'}`}>
            Due {new Date(ticket.dueDate).toLocaleDateString()}{isOverdue ? ' • Overdue' : ''}
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {ticket.status !== 'In Progress' && ticket.status !== 'Resolved' && (
          <button type="button" onClick={() => onUpdateStatus(ticket.id, 'In Progress')} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">Mark In Progress</button>
        )}
        {ticket.status !== 'Resolved' && (
          <button type="button" onClick={() => onUpdateStatus(ticket.id, 'Resolved')} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Mark Resolved</button>
        )}
        <button onClick={() => onForceEscalate(ticket.id)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Force Escalation</button>
      </div>
    </article>
  )
}
