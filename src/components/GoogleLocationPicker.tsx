"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function GoogleLocationPicker({ bizParam }: { bizParam: string }) {
  const [locations, setLocations] = useState<{ id: string; title: string; city: string }[]>([])
  const [selected, setSelected] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  async function load() {
    setBusy(true)
    setMessage("")
    try {
      const res = await fetch(`/api/google/locations${bizParam}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLocations(data.locations)
      setSelected(data.selected ?? "")
      if (!data.locations.length) setMessage("Aucun établissement accessible. Vérifiez que ce compte Google gère votre fiche.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossible de charger les établissements.") }
    finally { setBusy(false) }
  }
  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/google/locations${bizParam}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locationId: selected }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage("Établissement sélectionné. Vous pouvez synchroniser vos avis depuis le tableau de bord.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "La sélection a échoué.") }
    finally { setBusy(false) }
  }
  return <div className="space-y-3">
    <p className="text-xs text-slate-500">Sélectionnez la fiche que vous gérez pour récupérer et publier vos avis avec Google, sans Outscraper.</p>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={load}>{busy ? "Chargement…" : "Choisir mon établissement Google"}</Button>
    {locations.length > 0 && <div className="flex gap-2 flex-wrap">
      <select aria-label="Établissement Google" className="border rounded-lg p-2 max-w-full text-sm" value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">Sélectionner un établissement</option>
        {locations.map(location => <option key={location.id} value={location.id}>{location.title} {location.city}</option>)}
      </select>
      <Button type="button" size="sm" disabled={busy || !selected} onClick={save}>Enregistrer</Button>
    </div>}
    {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
  </div>
}
