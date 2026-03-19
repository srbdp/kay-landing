import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SIGNUPS_FILE = path.join(process.cwd(), "data", "signups.json");

interface Signup {
  email: string;
  timestamp: string;
}

async function readSignups(): Promise<Signup[]> {
  try {
    const data = await fs.readFile(SIGNUPS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeSignups(signups: Signup[]): Promise<void> {
  await fs.mkdir(path.dirname(SIGNUPS_FILE), { recursive: true });
  await fs.writeFile(SIGNUPS_FILE, JSON.stringify(signups, null, 2));
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = body.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const signups = await readSignups();

  if (signups.some((s) => s.email === email)) {
    return NextResponse.json({ message: "You're already on the list!" });
  }

  signups.push({ email, timestamp: new Date().toISOString() });
  await writeSignups(signups);

  return NextResponse.json({ message: "You're in! We'll be in touch." });
}
