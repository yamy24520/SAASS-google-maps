"use client"

import { use, useState } from "react"

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;background:#070711;color:#e8e8ff;min-height:100svh}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
`

export default function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [phase, setPhase] = useState<"idle" | "scanning" | "done" | "error">("idle")
  const [progress, setProgress] = useState("")
  const [result, setResult] = useState<{ categoriesAdded: number; totalCategories: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [photos, setPhotos] = useState<string[]>([])

  function compressImage(file: File): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new window.Image()
        img.onload = () => {
          const maxW = 1200, maxH = 1600
          const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
          const w = Math.round(img.width * ratio)
          const h = Math.round(img.height * ratio)
          const canvas = document.createElement("canvas")
          canvas.width = w; canvas.height = h
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL("image/jpeg", 0.82))
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleFiles(files: FileList) {
    if (!files.length) return
    setPhase("scanning")
    setProgress("Compression des photos...")

    const fileArr = Array.from(files)
    const previews: string[] = []

    for (let i = 0; i < fileArr.length; i++) {
      setProgress(`Photo ${i + 1}/${fileArr.length} — Analyse IA...`)
      const compressed = await compressImage(fileArr[i])
      previews.push(compressed)
      setPhotos(prev => [...prev, compressed])

      const base64 = compressed.split(",")[1]
      const res = await fetch("/api/scan-token/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, imageBase64: base64, mediaType: "image/jpeg" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Erreur lors de l'analyse")
        setPhase("error")
        return
      }
      setResult(data)
    }

    setPhase("done")
  }

  return (
    <div style={{ minHeight: "100svh", background: "#070711", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 0 40px" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ width: "100%", padding: "20px 24px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx={12} cy={13} r={3} stroke="#fff" strokeWidth={1.5}/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#e8e8ff" }}>Scanner la carte</p>
          <p style={{ fontSize: 12, color: "rgba(232,232,255,0.5)" }}>Propulsé par Reputix</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ width: "100%", maxWidth: 480, padding: "32px 20px 0", animation: "fadeUp 0.5s ease" }}>

        {phase === "idle" && (
          <>
            <div style={{ background: "#0e0e1f", borderRadius: 24, padding: "28px 24px", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 16, textAlign: "center" }}>📸</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 10, textAlign: "center" }}>
                Importer votre carte
              </h1>
              <p style={{ color: "rgba(232,232,255,0.6)", fontSize: 14, lineHeight: 1.65, textAlign: "center", marginBottom: 24 }}>
                Prenez en photo votre carte ou importez des images depuis votre galerie.
                L'IA extrait automatiquement tous les plats et prix.
              </p>

              {/* Primary CTA — camera */}
              <label style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "18px", borderRadius: 16,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
                marginBottom: 12, boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
              }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx={12} cy={13} r={3} stroke="#fff" strokeWidth={1.8}/>
                </svg>
                Prendre une photo
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }} />
              </label>

              {/* Secondary CTA — gallery */}
              <label style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "16px", borderRadius: 16,
                background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)",
                color: "rgba(232,232,255,0.8)", fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <rect x={3} y={3} width={18} height={18} rx={3} stroke="currentColor" strokeWidth={1.5}/>
                  <circle cx={8.5} cy={8.5} r={1.5} fill="currentColor"/>
                  <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
                </svg>
                Depuis la galerie
                <input type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }} />
              </label>
            </div>

            <p style={{ color: "rgba(232,232,255,0.3)", fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
              Vous pouvez ajouter plusieurs photos pour couvrir toute la carte.
              Les résultats s'ajoutent automatiquement à votre page.
            </p>
          </>
        )}

        {phase === "scanning" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: "3px solid rgba(99,102,241,0.2)", borderTopColor: "#6366f1",
              animation: "spin 0.8s linear infinite", margin: "0 auto 24px",
            }} />
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Analyse en cours...</p>
            <p style={{ color: "rgba(232,232,255,0.5)", fontSize: 14, animation: "pulse 1.5s ease-in-out infinite" }}>{progress}</p>

            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
                {photos.map((p, i) => (
                  <img key={i} src={p} style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", opacity: 0.7 }} />
                ))}
              </div>
            )}
          </div>
        )}

        {phase === "done" && result && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.5s ease" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px", fontSize: 36,
            }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Carte importée !</h2>
            <p style={{ color: "rgba(232,232,255,0.6)", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              <strong style={{ color: "#22c55e" }}>{result.totalCategories} catégorie{result.totalCategories > 1 ? "s" : ""}</strong> ajoutée{result.totalCategories > 1 ? "s" : ""} sur votre page de réputation.
            </p>

            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28, flexWrap: "wrap" }}>
                {photos.map((p, i) => (
                  <img key={i} src={p} style={{ width: 80, height: 80, borderRadius: 14, objectFit: "cover" }} />
                ))}
              </div>
            )}

            {/* Add more */}
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 28px", borderRadius: 14,
              background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)",
              color: "rgba(232,232,255,0.8)", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              + Ajouter d'autres photos
              <input type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }}
                onChange={e => {
                  if (e.target.files?.length) {
                    setPhotos([])
                    setPhase("idle")
                    setTimeout(() => { if (e.target.files) handleFiles(e.target.files) }, 50)
                  }
                }} />
            </label>
          </div>
        )}

        {phase === "error" && (
          <div style={{ textAlign: "center", animation: "fadeUp 0.5s ease" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Une erreur est survenue</h2>
            <p style={{ color: "rgba(232,232,255,0.5)", fontSize: 14, marginBottom: 28 }}>{errorMsg}</p>
            <button onClick={() => { setPhase("idle"); setPhotos([]) }} style={{
              padding: "14px 28px", borderRadius: 14, background: "#6366f1",
              color: "#fff", fontWeight: 700, fontSize: 15, border: "none", cursor: "pointer",
            }}>
              Réessayer
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
