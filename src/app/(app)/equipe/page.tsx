"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Trash2, Pencil, Check, X, Calendar, Copy, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Star } from "lucide-react"
import { toast } from "@/components/ui/toaster"

interface Staff {
  id: string
  name: string
  color: string
  active: boolean
  calendarToken: string | null
}

interface StaffAbsence {
  id: string
  staffId: string
  startDate: string
  endDate: string
  reason: string | null
  type: "VACATION" | "SICK" | "OTHER"
}

const ABSENCE_TYPES = [
  { value: "VACATION", label: "🏖️ Congés" },
  { value: "SICK",     label: "🤒 Maladie" },
  { value: "OTHER",    label: "📌 Autre" },
] as const

const ABSENCE_COLORS: Record<string, string> = {
  VACATION: "bg-blue-50 border-blue-200 text-blue-700",
  SICK:     "bg-rose-50 border-rose-200 text-rose-700",
  OTHER:    "bg-slate-50 border-slate-200 text-slate-600",
}

const PRESET_COLORS = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
  "#6366f1", "#84cc16", "#06b6d4", "#a855f7",
]

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

export default function EquipePage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [staffs, setStaffs]         = useState<Staff[]>([])
  const [absences, setAbsences]     = useState<StaffAbsence[]>([])
  const [staffTokens, setStaffTokens] = useState<Record<string, string>>({})
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [tab, setTab]               = useState<"equipe" | "stats">("equipe")
  const [statsData, setStatsData]   = useState<any[]>([])
  const [loadingStats, setLoadingStats] = useState(false)

  // Add form
  const [newName, setNewName]   = useState("")
  const [newColor, setNewColor] = useState("#0ea5e9")
  const [adding, setAdding]     = useState(false)

  // Edit state
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editName, setEditName]       = useState("")
  const [editColor, setEditColor]     = useState("")
  const [savingEdit, setSavingEdit]   = useState(false)

  // Absence form per staff
  const [absForm, setAbsForm] = useState<Record<string, {
    startDate: string; endDate: string; reason: string; type: string
  }>>({})

  const APP_URL = typeof window !== "undefined" ? window.location.origin : ""

  const fetchAll = useCallback(async () => {
    const [sRes, aRes, tRes] = await Promise.all([
      fetch(`/api/staff${bizParam}`),
      fetch(`/api/staff/absences${bizParam}`),
      fetch(`/api/calendar/token${bizParam}`),
    ])
    const [sData, aData, tData] = await Promise.all([sRes.json(), aRes.json(), tRes.json()])
    setStaffs(sData.staffs ?? [])
    setAbsences(aData.absences ?? [])
    // Build map staffId -> calendarUrl
    const map: Record<string, string> = {}
    for (const st of tData.staffTokens ?? []) {
      map[st.id] = `${APP_URL}/api/calendar/${st.token}`
    }
    setStaffTokens(map)
    setLoading(false)
  }, [bizParam, APP_URL])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function fetchStats() {
    setLoadingStats(true)
    const res = await fetch(`/api/staff/stats${bizParam}`)
    const data = await res.json()
    setStatsData(data.stats ?? [])
    setLoadingStats(false)
  }

  useEffect(() => {
    if (tab === "stats") fetchStats()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addStaff() {
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch(`/api/staff${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    })
    const data = await res.json()
    if (res.ok) {
      setStaffs(prev => [...prev, data.staff])
      setNewName(""); setNewColor("#0ea5e9")
      toast({ title: "Employé ajouté", variant: "success" })
    }
    setAdding(false)
  }

  async function saveEdit(id: string) {
    setSavingEdit(true)
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    })
    if (res.ok) {
      setStaffs(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim(), color: editColor } : s))
      setEditingId(null)
      toast({ title: "Modifié", variant: "success" })
    }
    setSavingEdit(false)
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    })
    setStaffs(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s))
  }

  async function deleteStaff(id: string) {
    if (!confirm("Supprimer cet employé ? Ses RDVs resteront mais sans prestataire assigné.")) return
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" })
    if (res.ok) {
      setStaffs(prev => prev.filter(s => s.id !== id))
      setAbsences(prev => prev.filter(a => a.staffId !== id))
      toast({ title: "Employé supprimé", variant: "success" })
    }
  }

  async function addAbsence(staffId: string) {
    const f = absForm[staffId]
    if (!f?.startDate || !f?.endDate) return
    const res = await fetch(`/api/staff/absences${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, startDate: f.startDate, endDate: f.endDate, reason: f.reason || null, type: f.type || "VACATION" }),
    })
    const data = await res.json()
    if (res.ok) {
      setAbsences(prev => [...prev, data.absence])
      setAbsForm(prev => ({ ...prev, [staffId]: { startDate: "", endDate: "", reason: "", type: "VACATION" } }))
      toast({ title: "Absence ajoutée", variant: "success" })
    }
  }

  async function removeAbsence(id: string) {
    await fetch(`/api/staff/absences${bizParam}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setAbsences(prev => prev.filter(a => a.id !== id))
    toast({ title: "Absence supprimée", variant: "success" })
  }

  async function copyCalendarUrl(staffId: string) {
    const url = staffTokens[staffId]
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiedId(staffId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function initAbsForm(staffId: string) {
    if (!absForm[staffId]) {
      setAbsForm(prev => ({ ...prev, [staffId]: { startDate: "", endDate: "", reason: "", type: "VACATION" } }))
    }
  }

  if (loading) return (
    <div className="space-y-3 animate-pulse max-w-2xl">
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-200" />)}
    </div>
  )

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Équipe</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gérez vos employés, leurs absences et leur sync calendrier</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([["equipe", "Équipe"], ["stats", "Statistiques"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {key === "stats" && <TrendingUp className="w-3.5 h-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {/* ── Stats view ── */}
      {tab === "stats" && (
        <div className="space-y-4">
          {loadingStats ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
            </div>
          ) : statsData.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200">
              <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucune donnée disponible</p>
              <p className="text-xs text-slate-400 mt-1">Les statistiques apparaissent dès les premières réservations</p>
            </div>
          ) : (
            <>
              {/* Top performer badge */}
              {(() => {
                const top = [...statsData].sort((a, b) => b.thisMonth.ca - a.thisMonth.ca)[0]
                if (!top || top.thisMonth.ca === 0) return null
                return (
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-amber-900 text-sm">Top performer ce mois</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        <span className="font-bold">{top.name}</span> — {top.thisMonth.ca.toFixed(0)} € · {top.thisMonth.confirmed} RDV confirmés
                      </p>
                    </div>
                  </div>
                )
              })()}

              {statsData.map((s) => {
                const trend = s.thisMonth.ca - s.prevMonth.ca
                const trendPct = s.prevMonth.ca > 0 ? Math.round((trend / s.prevMonth.ca) * 100) : null

                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    {/* Staff header */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: s.color }}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.allTime.total} RDV au total · {s.allTime.cancellationRate}% annulation</p>
                      </div>
                      {trendPct !== null && (
                        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {trend >= 0 ? "+" : ""}{trendPct}%
                        </div>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-emerald-600">{s.thisMonth.ca.toFixed(0)} €</p>
                        <p className="text-xs text-slate-500 mt-0.5">CA ce mois</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-slate-900">{s.thisMonth.confirmed}</p>
                        <p className="text-xs text-slate-500 mt-0.5">RDV confirmés</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-sky-600">{s.prevMonth.ca.toFixed(0)} €</p>
                        <p className="text-xs text-slate-500 mt-0.5">Mois précédent</p>
                      </div>
                    </div>

                    {/* Top service */}
                    {s.topService && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                        <span>Service le plus demandé : <strong className="text-slate-700">{s.topService.name}</strong> ({s.topService.count}×)</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {tab === "equipe" && <>
      {/* ── Staff list ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {staffs.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-400 text-sm">Aucun employé. Ajoutez-en un ci-dessous.</p>
          </div>
        )}

        {staffs.map(s => {
          const isExpanded = expandedId === s.id
          const isEditing  = editingId === s.id
          const staffAbsences = absences.filter(a => a.staffId === s.id && a.endDate >= todayStr())
          const f = absForm[s.id] ?? { startDate: "", endDate: "", reason: "", type: "VACATION" }

          return (
            <div key={s.id} className={`rounded-2xl border transition-all ${s.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"}`}>
              {/* Header row */}
              <div className="flex items-center gap-3 p-4">
                {/* Color dot / edit color */}
                {isEditing ? (
                  <div className="relative flex-shrink-0">
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      className="w-9 h-9 rounded-full border-0 cursor-pointer p-0"
                      title="Changer la couleur"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm" style={{ background: s.color }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(s.id); if (e.key === "Escape") setEditingId(null) }}
                      className="w-full px-2 py-1 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      autoFocus
                    />
                  ) : (
                    <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">{s.active ? `${staffAbsences.length > 0 ? `${staffAbsences.length} absence${staffAbsences.length > 1 ? "s" : ""} planifiée${staffAbsences.length > 1 ? "s" : ""}` : "Actif"}` : "Inactif"}</p>
                </div>

                {/* Color presets when editing */}
                {isEditing && (
                  <div className="flex gap-1 flex-wrap max-w-[120px]">
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${editColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(s.id)} disabled={savingEdit}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(s.id); setEditName(s.name); setEditColor(s.color) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(s.id, s.active)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${s.active ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"}`}>
                        {s.active ? "Actif" : "Inactif"}
                      </button>
                      <button onClick={() => deleteStaff(s.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setExpandedId(isExpanded ? null : s.id); initAbsForm(s.id) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">

                  {/* Sync calendrier */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Sync calendrier
                    </p>
                    {staffTokens[s.id] ? (
                      <div className="flex items-center gap-2">
                        <input readOnly value={staffTokens[s.id]} className="flex-1 px-3 py-2 text-xs text-slate-500 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none truncate" />
                        <button onClick={() => copyCalendarUrl(s.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${copiedId === s.id ? "bg-emerald-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}>
                          {copiedId === s.id ? <><Check className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Lien non disponible</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1.5">Ce lien montre uniquement les RDVs de {s.name}. À coller dans Apple Calendar, Google Calendar ou Outlook.</p>
                  </div>

                  {/* Absences */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Absences planifiées</p>

                    {staffAbsences.length === 0 && (
                      <p className="text-xs text-slate-400 mb-2">Aucune absence prévue</p>
                    )}

                    <div className="space-y-1.5 mb-3">
                      {staffAbsences.map(ab => {
                        const typeObj = ABSENCE_TYPES.find(t => t.value === ab.type)
                        return (
                          <div key={ab.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${ABSENCE_COLORS[ab.type]}`}>
                            <span className="font-medium">{typeObj?.label}</span>
                            <span className="text-slate-500">·</span>
                            <span>{fmtDate(ab.startDate)} → {fmtDate(ab.endDate)}</span>
                            {ab.reason && <span className="text-slate-400 truncate flex-1">— {ab.reason}</span>}
                            <button onClick={() => removeAbsence(ab.id)} className="ml-auto text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    {/* Absence form */}
                    <div className="border border-dashed border-slate-200 rounded-xl p-3 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-400">Planifier une absence</p>
                      <div className="flex gap-1">
                        {ABSENCE_TYPES.map(t => (
                          <button key={t.value} onClick={() => setAbsForm(prev => ({ ...prev, [s.id]: { ...f, type: t.value } }))}
                            className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-medium border transition-all ${f.type === t.value ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={f.startDate} min={todayStr()}
                          onChange={e => setAbsForm(prev => ({ ...prev, [s.id]: { ...f, startDate: e.target.value } }))}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        <input type="date" value={f.endDate} min={f.startDate || todayStr()}
                          onChange={e => setAbsForm(prev => ({ ...prev, [s.id]: { ...f, endDate: e.target.value } }))}
                          className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      </div>
                      <input value={f.reason} onChange={e => setAbsForm(prev => ({ ...prev, [s.id]: { ...f, reason: e.target.value } }))}
                        placeholder="Motif (optionnel)"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      <button onClick={() => addAbsence(s.id)} disabled={!f.startDate || !f.endDate}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold disabled:opacity-40 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Ajouter l&apos;absence
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Add staff form ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-dashed border-slate-300 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Ajouter un employé</p>
        <div className="flex gap-3 items-start">
          <div className="flex-1 space-y-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addStaff() }}
              placeholder="Prénom ou nom complet"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${newColor === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-lg" style={{ background: newColor }}>
            {newName.charAt(0).toUpperCase() || "?"}
          </div>
        </div>
        <button onClick={addStaff} disabled={adding || !newName.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm disabled:opacity-40 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      </>}
    </div>
  )
}
