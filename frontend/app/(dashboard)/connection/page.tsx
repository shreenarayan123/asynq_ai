"use client"

import Image from "next/image"
import { useWhatsAppConnection } from "@/hooks/use-whatsapp-connection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Smartphone, Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, QrCode } from "lucide-react"

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className={`p-3 rounded-full ${status === "connected" ? "bg-green-100 dark:bg-green-900/20" : "bg-slate-100 dark:bg-slate-800"}`}>
            {status === "connected" ? (
              <Wifi className="h-8 w-8 text-green-600" />
            ) : (
              <WifiOff className="h-8 w-8 text-slate-500" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              WhatsApp Connection
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
              Connect your WhatsApp to start brewing responses
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* QR Code Section */}
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">QR Code Scanner</CardTitle>
                <CardDescription className="text-base">
                  Scan with your WhatsApp mobile app
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative">
              {isLoading ? (
                <div className="h-64 w-64 animate-pulse rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center shadow-inner" aria-label="Loading QR">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
                    <p className="text-sm font-medium text-slate-500">Generating QR...</p>
                  </div>
                </div>
              ) : status === "connected" ? (
                <div className="h-64 w-64 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex flex-col items-center justify-center border-2 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400">Connected!</p>
                  <p className="text-sm text-green-600 dark:text-green-500 text-center px-4">
                    Your bot is ready to brew responses
                  </p>
                </div>
              ) : (
                <div className="relative group">
                  {connectionStatus.qr ? (
                    <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700">
                      <img 
                        src={connectionStatus.qr} 
                        alt="WhatsApp QR code" 
                        width={256}
                        height={256}
                        className="bg-white transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="h-64 w-64 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex flex-col items-center justify-center border-2 border-slate-200 dark:border-slate-600">
                      <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center px-4">
                        QR code unavailable
                      </p>
                      <p className="text-xs text-slate-500 text-center px-4 mt-1">
                        Click reconnect to generate
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {status !== "connected" && (
              <div className="text-center space-y-2">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm font-medium">How to connect:</span>
                </div>
                <p className="text-sm text-slate-500 max-w-xs">
                  Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this code
                </p>
              </div>
            )}
            
            <Button 
              onClick={onReconnect} 
              disabled={isLoading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-2 rounded-xl font-semibold"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {status === "connected" ? "Reconnect" : "Generate QR Code"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg shadow-sm ${
                status === "connected" 
                  ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
              }`}>
                {status === "connected" ? (
                  <CheckCircle className="h-5 w-5 text-white" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl">Connection Status</CardTitle>
                <CardDescription className="text-base">
                  Monitor your WhatsApp connection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <StatusRow 
                label="Connection State" 
                value={status === "connected" ? "Connected" : "Disconnected"} 
                status={status === "connected" ? "success" : "error"}
              />
              <StatusRow 
                label="Last Update" 
                value={connectionStatus.lastUpdated ? new Date(connectionStatus.lastUpdated).toLocaleString() : "Never"} 
                status="neutral"
              />
              <StatusRow 
                label="Bot Status" 
                value={status === "connected" ? "Ready to brew" : "Waiting for connection"} 
                status={status === "connected" ? "success" : "warning"}
              />
            </div>
            
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Connection Tips
              </h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Keep your phone connected to internet</li>
                <li>• Don't logout from WhatsApp web on other devices</li>
                <li>• QR codes expire after 2 minutes</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatusRow({ label, value, status = "neutral" }: { label: string; value: string; status?: "success" | "error" | "warning" | "neutral" }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 dark:text-green-400"
      case "error":
        return "text-red-600 dark:text-red-400"
      case "warning":
        return "text-yellow-600 dark:text-yellow-400"
      default:
        return "text-slate-600 dark:text-slate-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      default:
        return <div className="h-4 w-4 rounded-full bg-slate-300 dark:bg-slate-600" />
    }
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3">
        {getStatusIcon(status)}
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className={`font-semibold ${getStatusColor(status)}`}>{value}</span>
    </div>
  )
}
