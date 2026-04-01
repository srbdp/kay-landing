"use client";

import { useState, useEffect, useMemo } from "react";
import { trackEvent } from "@/lib/analytics";

const SUPABASE_URL = "https://qbtrcwhovikvnnldrcjy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidHJjd2hvdmlrdm5ubGRyY2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjQ2NDgsImV4cCI6MjA5MDUwMDY0OH0.KI25YauwtfjIXvJcyA7VT_zHaQCiVZ6zEh1BT5NH5oA";

const TIMEZONE = "America/New_York";
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 17;
const SLOT_DURATION_MIN = 30;

type Step = "date" | "time" | "details" | "confirmed";

function getWeekdaysAhead(weeks: number): Date[] {
  const days: Date[] = [];
  const now = new Date();
  // Start from tomorrow
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7);

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      days.push(new Date(d));
    }
  }
  return days;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION_MIN) {
      slots.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

function formatTimeLabel(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function generateICS(
  date: string,
  time: string,
  guestName: string,
  guestEmail: string,
): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, min] = time.split(":").map(Number);

  const start = new Date(year, month - 1, day, hour, min);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  function toICSDate(d: Date): string {
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kay//Booking//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `DTSTART;TZID=${TIMEZONE}:${toICSDate(start)}`,
    `DTEND;TZID=${TIMEZONE}:${toICSDate(end)}`,
    `SUMMARY:Kay Demo Call with ${guestName}`,
    `DESCRIPTION:Demo call booked via kay.io`,
    `ORGANIZER;CN=Brandon:mailto:brandon@coldlabs.io`,
    `ATTENDEE;CN=${guestName}:mailto:${guestEmail}`,
    `STATUS:CONFIRMED`,
    `UID:${crypto.randomUUID()}@kay.io`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function BookingWidget() {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingResult, setBookingResult] = useState<{
    date: string;
    time: string;
    name: string;
    email: string;
  } | null>(null);

  const weekdays = useMemo(() => getWeekdaysAhead(3), []);
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Fetch booked slots for the selected date
  useEffect(() => {
    if (!selectedDate) return;
    const url = `${SUPABASE_URL}/rest/v1/bookings?select=booking_time&booking_date=eq.${selectedDate}&status=eq.confirmed`;
    fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
      .then((r) => r.json())
      .then((rows: { booking_time: string }[]) => {
        setBookedSlots(
          new Set(rows.map((r) => r.booking_time.substring(0, 5))),
        );
      })
      .catch(() => setBookedSlots(new Set()));
  }, [selectedDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/book-slot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          guest_name: name,
          guest_email: email,
          booking_date: selectedDate,
          booking_time: selectedTime,
          timezone: TIMEZONE,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Booking failed. Please try another slot.");
        setSubmitting(false);
        return;
      }

      setBookingResult({
        date: selectedDate,
        time: selectedTime,
        name,
        email,
      });
      setStep("confirmed");
      trackEvent("Booking Submitted", { date: selectedDate, time: selectedTime });
    } catch {
      setError("Unable to reach booking service. Please try again.");
    }
    setSubmitting(false);
  }

  function downloadICS() {
    if (!bookingResult) return;
    const ics = generateICS(
      bookingResult.date,
      bookingResult.time,
      bookingResult.name,
      bookingResult.email,
    );
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kay-demo-call.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Group weekdays by week for display
  const weekGroups: Date[][] = [];
  let currentWeek: Date[] = [];
  let currentWeekNum = -1;
  for (const d of weekdays) {
    const weekNum = Math.floor(
      (d.getTime() - weekdays[0].getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    if (weekNum !== currentWeekNum) {
      if (currentWeek.length > 0) weekGroups.push(currentWeek);
      currentWeek = [];
      currentWeekNum = weekNum;
    }
    currentWeek.push(d);
  }
  if (currentWeek.length > 0) weekGroups.push(currentWeek);

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Progress indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {(["date", "time", "details", "confirmed"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-indigo-600 text-white"
                  : (["date", "time", "details", "confirmed"].indexOf(step) > i)
                    ? "bg-indigo-100 text-indigo-600"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {["date", "time", "details", "confirmed"].indexOf(step) > i ? (
                <span>&#10003;</span>
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && (
              <div
                className={`h-0.5 w-6 ${
                  ["date", "time", "details", "confirmed"].indexOf(step) > i
                    ? "bg-indigo-600"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Date */}
      {step === "date" && (
        <div className="space-y-4">
          <h2 className="text-center text-lg font-semibold text-gray-900">
            Pick a day
          </h2>
          <p className="text-center text-sm text-gray-500">
            Mon&ndash;Fri, Eastern Time
          </p>
          <div className="space-y-3">
            {weekGroups.map((week, wi) => (
              <div key={wi} className="flex gap-2 justify-center">
                {week.map((d) => {
                  const iso = formatDateISO(d);
                  const isSelected = selectedDate === iso;
                  return (
                    <button
                      key={iso}
                      onClick={() => {
                        setSelectedDate(iso);
                        setSelectedTime("");
                        setStep("time");
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      {formatDateLabel(d)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Time */}
      {step === "time" && (
        <div className="space-y-4">
          <button
            onClick={() => setStep("date")}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to dates
          </button>
          <h2 className="text-center text-lg font-semibold text-gray-900">
            Pick a time on{" "}
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="text-center text-sm text-gray-500">
            30-minute slots, 9 AM &ndash; 5 PM ET
          </p>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((slot) => {
              const isBooked = bookedSlots.has(slot);
              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => {
                    setSelectedTime(slot);
                    setStep("details");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    isBooked
                      ? "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through"
                      : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  {formatTimeLabel(slot)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <button
            onClick={() => setStep("time")}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            &larr; Back to times
          </button>
          <h2 className="text-center text-lg font-semibold text-gray-900">
            Confirm your details
          </h2>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-center text-sm text-indigo-700">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            at {formatTimeLabel(selectedTime)} ET
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Booking..." : "Book My Demo"}
            </button>
          </form>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirmed" && bookingResult && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <span className="text-3xl text-green-600">&#10003;</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h2>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
            <p className="font-medium">
              {new Date(bookingResult.date + "T12:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "long", day: "numeric", year: "numeric" },
              )}
            </p>
            <p>{formatTimeLabel(bookingResult.time)} Eastern Time</p>
            <p className="mt-2 text-gray-500">
              You&apos;ll hear from Brandon shortly with call details.
            </p>
          </div>
          <button
            onClick={downloadICS}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-6 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Add to Calendar (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
