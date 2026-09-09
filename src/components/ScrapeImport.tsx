"use client"
import { useState } from "react"

export function ScrapeImport() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<{ businessId: string; inserted: number; stored: number; answered: number; announced: number; stopReason: string } | null>(null)
  return <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2">
    <h2 className="font-semibold">Collecteur Maps — prototype</h2>
    <p className="text-sm text-slate-600">Recherchez votre établissement, lancez le collecteur dans votre navigateur puis importez son fichier JSON. Les avis et réponses restent séparés par établissement.</p>
    <p className="text-sm text-amber-800">La collecte peut être partielle. Elle est lancée sur votre ordinateur ; actualiser cette page ne collecte pas de nouveaux avis.</p>
    <form className="flex gap-2" action="https://www.google.com/maps/search/" target="_blank" rel="noopener noreferrer">
      <input type="hidden" name="api" value="1" />
      <input aria-label="Nom et ville de l’établissement" className="min-w-0 flex-1 rounded border p-2 text-sm" name="query" value={query} onChange={e => setQuery(e.target.value)} placeholder="Grill In, Limoges" required />
      <button className="rounded bg-sky-700 px-3 py-2 text-sm text-white" type="submit">Ouvrir dans Maps</button>
    </form>
    <a className="text-sm text-sky-700 underline" href="/reputix-collecteur.zip" download>Télécharger le collecteur et ses instructions</a>
    <label className="block text-sm font-medium">Importer une collecte
      <input className="block mt-2" type="file" accept=".json,application/json" disabled={busy} onChange={async e => {
        const file = e.target.files?.[0]; if (!file) return
        setBusy(true); setResult(null); setMessage("Import en cours…")
        try {
          if (file.size > 3_500_000) throw new Error("Fichier limité à 3,5 Mo")
          const response = await fetch("/api/reviews/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || "Import impossible")
          setResult(result)
          setMessage("Import terminé")
        } catch (error) { setMessage(error instanceof Error ? error.message : "Import impossible") }
        finally { setBusy(false) }
      }} />
    </label>
    {message && <p role="status" className="text-sm">{message}</p>}
    {result && <div className="rounded border bg-white p-3 text-sm space-y-1" role="status">
      <p>{result.inserted} nouveaux avis · {result.stored} avis enregistrés sur {result.announced} annoncés par Google · {result.answered} avec une réponse.</p>
      {result.stored < result.announced && <p className="text-amber-800">Collecte partielle : des avis restent à récupérer.</p>}
      <p>Fin de collecte : {result.stopReason}</p>
      <a className="text-sky-700 underline" href={`/reviews?biz=${encodeURIComponent(result.businessId)}`}>Voir les avis de cet établissement</a>
    </div>}
  </section>
}
