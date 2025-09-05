"use client"

import { useState } from "react"
import { useWhatsAppConnection } from "@/hooks/use-whatsapp-connection"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export function ConnectionIndicator() {
  const { connectionStatus, resetQR } = useWhatsAppConnection()
  const { toast } = useToast()
  const isUp = connectionStatus.status === "connected"
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = async () => {
    try {
      setIsResetting(true)
      const success = await resetQR();
      if (success) {
        toast({
          title: "Connection Reset",
          description: "Generating new QR code, please wait...",
        });
      } else {
        throw new Error('Failed to reset connection');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset connection",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false)
    }
  };

  return (
    <div className="flex items-center gap-4" aria-live="polite">
      <div className="flex items-center gap-2">
        <span
          className={cn("inline-block h-2.5 w-2.5 rounded-full", isUp ? "bg-green-600" : "bg-gray-300")}
          aria-hidden
        />
        <span className="text-sm">{isUp ? "Connected" : "Disconnected"}</span>
      </div>
      {!connectionStatus.qr && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleReset}
          className="h-7 px-2"
        >
          ↻ Reset QR
        </Button>
      )}
    </div>
  )
}
