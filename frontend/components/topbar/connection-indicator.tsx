"use client"

import useSWR from "swr"
import { cn } from "@/lib/utils"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export function ConnectionIndicator() {
  const { data } = useSWR<{ status: "connected" | "disconnected" }>("/api/connection", fetcher, {
    refreshInterval: 5000,
  })
  const status = data?.status || "disconnected"
  const isUp = status === "connected"
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <span
        className={cn("inline-block h-2.5 w-2.5 rounded-full", isUp ? "bg-green-600" : "bg-gray-300")}
        aria-hidden
      />
      <span className="text-sm">{isUp ? "Connected" : "Disconnected"}</span>
    </div>
  )
}
