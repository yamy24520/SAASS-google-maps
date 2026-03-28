"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Trash2, Clock, Euro, Scissors, ToggleLeft, ToggleRight, Link as LinkIcon, Settings2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toaster"

interface Service { id: string; name: string; description: string | null; duration: number; price: number; active: boolean }
type HourEntry = { open: string; close: string; closed: boolean }
interface BookingSettings { bufferMinutes: number; minNoticeHours: number; maxDaysAhead: number; breakStart: string; breakEnd: string; breakEnabled: boolean }

const DAYS: [string, string][] = [["monday","Lundi"],["tuesday","Mardi"],["wednesday","Mercredi"],["thursday","Jeudi"],["friday","Vendredi"],["saturday","Samedi"],["sunday","Dimanche"]]
const DEFAULT_HOURS: Record<string, HourEntry> = Object.fromEntries(DAYS.map(([k]) => [k, { open: "09:00", close: "18:00", closed: k === "sunday" }]))
const DEFAULT_SETTINGS: BookingSettings = { bufferMinutes: 0, minNoticeHours: 1, maxDaysAhead: 60, breakStart: "12:00", breakEnd: "13:00", breakEnabled: false }

export default function ServicesPage() {
  const searchParams = useSearchParams()
  const bizParam = searchParams.get("biz") ? `?biz=${searchParams.get("biz")}` : ""

  const [services, setServices] = useState<Service[]>([])
  const [bookingEnabled, setBookingEnabled] = useState(false)
  const [hours, setHours] = useState<Record<string, HourEntry>>(DEFAULT_HOURS)
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageSlug, setPageSlug] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", description: "", duration: "60", price: "" })
  const [adding, setAdding] = useState(false)

  async function fetchData() {
    const [svcRes, pageRes] = await Promise.all([
      fetch(`/api/services${bizParam}`),
      fetch(`/api/page${bizParam}`),
    ])
    const svcData = await svcRes.json()
    const pageData = await pageRes.json()
    setServices(svcData.services ?? [])
    setBookingEnabled(!!svcData.bookingEnabled)
    if (svcData.bookingHours) setHours({ ...DEFAULT_HOURS, ...svcData.bookingHours })
    if (svcData.bookingSettings) setSettings({ ...DEFAULT_SETTINGS, ...svcData.bookingSettings })
    setPageSlug(pageData.pageSlug ?? null)
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    await fetch(`/api/services${bizParam}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingEnabled, bookingHours: hours, bookingSettings: settings }),
    })
    setSaving(false)
    toast({ title: "Paramètres sauvegardés", variant: "success" })
  }

  async function addService() {
    if (!form.name || !form.duration || form.price === "") return
    setAdding(true)
    const res = await fetch(`/api/services${bizParam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description || null, duration: Number(form.duration), price: Number(form.price) }),
    })
    const data = await res.json()
    if (res.ok) {
      setServices(prev => [...prev, data.service])
      setForm({ name: "", description: "", duration: "60", price: "" })
      toast({ title: "Service ajouté", variant: "success" })
    } else {
      toast({ title: data.error, variant: "destructive" })
    }
    setAdding(false)
  }

  async function deleteService(id: string) {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" })
    if (res.ok) { setServices(prev => prev.filter(s => s.id !== id)); toast({ title: "Service supprimé", variant: "success" }) }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) })
    setServices(prev => prev.map(s => s.id === id ? { ...s, active: !active } : s))
  }

  function setSetting<K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  useEffect(() => { fetchData() }, [bizParam]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200" />)}
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Services & Horaires</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configurez vos prestations et vos disponibilités</p>
        </div>
        {pageSlug && (
          <a href={`/book/${pageSlug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <LinkIcon className="w-3 h-3" /> Page réservation
            </Button>
          </a>
        )}
      </div>

      {/* Activation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">Réservations en ligne</p>
              <p className="text-sm text-slate-500 mt-0.5">Vos clients peuvent réserver depuis votre page publique</p>
            </div>
            <button onClick={() => setBookingEnabled(!bookingEnabled)}>
              {bookingEnabled ? <ToggleRight className="w-8 h-8 text-sky-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scissors className="w-4 h-4 text-sky-500" /> Mes prestations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Aucune prestation. Ajoutez-en une ci-dessous.</p>}
          {services.map(svc => (
            <div key={svc.id} className={`flex items-center gap-3 p-3 rounded-xl border ${svc.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{svc.name}</p>
                {svc.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{svc.description}</p>}
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration} min</span>
                  <span className="text-xs font-semibold text-sky-600">{svc.price.toFixed(2)} €</span>
                </div>
              </div>
              <button onClick={() => toggleActive(svc.id, svc.active)}>
                {svc.active ? <ToggleRight className="w-6 h-6 text-sky-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
              </button>
              <button onClick={() => deleteService(svc.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {/* Add form */}
          <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-2 mt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nouvelle prestation</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom (ex: Coupe femme)"
                className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optionnel)"
                className="col-span-2 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Durée (min)"
                  className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Prix"
                  className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>
            <Button size="sm" className="gap-2 w-full" onClick={addService} disabled={adding || !form.name || !form.price}>
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Horaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-sky-500" /> Horaires d&apos;ouverture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DAYS.map(([key, label]) => {
              const entry = hours[key] ?? { open: "09:00", close: "18:00", closed: false }
              return (
                <div key={key} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="w-24 text-sm font-medium text-slate-700">{label}</span>
                  {entry.closed ? (
                    <span className="text-sm text-slate-400 flex-1">Fermé</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={entry.open} onChange={e => setHours(h => ({ ...h, [key]: { ...entry, open: e.target.value } }))}
                        className="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                      <span className="text-slate-400">–</span>
                      <input type="time" value={entry.close} onChange={e => setHours(h => ({ ...h, [key]: { ...entry, close: e.target.value } }))}
                        className="px-2 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500" />
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={!!entry.closed} onChange={e => setHours(h => ({ ...h, [key]: { ...entry, closed: e.target.checked } }))} className="rounded" />
                    Fermé
                  </label>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Paramètres avancés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="w-4 h-4 text-sky-500" /> Paramètres avancés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Buffer */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Temps tampon entre RDV</p>
              <p className="text-xs text-slate-500 mt-0.5">Temps de nettoyage / préparation entre chaque client</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="5" value={settings.bufferMinutes}
                onChange={e => setSetting("bufferMinutes", Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <span className="text-sm text-slate-500 whitespace-nowrap">min</span>
            </div>
          </div>

          {/* Délai minimum */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Délai minimum de réservation</p>
              <p className="text-xs text-slate-500 mt-0.5">Les clients ne peuvent pas réserver moins de X heures à l'avance</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={settings.minNoticeHours}
                onChange={e => setSetting("minNoticeHours", Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <span className="text-sm text-slate-500 whitespace-nowrap">h</span>
            </div>
          </div>

          {/* Fenêtre max */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Fenêtre de réservation</p>
              <p className="text-xs text-slate-500 mt-0.5">Jusqu'à combien de jours à l'avance peut-on réserver</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="1" value={settings.maxDaysAhead}
                onChange={e => setSetting("maxDaysAhead", Number(e.target.value))}
                className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <span className="text-sm text-slate-500 whitespace-nowrap">jours</span>
            </div>
          </div>

          {/* Pause déjeuner */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Pause déjeuner</p>
                <p className="text-xs text-slate-500 mt-0.5">Aucun créneau proposé pendant la pause</p>
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
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? "Sauvegarde..." : "Sauvegarder tous les paramètres"}
      </Button>
    </div>
  )
}
