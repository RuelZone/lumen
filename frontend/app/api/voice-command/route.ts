import { NextResponse } from "next/server";

const backendUrl = process.env.LUMEN_BACKEND_URL ?? "http://127.0.0.1:8765";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/voice-command`, { cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ pending: false }, { status: 503 });
  }
}
