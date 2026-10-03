import { NextResponse } from "next/server";

const backendUrl = process.env.LUMEN_BACKEND_URL ?? "http://127.0.0.1:8765";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isProcedureQuery = body?.mode === "procedures";
    if (
      isProcedureQuery &&
      (Object.keys(body).length !== 2 || typeof body.question !== "string")
    ) {
      return NextResponse.json(
        { error: "Procedure searches accept only a general question." },
        { status: 400 },
      );
    }

    const response = await fetch(`${backendUrl}/${isProcedureQuery ? "procedures" : "chat"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isProcedureQuery ? { question: body.question } : body,
      ),
      cache: "no-store",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Local Python backend is not running" },
      { status: 503 },
    );
  }
}
