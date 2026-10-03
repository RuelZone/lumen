import { NextResponse } from "next/server";

const backendUrl = process.env.LUMEN_BACKEND_URL ?? "http://127.0.0.1:8765";

export async function POST(request: Request) {
  try {
    const response = await fetch(`${backendUrl}/voice-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the local voice service." },
      { status: 503 },
    );
  }
}
