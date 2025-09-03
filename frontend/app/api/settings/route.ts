import { NextResponse } from "next/server"
import { db } from "@/lib/mock-db"

export async function GET() {
  return NextResponse.json(db.settings.get())
}

export async function POST(req: Request) {
  const body = await req.json()
  db.settings.set({ botEnabled: body.botEnabled, openaiApiKey: body.openaiApiKey })
  return NextResponse.json(db.settings.get())
}
