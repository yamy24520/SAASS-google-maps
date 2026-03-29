"use client"

import Image from "next/image"
import { signOut } from "next-auth/react"
import { LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppTopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

export function AppTopbar({ user }: AppTopbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-200 bg-white flex-shrink-0">
      {/* Logo visible only on mobile (sidebar hidden on mobile) */}
      <div className="lg:hidden flex items-center gap-2">
        <Image src="/logo.png" alt="Reputix" width={28} height={28} className="rounded-lg" />
        <span className="font-bold text-slate-900 text-base">Reputix</span>
      </div>
      <div className="hidden lg:block" />

      {/* User info + logout — desktop only (mobile: in drawer) */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-slate-900">{user.name ?? "Utilisateur"}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </div>
        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-sm">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Se déconnecter"
          className="hidden lg:inline-flex"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
        </Button>
      </div>
    </header>
  )
}
