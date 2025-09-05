import { NextRequest, NextResponse } from "next/server"

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Get connection status
export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/connection`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Connection API error:", error);
    return NextResponse.json({ 
      status: "disconnected", 
      error: "Could not connect to backend server" 
    }, { status: 500 });
  }
}

// Reconnect or reset connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'reconnect', forceNewQR = false } = body;
    
    const endpoint = action === 'reset' ? 'reset' : 'reconnect';
    
    const response = await fetch(`${backendUrl}/api/connection/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ forceNewQR }),
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Connection API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to perform connection action" 
    }, { status: 500 });
  }
}
