"use client"

import useSWR from "swr"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

type Settings = { openaiApiKeyMasked: string; botEnabled: boolean }

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { data, mutate } = useSWR<Settings>("/api/settings", fetcher)
  const [botEnabled, setBotEnabled] = useState(false)
  const [apiKey, setApiKey] = useState("")

  useEffect(() => {
    if (data) {
      setBotEnabled(data.botEnabled)
      // do not populate apiKey field with masked value
      setApiKey("")
    }
  }, [data])

  async function save() {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botEnabled, openaiApiKey: apiKey || undefined }),
    })
    if (res.ok) {
      toast({ title: "Settings saved" })
      mutate()
    } else {
      toast({ title: "Failed to save settings", variant: "destructive" })
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Configure your bot and API keys</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor="openai">OpenAI API Key</Label>
          <Input
            id="openai"
            placeholder={data?.openaiApiKeyMasked || "sk-••••••••••••••••••••••••"}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Key is stored securely on the server. Leave blank to keep existing key.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="bot">Bot enabled</Label>
            <p className="text-xs text-muted-foreground">Start/stop auto-replies</p>
          </div>
          <Switch id="bot" checked={botEnabled} onCheckedChange={setBotEnabled} />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={save} className="bg-green-600 hover:bg-green-700">
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
