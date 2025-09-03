import { NextResponse } from "next/server"
import { db } from "@/lib/mock-db"

export async function POST() {
  db.reconnect()
  return NextResponse.json({ ok: true })
}
