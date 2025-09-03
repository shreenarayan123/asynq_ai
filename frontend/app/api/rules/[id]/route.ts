import { NextResponse } from "next/server"
import { db } from "@/lib/mock-db"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const updated = db.rules.update(params.id, { keyword: body.keyword, response: body.response })
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = db.rules.delete(params.id)
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
