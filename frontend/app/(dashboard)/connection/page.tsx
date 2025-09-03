"use client"

import useSWR from "swr"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

type ConnResponse = { status: "connected" | "disconnected"; qr?: string }

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function ConnectionPage() {
  const { toast } = useToast()
  const { data, isLoading, mutate } = useSWR<ConnResponse>("/api/connection", fetcher, {
    refreshInterval: 5000,
  })

  async function onReconnect() {
    const res = await fetch("/api/connection/reconnect", { method: "POST" })
    if (res.ok) {
      toast({ title: "Reconnection triggered", description: "Scan the new QR code to connect." })
      mutate()
    } else {
      toast({ title: "Failed to reconnect", variant: "destructive" })
    }
  }

  const status = data?.status ?? "disconnected"

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Connection</CardTitle>
          <CardDescription>Scan the QR code to connect your bot.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="h-60 w-60 animate-pulse rounded-md bg-muted" aria-label="Loading QR" />
          ) : status === "connected" ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Your bot is connected.</p>
            </div>
          ) : (
            <>
              <Image
                src={data?.qr || "/placeholder.svg?height=240&width=240&query=whatsapp%20qr%20code"}
                alt="WhatsApp QR code"
                width={240}
                height={240}
                className="rounded-md border"
              />
              <p className="text-sm text-muted-foreground">Open WhatsApp → Linked Devices → Link a Device → Scan</p>
            </>
          )}
          <Button onClick={onReconnect} className="bg-green-600 hover:bg-green-700">
            Reconnect
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Connection status and details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <StatusRow label="State" value={status === "connected" ? "Connected" : "Disconnected"} />
          <StatusRow label="Last Sync" value={new Date().toLocaleString()} />
          <StatusRow label="Bot" value={status === "connected" ? "Ready" : "Waiting for link"} />
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
