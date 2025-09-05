"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { io, Socket } from 'socket.io-client'

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
  const { data, error } = useSWR<ChatMessage[]>("/api/messages", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds as backup
    revalidateOnFocus: false, // Don't revalidate on focus since we have WebSocket
  })
  const [query, setQuery] = useState("")

  // Socket.IO live updates for real-time messages
  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
    let socket: Socket | null = null

    const connectSocket = () => {
      try {
        socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
        })

        socket.on('connect', () => {
          console.log('Socket.IO connected')
        })

        socket.on('newMessage', (message: ChatMessage) => {
          console.log('Received new message:', message)
          globalMutate("/api/messages", (prev: ChatMessage[] | undefined) => {
            const messages = prev ? [...prev] : []
            // Avoid duplicates by checking if message already exists
            const exists = messages.find(m => m.id === message.id)
            if (exists) return messages
            return [...messages, message].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
          }, false)
        })

        socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason)
          // Socket.IO will automatically try to reconnect
        })

        socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error)
        })

      } catch (error) {
        console.error('Failed to connect Socket.IO:', error)
      }
    }

    connectSocket()

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect()
      }
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
