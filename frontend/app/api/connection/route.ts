import { NextResponse } from "next/server"
import { db } from "@/lib/mock-db"

export async function GET() {
  const { status, qr } = db.getConnection()
  return NextResponse.json({ status, qr })
}
