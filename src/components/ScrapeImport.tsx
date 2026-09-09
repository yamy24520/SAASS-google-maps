"use client"
import { useState } from "react"

export function ScrapeImport() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  return <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
    <h2 className="font-semibold">Collecte directe depuis Google Maps</h2>
    <p className="text-sm text-slate-600">Ouvrez la fiche dans Chrome connecté, collectez les avis avec le collecteur Reputix puis importez son fichier JSON. Les avis et réponses restent séparés par établissement.</p>
    <a className="text-sm text-sky-700 underline" href="/reputix-collecteur.zip" download>Télécharger le collecteur et ses instructions</a>
    <label className="block text-sm font-medium">Importer une collecte
      <input className="block mt-2" type="file" accept=".json,application/json" disabled={busy} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return
        setBusy(true); setMessage("Import en cours…")
        try {
          if (file.size > 3_500_000) throw new Error("Fichier limité à 3,5 Mo")
          const response = await fetch("/api/reviews/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || "Import impossible")
          window.location.assign(`/reviews?biz=${encodeURIComponent(result.businessId)}`)
        } catch (error) { setMessage(error instanceof Error ? error.message : "Import impossible") }
        finally { setBusy(false) }
      }} />
    </label>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>
}
