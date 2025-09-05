"use client"

import Image from "next/image"
import { useWhatsAppConnection } from "@/hooks/use-whatsapp-connection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function ConnectionPage() {
  const { toast } = useToast()
  const { connectionStatus, isLoading, reconnect } = useWhatsAppConnection()

  async function onReconnect() {
    const success = await reconnect()
    if (success) {
      toast({ title: "Reconnection triggered", description: "Scan the new QR code to connect." })
    } else {
      toast({ title: "Failed to reconnect", variant: "destructive" })
    }
  }

  const status = connectionStatus.status

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
              {connectionStatus.qr ? (
                // Display the actual QR code as an image from the data URL received from backend
                <div className="rounded-md border p-2">
                  <img 
                    src={connectionStatus.qr} 
                    alt="WhatsApp QR code" 
                    width={240}
                    height={240}
                    className="bg-white"
                  />
                  <p className="mt-2 text-xs text-center text-green-600">QR Code Ready - Scan Now!</p>
                </div>
              ) : isLoading ? (
                <div className="h-60 w-60 flex items-center justify-center bg-gray-100 animate-pulse rounded-md">
                  <p className="text-gray-500">Generating QR code...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Image
                    src="/placeholder.svg?height=240&width=240&query=whatsapp%20qr%20code"
                    alt="WhatsApp QR code placeholder"
                    width={240}
                    height={240}
                    className="rounded-md border"
                  />
                  <p className="text-xs text-red-500">QR code not available. Click reconnect to generate one.</p>
                </div>
              )}
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
