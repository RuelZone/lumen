import { NextResponse } from "next/server";

const backendUrl = process.env.LUMEN_BACKEND_URL ?? "http://127.0.0.1:8765";
const maxAudioBytes = 100 * 1024 * 1024;

export const runtime = "nodejs";

export async function POST(request: Request) {
  const patientId = request.headers.get("x-patient-id")?.trim();
  if (!patientId) {
    return NextResponse.json({ error: "Choose a patient first." }, { status: 400 });
  }

  try {
    const audio = await request.arrayBuffer();
    if (audio.byteLength === 0 || audio.byteLength > maxAudioBytes) {
      return NextResponse.json(
        { error: "Recording is empty or exceeds the 100 MB limit." },
        { status: 400 },
      );
    }

    const response = await fetch(`${backendUrl}/consultations/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "audio/webm",
        "X-Patient-Id": patientId,
        "Content-Length": String(audio.byteLength),
      },
      body: audio,
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the local consultation service." },
      { status: 503 },
    );
  }
}
