import { ROLE_MATRIX as DEFAULT_MATRIX } from '../config/roleMatrix'

export default function RoleMatrix({ selectedGrade, onChange, roleMatrix }) {
  const matrix = roleMatrix || DEFAULT_MATRIX

  return (
    <div className="space-y-3">
      <label className="space-y-2 text-sm text-slate-700">
        Grade
        <select value={selectedGrade} onChange={(e) => onChange(e.target.value)} className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
          <option value="">Select grade</option>
          {Object.keys(matrix).map((g) => (
            <option key={g} value={g}>{matrix[g].label}</option>
          ))}
        </select>
      </label>

      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
        <div className="text-slate-600">Role requirements preview</div>
        <div className="mt-2 space-y-2">
          {Object.keys(matrix).map((g) => (
            <div key={g} className={`p-3 rounded-lg ${selectedGrade === g ? 'bg-white shadow' : ''}`}>
              <div className="font-semibold text-slate-900">{matrix[g].label}</div>
              <div className="text-xs text-slate-500 mt-1">Required by departments:</div>
              <ul className="mt-2 ml-4 list-disc text-sm text-slate-700">
                {(matrix[g].required || []).map((r) => (
                  <li key={r.department}>{r.department}: {r.items.join(', ')} (TAT {r.tatDays}d)</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
