"use client"

import useSWR from "swr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type Rule = { id: string; keyword: string; response: string }

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function RulesPage() {
  const { toast } = useToast()
  const { data, mutate } = useSWR<Rule[]>("/api/rules", fetcher)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [form, setForm] = useState({ keyword: "", response: "" })

  function startAdd() {
    setEditing(null)
    setForm({ keyword: "", response: "" })
    setOpen(true)
  }
  function startEdit(rule: Rule) {
    setEditing(rule)
    setForm({ keyword: rule.keyword, response: rule.response })
    setOpen(true)
  }

  async function save() {
    const method = editing ? "PUT" : "POST"
    const url = editing ? `/api/rules/${editing.id}` : "/api/rules"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setOpen(false)
      toast({ title: editing ? "Rule updated" : "Rule added" })
      mutate()
    } else {
      toast({ title: "Failed to save", variant: "destructive" })
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/rules/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Rule deleted" })
      mutate()
    } else {
      toast({ title: "Failed to delete", variant: "destructive" })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Configure trigger → response pairs</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700" onClick={startAdd}>
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Rule" : "Add Rule"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="keyword">Trigger keyword</Label>
                <Input
                  id="keyword"
                  value={form.keyword}
                  onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                  placeholder="e.g., hello"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="response">Response</Label>
                <Input
                  id="response"
                  value={form.response}
                  onChange={(e) => setForm((f) => ({ ...f, response: e.target.value }))}
                  placeholder="e.g., Hi! How can I help?"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} className="bg-green-600 hover:bg-green-700">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No rules yet. Add your first one.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trigger keyword</TableHead>
                <TableHead>Response</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.keyword}</TableCell>
                  <TableCell className="text-pretty">{rule.response}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(rule)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(rule.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
