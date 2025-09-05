"use client"

import useSWR from "swr"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Bot, MessageSquare, Zap, Settings as SettingsIcon, Coffee, CheckCircle, XCircle, Info } from "lucide-react"

type Settings = { botEnabled: boolean }

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { data, mutate, isLoading } = useSWR<Settings>("/api/settings", fetcher)
  const [botEnabled, setBotEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data) {
      setBotEnabled(data.botEnabled)
    }
  }, [data])

  async function handleBotToggle(enabled: boolean) {
    setIsSaving(true)
    setBotEnabled(enabled)
    
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botEnabled: enabled }),
      })
      
      if (res.ok) {
        toast({ 
          title: enabled ? "Bot Enabled ✨" : "Bot Disabled 🔇", 
          description: enabled 
            ? "AI responses are now active with rule fallbacks" 
            : "Only rule-based responses will be sent"
        })
        mutate()
      } else {
        // Revert on error
        setBotEnabled(!enabled)
        toast({ title: "Failed to update bot setting", variant: "destructive" })
      }
    } catch (error) {
      setBotEnabled(!enabled)
      toast({ title: "Failed to update bot setting", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-amber-600" />
          <div>
            <h1 className="text-3xl font-bold">Bot Settings</h1>
            <p className="text-slate-600 dark:text-slate-400">Configure your Brew assistant</p>
          </div>
        </div>
        <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-xl h-64"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            Bot Settings
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
            Configure your Brew assistant behavior
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Main Bot Control */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg shadow-sm ${
                botEnabled 
                  ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
              }`}>
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  AI Assistant Control
                  {botEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-slate-500" />
                  )}
                </CardTitle>
                <CardDescription className="text-base">
                  {botEnabled ? "AI responses are active" : "AI responses are disabled"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Smart Responses
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {botEnabled 
                    ? "Rules + AI fallback responses active"
                    : "Only rule-based responses active"
                  }
                </p>
              </div>
              <Switch 
                checked={botEnabled} 
                onCheckedChange={handleBotToggle}
                disabled={isSaving}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {/* Status Explanation */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="h-4 w-4" />
                How it works
              </h4>
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border-l-4 ${
                  botEnabled 
                    ? "bg-green-50 dark:bg-green-900/20 border-green-400" 
                    : "bg-slate-100 dark:bg-slate-800 border-slate-400"
                }`}>
                  <div className="font-medium text-sm mb-1">
                    {botEnabled ? "🤖 AI Mode (Enabled)" : "📋 Rules Only Mode"}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {botEnabled 
                      ? "1. Check rules first → 2. Use AI if no rule matches"
                      : "1. Check rules only → 2. Stay silent if no rule matches"
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Response Modes</CardTitle>
                <CardDescription className="text-base">
                  Understanding bot behavior
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-green-800 dark:text-green-300">AI Enabled</span>
                </div>
                <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                  <li>• Keyword rules trigger first</li>
                  <li>• AI generates smart responses as fallback</li>
                  <li>• Natural conversation flow</li>
                  <li>• Best user experience</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-800 dark:text-amber-300">AI Disabled</span>
                </div>
                <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                  <li>• Only predefined rules respond</li>
                  <li>• No AI-generated messages</li>
                  <li>• Silent for unknown queries</li>
                  <li>• Maximum control & predictability</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border border-slate-200 dark:border-slate-600">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Quick Tips
              </h4>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <li>• Create rules for common questions first</li>
                <li>• Use AI mode for natural conversations</li>
                <li>• Switch to rules-only for strict control</li>
                <li>• Settings save automatically</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
