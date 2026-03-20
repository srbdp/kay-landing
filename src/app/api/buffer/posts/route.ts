import { NextRequest, NextResponse } from "next/server";
import { createUpdate, getPendingUpdates, getSentUpdates } from "@/lib/buffer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const profileId = searchParams.get("profile_id");
    if (!profileId) {
      return NextResponse.json({ error: "profile_id is required" }, { status: 400 });
    }
    const filter = searchParams.get("filter") ?? "pending";
    const page = Number(searchParams.get("page") ?? "1");
    const count = Number(searchParams.get("count") ?? "20");

    const data =
      filter === "sent"
        ? await getSentUpdates(profileId, { page, count })
        : await getPendingUpdates(profileId, { page, count });

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile_ids, text, media, scheduled_at, now, top } = body;

    if (!profile_ids || !Array.isArray(profile_ids) || profile_ids.length === 0) {
      return NextResponse.json({ error: "profile_ids[] is required" }, { status: 400 });
    }

    const result = await createUpdate({ profile_ids, text, media, scheduled_at, now, top });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
