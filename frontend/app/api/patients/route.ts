import { NextResponse } from "next/server";

const backendUrl = process.env.LUMEN_BACKEND_URL ?? "http://127.0.0.1:8765";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/patients`, { cache: "no-store" });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Local Python backend is not running" },
      { status: 503 },
    );
  }
}
