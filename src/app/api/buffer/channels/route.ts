import { NextResponse } from "next/server";
import { listChannels } from "@/lib/buffer";

export async function GET() {
  try {
    const channels = await listChannels();
    return NextResponse.json({ channels });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
