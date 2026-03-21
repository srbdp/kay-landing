import { NextRequest, NextResponse } from "next/server";
import { listPosts, createPost } from "@/lib/buffer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const channelId = searchParams.get("channel_id");
    if (!channelId) {
      return NextResponse.json({ error: "channel_id is required" }, { status: 400 });
    }
    const status = searchParams.get("status") ?? "pending";
    const count = Number(searchParams.get("count") ?? "20");

    const result = await listPosts(channelId, { status, first: count });
    return NextResponse.json({ posts: result.posts, total: result.posts.length });
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
    const { channel_ids, text, dueAt, now } = body;

    if (!channel_ids || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return NextResponse.json({ error: "channel_ids[] is required" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const posts = [];
    for (const channelId of channel_ids) {
      const result = await createPost({ channelId, text, dueAt, now });
      posts.push(result.post);
    }
    return NextResponse.json({ success: true, posts }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
