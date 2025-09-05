import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Call our backend API instead of mock database
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/connection/reconnect`, {
      method: 'POST',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Reconnection API error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Could not connect to backend server" 
    }, { status: 500 });
  }
}
