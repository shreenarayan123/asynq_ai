"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ConnectionIndicator } from "@/components/topbar/connection-indicator"

const nav = [
  { href: "/connection", label: "Connection" },
  { href: "/messages", label: "Messages" },
  { href: "/rules", label: "Rules" },
  { href: "/settings", label: "Settings" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-card/30">
        <div className="px-4 py-4">
          <h1 className="text-lg font-semibold text-balance">WhatsApp Auto-Reply</h1>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </div>
        <nav className="flex-1 px-2 py-2">
          <SidebarNav />
        </nav>
        <div className="px-4 py-3 border-t">
          <ConnectionIndicator />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3 px-3 py-2">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <div className="px-4 py-4 border-b">
                  <h2 className="text-base font-semibold">WhatsApp Auto-Reply</h2>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
                <nav className="px-2 py-2">
                  <SidebarNav />
                </nav>
                <div className="px-4 py-3 border-t">
                  <ConnectionIndicator />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center justify-between w-full">
              <div>
                <span className="font-semibold">Brew</span>
                <span className="sr-only"> app title</span>
              </div>
              <div className="hidden md:block">
                <ConnectionIndicator />
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}

function SidebarNav() {
  const pathname = usePathname()
  return (
    <ul className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname === item.href
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors",
                active ? "bg-muted font-medium" : "text-muted-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
