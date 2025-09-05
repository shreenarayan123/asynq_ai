import { NextResponse } from "next/server"

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/settings`);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format for frontend compatibility
    const formattedSettings = {
      botEnabled: data.botEnabled?.value || false,
      openaiApiKeyMasked: data.openaiApiKey?.value || "sk-••••••••••••••••"
    };
    
    return NextResponse.json(formattedSettings);
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json({ 
      botEnabled: false,
      openaiApiKeyMasked: "sk-••••••••••••••••"
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    
    // Create the update payload
    const updates: Record<string, any> = {};
    
    if (typeof body.botEnabled !== 'undefined') {
      updates.botEnabled = body.botEnabled;
    }
    
    if (body.openaiApiKey) {
      updates.openaiApiKey = body.openaiApiKey;
    }
    
    // Send to backend
    const response = await fetch(`${backendUrl}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format for frontend compatibility
    const formattedSettings = {
      botEnabled: data.botEnabled?.value || false,
      openaiApiKeyMasked: data.openaiApiKey?.value || "sk-••••••••••••••••"
    };
    
    return NextResponse.json(formattedSettings);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ 
      error: "Failed to update settings"
    }, { status: 500 });
  }
}
