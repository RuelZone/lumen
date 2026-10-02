import { NextResponse } from "next/server";

const backendUrl = process.env.LUMEN_BACKEND_URL ?? "http://127.0.0.1:8765";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const response = await fetch(`${backendUrl}/patients/${encodeURIComponent(id)}`, { cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: "Local Python backend is not running" }, { status: 503 });
  }
}
