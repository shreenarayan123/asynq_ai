"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Coffee } from "lucide-react"
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
        <div className="px-6 py-8 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <Coffee className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                Brew
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                AI Assistant
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6">
          <SidebarNav />
        </nav>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <ConnectionIndicator />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
          <div className="flex items-center gap-4 px-6 py-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon" aria-label="Open navigation" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <div className="px-6 py-8 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                        <Coffee className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                        Brew
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        AI Assistant
                      </p>
                    </div>
                  </div>
                </div>
                <nav className="px-4 py-6">
                  <SidebarNav />
                </nav>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <ConnectionIndicator />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-3">
                  <div>
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                      Dashboard
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Brewing intelligent responses
                    </p>
                  </div>
                </div>
                <div className="md:hidden">
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                    Brew
                  </h2>
                </div>
              </div>
              <div className="hidden md:block">
                <ConnectionIndicator />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <div className="space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarNav() {
  const pathname = usePathname()
  return (
    <ul className="flex flex-col gap-2">
      {nav.map((item) => {
        const active = pathname === item.href
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "group flex items-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
                active 
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 text-amber-700 dark:text-amber-300 shadow-sm border border-amber-200/50 dark:border-amber-800/30" 
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full mr-3 transition-all duration-200",
                active 
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm" 
                  : "bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500"
              )} />
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
