"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type ChatMessage = {
  id: string
  sender: "user" | "bot"
  text: string
  timestamp: string
  from: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function MessagesPage() {
  const { data, error } = useSWR<ChatMessage[]>("/api/messages", fetcher, { refreshInterval: 0 })
  const [query, setQuery] = useState("")

  // WebSocket live updates (optional: NEXT_PUBLIC_WS_URL)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL
    if (!url) {
      // Demo: simulate an incoming message occasionally
      const t = setInterval(() => {
        globalMutate(
          "/api/messages",
          (prev: ChatMessage[] | undefined) => {
            const next = prev ? [...prev] : []
            next.push({
              id: crypto.randomUUID(),
              sender: "user",
              text: "Hello from demo stream",
              timestamp: new Date().toISOString(),
              from: "+1234567890",
            })
            return next
          },
          false,
        )
      }, 15000)
      return () => clearInterval(t)
    }

    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(url)
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data)
          if (payload?.type === "message") {
            const msg = payload.data as ChatMessage
            globalMutate("/api/messages", (prev: ChatMessage[] | undefined) => (prev ? [...prev, msg] : [msg]), false)
          }
        } catch {
          // ignore malformed
        }
      }
    } catch {
      // ignore if cannot connect
    }
    return () => {
      try {
        ws?.close()
      } catch {}
    }
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.toLowerCase().trim()
    if (!q) return data
    return data.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        new Date(m.timestamp).toLocaleString().toLowerCase().includes(q),
    )
  }, [data, query])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by text, sender, or time..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {error ? (
            <div className="text-sm text-destructive">Failed to load messages.</div>
          ) : !data ? (
            <div className="h-24 animate-pulse rounded-md bg-muted" />
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No messages found.</div>
          ) : (
            filtered.map((m) => <Bubble key={m.id} msg={m} />)
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.sender === "bot"
  return (
    <div className={cn("flex w-full", isBot ? "justify-end" : "justify-start")}>
      <div
        className={cn("max-w-[80%] rounded-lg px-3 py-2 shadow-sm", isBot ? "bg-green-600 text-white" : "bg-muted")}
        role="group"
        aria-label={isBot ? "Bot message" : "User message"}
      >
        <div className="text-sm text-pretty">{msg.text}</div>
        <div className={cn("mt-1 text-[11px] opacity-80", isBot ? "text-white" : "text-muted-foreground")}>
          <span>{new Date(msg.timestamp).toLocaleString()}</span>
          <span className="mx-1">•</span>
          <span>{msg.from}</span>
        </div>
      </div>
    </div>
  )
}
