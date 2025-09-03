import { NextResponse } from "next/server"
import { db } from "@/lib/mock-db"

export async function GET() {
  return NextResponse.json(db.rules.list())
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.keyword || !body?.response) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const rule = db.rules.add({ keyword: body.keyword, response: body.response })
  return NextResponse.json(rule)
}
