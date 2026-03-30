"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Trash2, Clock, Euro, Scissors, ToggleLeft, ToggleRight, Link as LinkIcon, CalendarOff, CreditCard, Pencil, Check, X, ExternalLink, Download, ChevronDown } from "lucide-react"
import { toast } from "@/components/ui/toaster"
import { SERVICE_TEMPLATES } from "@/lib/service-templates"

interface Service { id: string; name: string; description: string | null; category: string | null; duration: number; price: number; active: boolean }
interface ClosedDate { id: string; date: string; reason: string | null }
type HourEntry = { open: string; close: string; closed: boolean }
interface BookingSettings {
  bufferMinutes: number; minNoticeHours: number; maxDaysAhead: number
  breakStart: string; breakEnd: string; breakEnabled: boolean
  slotInterval: number
  paymentEnabled: boolean; depositType: "full" | "percent" | "fixed"; depositValue: number
  tableDuration: number
}

const DAYS: [string, string][] = [["monday","Lundi"],["tuesday","Mardi"],["wednesday","Mercredi"],["thursday","Jeudi"],["friday","Vendredi"],["saturday","Samedi"],["sunday","Dimanche"]]
const DEFAULT_HOURS: Record<string, HourEntry> = Object.fromEntries(DAYS.map(([k]) => [k, { open: "09:00", close: "18:00", closed: k === "sunday" }]))
const DEFAULT_SETTINGS: BookingSettings = {
  bufferMinutes: 0, minNoticeHours: 1, maxDaysAhead: 60,
  breakStart: "12:00", breakEnd: "13:00", breakEnabled: false,
  slotInterval: 30,
  paymentEnabled: false, depositType: "full", depositValue: 100,
  tableDuration: 90,
}
const SLOT_INTERVALS = [{ value: 15, label: "15 min" }, { value: 30, label: "30 min" }, { value: 60, label: "1 h" }]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

export default function ServicesPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [services, setServices]         = useState<Service[]>([])
  const [closedDates, setClosedDates]   = useState<ClosedDate[]>([])
  const [newClosed, setNewClosed]       = useState({ date: "", reason: "" })
  const [bookingEnabled, setBookingEnabled] = useState(false)
  const [bookingType, setBookingType]   = useState<"appointment" | "restaurant">("appointment")
  const [bookingMaxCovers, setBookingMaxCovers] = useState<number>(20)
  const [hours, setHours]               = useState<Record<string, HourEntry>>(DEFAULT_HOURS)
  const [settings, setSettings]         = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [pageSlug, setPageSlug]         = useState<string | null>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [dirty, setDirty]               = useState(false)

  // Service form
  const [form, setForm] = useState({ name: "", description: "", duration: "60", price: "", category: "" })
  const [adding, setAdding] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [importingTemplate, setImportingTemplate] = useState(false)

  // Service edit
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", description: "", duration: "", price: "", category: "" })
  const [savingService, setSavingService] = useState(false)

  function markDirty() { setDirty(true) }
  function setSetting<K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) {
    setSettings(s => ({ ...s, [key]: value })); markDirty()
  }

  const fetchData = useCallback(async () => {
    const [svcRes, pageRes, cdRes] = await Promise.all([
      fetch(`/api/services${bizParam}`),
      fetch(`/api/page${bizParam}`),
      fetch(`/api/closed-dates${bizParam}`),
    ])
    const [svcData, pageData, cdData] = await Promise.all([svcRes.json(), pageRes.json(), cdRes.json()])
    setServices(svcData.services ?? [])
    setBookingEnabled(!!svcData.bookingEnabled)
    setBookingType(svcData.bookingType ?? "appointment")
    setBookingMaxCovers(svcData.bookingMaxCovers ?? 20)
    if (svcData.bookingHours) setHours({ ...DEFAULT_HOURS, ...svcData.bookingHours })
    if (svcData.bookingSettings) setSettings({ ...DEFAULT_SETTINGS, ...svcData.bookingSettings })
    setClosedDates(cdData.closedDates ?? [])
    setPageSlug(pageData.pageSlug ?? null)
    setLoading(false)
    setDirty(false)
  }, [bizParam])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveSettings() {
    setSaving(true)
    await fetch(`/api/services${bizParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingEnabled, bookingHours: hours, bookingSettings: settings, bookingType, bookingMaxCovers }),
    })
    setSaving(false)
    setDirty(false)
    toast({ title: "Configuration sauvegardée", variant: "success" })
  }

  async function addService() {
    if (!form.name || !form.duration || form.price === "") return
    setAdding(true)
    const res = await fetch(`/api/services${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description || null, category: form.category || null, duration: Number(form.duration), price: Number(form.price) }),
    })
    const data = await res.json()
    if (res.ok) {
      setServices(prev => [...prev, data.service])
      setForm({ name: "", description: "", duration: "60", price: "", category: "" })
      toast({ title: "Prestation ajoutee", variant: "success" })
    }
    setAdding(false)
  }

  async function importTemplate(templateId: string) {
    const tpl = SERVICE_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return
    setImportingTemplate(true)
    const res = await fetch(`/api/services${bizParam}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ services: tpl.services.map(s => ({ ...s, price: 0 })) }),
    })
    if (res.ok) {
      await fetchData()
      toast({ title: `${tpl.label} importe`, variant: "success" })
      setShowTemplates(false)
    }
    setImportingTemplate(false)
  }

  async function saveServiceEdit(id: string) {
    setSavingService(true)
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description || null,
        category: editForm.category || null,
        duration: Number(editForm.duration),
        price: Number(editForm.price),
      }),
    })
    if (res.ok) {
      setServices(prev => prev.map(s => s.id === id ? {
        ...s, name: editForm.name,
        description: editForm.description || null,
        category: editForm.category || null,
        duration: Number(editForm.duration),
        price: Number(editForm.price),
      } : s))
      setEditingServiceId(null)
      toast({ title: "Prestation modifiee", variant: "success" })
    }
    setSavingService(false)
  }

  async function deleteService(id: string) {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" })
    if (res.ok) { setServices(prev => prev.filter(s => s.id !== id)); toast({ title: "Prestation supprimée", variant: "success" }) }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) })
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s))
  }

  async function addClosedDate() {
    if (!newClosed.date) return
    const res = await fetch(`/api/closed-dates${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClosed),
    })
    const data = await res.json()
    if (res.ok) {
      setClosedDates(prev => [...prev.filter(c => c.date !== newClosed.date), data.closedDate].sort((a, b) => a.date.localeCompare(b.date)))
      setNewClosed({ date: "", reason: "" })
      toast({ title: "Fermeture ajoutée", variant: "success" })
    }
  }

  async function removeClosedDate(date: string) {
    await fetch(`/api/closed-dates${bizParam}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date }) })
    setClosedDates(prev => prev.filter(c => c.date !== date))
    toast({ title: "Fermeture supprimée", variant: "success" })
  }

  const upcomingClosed = closedDates.filter(c => c.date >= todayStr())

  if (loading) return (
    <div className="space-y-4 animate-pulse max-w-3xl">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
    </div>
  )

  return (
    <div className="max-w-3xl pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuration des réservations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Paramétrez votre page de réservation en ligne</p>
        </div>
        {pageSlug && (
          <a href={`/book/${pageSlug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Voir la page
          </a>
        )}
      </div>

      <div className="space-y-5">

        {/* ── 1. Activation ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Réservations en ligne</p>
              <p className="text-sm text-slate-500 mt-0.5">Vos clients peuvent réserver depuis votre page publique</p>
            </div>
            <button onClick={() => { setBookingEnabled(!bookingEnabled); markDirty() }}>
              {bookingEnabled ? <ToggleRight className="w-8 h-8 text-sky-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-900 mb-2">Type d&apos;établissement</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "appointment", label: "Salon / Rendez-vous", icon: "✂️", desc: "Prestations, prestataires, créneaux personnalisés" },
                { value: "restaurant",  label: "Restaurant / Table",  icon: "🍽️", desc: "Couverts, créneaux fixes, durée de table" },
              ].map(opt => (
                <button key={opt.value} onClick={() => { setBookingType(opt.value as "appointment" | "restaurant"); markDirty() }}
                  className={`p-3.5 rounded-xl border text-left transition-all ${bookingType === opt.value ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <p className={`font-semibold text-sm ${bookingType === opt.value ? "text-sky-700" : "text-slate-700"}`}>{opt.icon} {opt.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2a. Prestations (salon seulement) ─────────────────────────────────── */}
        {bookingType === "appointment" && (() => {
          // Group services by category
          const catMap = new Map<string, Service[]>()
          const uncategorized: Service[] = []
          for (const svc of services) {
            if (svc.category) {
              if (!catMap.has(svc.category)) catMap.set(svc.category, [])
              catMap.get(svc.category)!.push(svc)
            } else {
              uncategorized.push(svc)
            }
          }
          const existingCategories = Array.from(catMap.keys()).sort()

          function ServiceRow({ svc }: { svc: Service }) {
            const isEditing = editingServiceId === svc.id
            return (
              <div className={`px-5 py-3.5 ${!svc.active ? "opacity-50" : ""}`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Nom" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description (optionnel)" className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      <input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="Categorie (optionnel)" list="cat-list"
                        className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="number" value={editForm.duration} onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))}
                          placeholder="Duree (min)" className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      </div>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                          placeholder="Prix" className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveServiceEdit(svc.id)} disabled={savingService}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors disabled:opacity-60">
                        <Check className="w-3.5 h-3.5" /> Valider
                      </button>
                      <button onClick={() => setEditingServiceId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors">
                        <X className="w-3.5 h-3.5" /> Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{svc.name}</p>
                      {svc.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{svc.description}</p>}
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration} min</span>
                        <span className="text-xs font-semibold text-sky-600">{svc.price.toFixed(2)} &euro;</span>
                        {svc.category && <span className="text-xs text-slate-400 px-1.5 py-0.5 rounded bg-slate-100">{svc.category}</span>}
                      </div>
                    </div>
                    <button onClick={() => { setEditingServiceId(svc.id); setEditForm({ name: svc.name, description: svc.description ?? "", duration: String(svc.duration), price: String(svc.price), category: svc.category ?? "" }) }}
                      className="p-1.5 text-slate-300 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(svc.id, svc.active)}>
                      {svc.active ? <ToggleRight className="w-6 h-6 text-sky-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                    </button>
                    <button onClick={() => deleteService(svc.id)} className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          }

          return (
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <datalist id="cat-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-sky-500" />
                <p className="font-semibold text-slate-900">Prestations</p>
                <span className="ml-auto text-xs text-slate-400">{services.filter(s => s.active).length} active{services.filter(s => s.active).length > 1 ? "s" : ""}</span>
                <button onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Templates
                </button>
              </div>

              {/* Template import */}
              {showTemplates && (
                <div className="px-5 py-4 bg-sky-50/50 border-b border-sky-100">
                  <p className="text-xs font-semibold text-sky-700 mb-3">Importer un template metier (les prix sont a 0, modifiez-les ensuite)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SERVICE_TEMPLATES.map(tpl => (
                      <button key={tpl.id} onClick={() => importTemplate(tpl.id)} disabled={importingTemplate}
                        className="flex items-start gap-3 p-3 rounded-xl border border-sky-200 bg-white hover:border-sky-400 text-left transition-all disabled:opacity-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900">{tpl.label}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                          <p className="text-xs text-sky-600 mt-1">{tpl.services.length} prestations</p>
                        </div>
                        <Plus className="w-4 h-4 text-sky-500 flex-shrink-0 mt-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Service list grouped by category */}
              <div>
                {services.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Aucune prestation. Importez un template ou ajoutez-en manuellement.</p>
                )}

                {/* Categorized services */}
                {existingCategories.map(cat => (
                  <div key={cat}>
                    <div className="px-5 py-2.5 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{cat}</p>
                      <span className="text-xs text-slate-400 ml-auto">{catMap.get(cat)!.length}</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {catMap.get(cat)!.map(svc => <ServiceRow key={svc.id} svc={svc} />)}
                    </div>
                  </div>
                ))}

                {/* Uncategorized services */}
                {uncategorized.length > 0 && (
                  <div>
                    {existingCategories.length > 0 && (
                      <div className="px-5 py-2.5 bg-slate-50 border-y border-slate-100 flex items-center gap-2">
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Sans categorie</p>
                        <span className="text-xs text-slate-400 ml-auto">{uncategorized.length}</span>
                      </div>
                    )}
                    <div className="divide-y divide-slate-50">
                      {uncategorized.map(svc => <ServiceRow key={svc.id} svc={svc} />)}
                    </div>
                  </div>
                )}
              </div>

              {/* Add form */}
              <div className="border-t border-dashed border-slate-200 px-5 py-4 space-y-2 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nouvelle prestation</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom (ex: Coupe femme)"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                  <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Categorie (optionnel)" list="cat-list"
                    className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Duree (min)"
                      className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                  </div>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Prix"
                      className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
                  </div>
                </div>
                <button onClick={addService} disabled={adding || !form.name || !form.price}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                  <Plus className="w-4 h-4" /> Ajouter la prestation
                </button>
              </div>
            </section>
          )
        })()}

        {/* ── 2b. Config restaurant ─────────────────────────────────────────────── */}
        {bookingType === "restaurant" && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <p className="font-semibold text-slate-900 flex items-center gap-2">🍽️ Configuration restaurant</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Capacité maximale</p>
                <p className="text-xs text-slate-500 mt-0.5">Nombre de couverts max par créneau (toutes tables confondues)</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="1" value={bookingMaxCovers}
                  onChange={e => { setBookingMaxCovers(Number(e.target.value)); markDirty() }}
                  className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <span className="text-sm text-slate-500">couverts</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Durée d&apos;occupation d&apos;une table</p>
                <p className="text-xs text-slate-500 mt-0.5">Temps avant que la table se libère pour un autre groupe</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="30" step="15" value={settings.tableDuration}
                  onChange={e => setSetting("tableDuration", Number(e.target.value))}
                  className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <span className="text-sm text-slate-500">min</span>
              </div>
            </div>
          </section>
        )}

        {/* ── 3. Horaires d'ouverture ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" />
            <p className="font-semibold text-slate-900">Horaires d&apos;ouverture</p>
          </div>
          <div className="divide-y divide-slate-50 px-5">
            {DAYS.map(([key, label]) => {
              const entry = hours[key] ?? { open: "09:00", close: "18:00", closed: false }
              return (
                <div key={key} className="flex items-center gap-3 py-3">
                  <span className="w-24 text-sm font-medium text-slate-700">{label}</span>
                  {entry.closed ? (
                    <span className="text-sm text-slate-400 flex-1">Fermé</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={entry.open} onChange={e => { setHours(h => ({ ...h, [key]: { ...entry, open: e.target.value } })); markDirty() }}
                        className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      <span className="text-slate-400">–</span>
                      <input type="time" value={entry.close} onChange={e => { setHours(h => ({ ...h, [key]: { ...entry, close: e.target.value } })); markDirty() }}
                        className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                    <input type="checkbox" checked={!!entry.closed} onChange={e => { setHours(h => ({ ...h, [key]: { ...entry, closed: e.target.checked } })); markDirty() }} className="rounded" />
                    Fermé
                  </label>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 4. Règles (salon seulement) ───────────────────────────────────────── */}
        {bookingType === "appointment" && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-sky-500" />
              <p className="font-semibold text-slate-900">Règles de réservation</p>
            </div>
            <div className="px-5 divide-y divide-slate-50">

              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Grille de créneaux</p>
                  <p className="text-xs text-slate-500 mt-0.5">Fréquence d&apos;affichage des créneaux (indépendant de la durée des prestations)</p>
                </div>
                <div className="flex gap-1">
                  {SLOT_INTERVALS.map(opt => (
                    <button key={opt.value} onClick={() => setSetting("slotInterval", opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${settings.slotInterval === opt.value ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Temps tampon entre RDV</p>
                  <p className="text-xs text-slate-500 mt-0.5">Temps de préparation entre chaque client</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" step="5" value={settings.bufferMinutes}
                    onChange={e => setSetting("bufferMinutes", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  <span className="text-sm text-slate-500 whitespace-nowrap">min</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Délai minimum de réservation</p>
                  <p className="text-xs text-slate-500 mt-0.5">Les clients ne peuvent pas réserver à moins de X heures</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={settings.minNoticeHours}
                    onChange={e => setSetting("minNoticeHours", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  <span className="text-sm text-slate-500 whitespace-nowrap">h</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Fenêtre de réservation</p>
                  <p className="text-xs text-slate-500 mt-0.5">Jusqu&apos;à combien de jours à l&apos;avance peut-on réserver</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" value={settings.maxDaysAhead}
                    onChange={e => setSetting("maxDaysAhead", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  <span className="text-sm text-slate-500 whitespace-nowrap">jours</span>
                </div>
              </div>

              <div className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Pause déjeuner</p>
                    <p className="text-xs text-slate-500 mt-0.5">Aucun créneau pendant cette plage</p>
                  </div>
                  <button onClick={() => setSetting("breakEnabled", !settings.breakEnabled)}>
                    {settings.breakEnabled ? <ToggleRight className="w-7 h-7 text-sky-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                  </button>
                </div>
                {settings.breakEnabled && (
                  <div className="flex items-center gap-3">
                    <input type="time" value={settings.breakStart} onChange={e => setSetting("breakStart", e.target.value)}
                      className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    <span className="text-slate-400">–</span>
                    <input type="time" value={settings.breakEnd} onChange={e => setSetting("breakEnd", e.target.value)}
                      className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── 5. Fermetures exceptionnelles ────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-sky-500" />
            <p className="font-semibold text-slate-900">Fermetures exceptionnelles</p>
            <span className="text-xs text-slate-400 ml-1">Congés, jours fériés…</span>
          </div>
          <div className="px-5 py-3 space-y-2">
            {upcomingClosed.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Aucune fermeture planifiée</p>
            )}
            {upcomingClosed.map(c => (
              <div key={c.date} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(c.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  {c.reason && <p className="text-xs text-slate-400 mt-0.5">{c.reason}</p>}
                </div>
                <button onClick={() => removeClosedDate(c.date)} className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-slate-200 px-5 py-4 space-y-2 bg-slate-50/50">
            <div className="flex gap-2">
              <input type="date" value={newClosed.date} onChange={e => setNewClosed(f => ({ ...f, date: e.target.value }))}
                min={todayStr()}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
              <input value={newClosed.reason} onChange={e => setNewClosed(f => ({ ...f, reason: e.target.value }))} placeholder="Motif (optionnel)"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" />
            </div>
            <button onClick={addClosedDate} disabled={!newClosed.date}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
              <Plus className="w-4 h-4" /> Ajouter la fermeture
            </button>
          </div>
        </section>

        {/* ── 6. Paiement (salon seulement) ─────────────────────────────────────── */}
        {bookingType === "appointment" && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-500" />
              <p className="font-semibold text-slate-900">Paiement en ligne</p>
              <span className="text-xs text-slate-400 ml-1">Stripe Connect requis dans Paramètres</span>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Activer le paiement à la réservation</p>
                  <p className="text-xs text-slate-500 mt-0.5">Le client paie (ou laisse un acompte) lors de la réservation</p>
                </div>
                <button onClick={() => setSetting("paymentEnabled", !settings.paymentEnabled)}>
                  {settings.paymentEnabled ? <ToggleRight className="w-7 h-7 text-sky-500" /> : <ToggleLeft className="w-7 h-7 text-slate-300" />}
                </button>
              </div>

              {settings.paymentEnabled && (
                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Type de paiement</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: "full",    label: "Total",        desc: "100% du prix" },
                        { value: "percent", label: "Acompte %",    desc: `${settings.depositValue}%` },
                        { value: "fixed",   label: "Acompte fixe", desc: `${settings.depositValue} €` },
                      ] as const).map(opt => (
                        <button key={opt.value} onClick={() => setSetting("depositType", opt.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${settings.depositType === opt.value ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:border-slate-300"}`}>
                          <p className={`text-sm font-semibold ${settings.depositType === opt.value ? "text-sky-700" : "text-slate-700"}`}>{opt.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {settings.depositType !== "full" && (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-slate-700 flex-1">
                        {settings.depositType === "percent" ? "Pourcentage de l'acompte" : "Montant fixe"}
                      </p>
                      <div className="flex items-center gap-1">
                        <input type="number" min="1" max={settings.depositType === "percent" ? 100 : 9999}
                          value={settings.depositValue} onChange={e => setSetting("depositValue", Number(e.target.value))}
                          className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
                        <span className="text-sm text-slate-500">{settings.depositType === "percent" ? "%" : "€"}</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    💡 Le RDV est automatiquement confirmé après paiement. Frais Stripe : 1,4% + 0,10€. Aucune commission Reputix.
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ── Sticky save button ────────────────────────────────────────────────── */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 px-4 py-4 bg-white/90 backdrop-blur border-t border-slate-200">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">Vous avez des modifications non sauvegardées</p>
            <div className="flex gap-2">
              <button onClick={() => { fetchData() }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={saveSettings} disabled={saving}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
