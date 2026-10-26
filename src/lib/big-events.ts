/**
 * "Big day" detection: reads upcoming calendar event titles and decides which
 * ones deserve a nudge to book a cut (interview, wedding, prom, photoshoot...).
 * Uses Claude when ANTHROPIC_API_KEY is set; falls back to keyword matching.
 */
import Anthropic from "@anthropic-ai/sdk";

export type CalendarEventLite = {
  id: string;
  title: string;
  start: string; // ISO
  description?: string;
};

export type BigEvent = {
  id: string;
  title: string;
  start: string;
  kind: string;
  reason: string;
};

const KEYWORDS: [RegExp, string][] = [
  [/\bwedding|reception|rehearsal dinner|best man|groomsm[ae]n\b/i, "wedding"],
  [/\binterview\b/i, "interview"],
  [/\bprom\b|homecoming|formal\b|\bball\b|gala/i, "formal"],
  [/photo ?shoot|headshots?|portraits?|photographer/i, "photoshoot"],
  [/graduation|commencement/i, "graduation"],
  [/\bfirst day\b|onboarding|start(ing)? (at|new job)/i, "first day"],
  [/anniversary|date night|proposal|engagement/i, "date"],
  [/funeral|memorial|celebration of life/i, "memorial"],
  [/court|hearing|deposition/i, "court"],
  [/\bpitch\b|keynote|conference talk|presentation|demo day/i, "presentation"],
  [/reunion|bachelor/i, "occasion"],
];

/** Keyword fallback used when no API key is configured (and in tests). */
export function detectByKeywords(events: CalendarEventLite[]): BigEvent[] {
  const out: BigEvent[] = [];
  for (const e of events) {
    const hit = KEYWORDS.find(([re]) => re.test(e.title));
    if (hit) out.push({ id: e.id, title: e.title, start: e.start, kind: hit[1], reason: `Looks like a ${hit[1]}.` });
  }
  return out;
}

const SYSTEM = `You help a barbershop app decide which of a customer's upcoming calendar events are "big days" worth getting a fresh haircut for.
Flag events where looking sharp clearly matters: weddings (as guest or groom), job interviews, proms/formals/galas, photoshoots/headshots, graduations, first days at a new job, important dates or proposals, funerals, court appearances, big presentations or pitches, reunions.
Do NOT flag routine items: regular meetings, standups, gym, errands, doctor/dentist visits, kids' activities, flights by themselves, or anything vague.
Be conservative: only flag when you are fairly sure. Never invent events.`;

export async function detectBigEvents(events: CalendarEventLite[]): Promise<BigEvent[]> {
  if (events.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return detectByKeywords(events);

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const list = events
    .slice(0, 150)
    .map((e) => JSON.stringify({ id: e.id, title: e.title.slice(0, 200), start: e.start }))
    .join("\n");

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1500,
      system: SYSTEM,
      tools: [
        {
          name: "report_big_events",
          description: "Report the events that are big days worth booking a haircut before.",
          input_schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "The event id exactly as given." },
                    kind: { type: "string", description: "One or two words, e.g. wedding, interview, prom, photoshoot." },
                    reason: { type: "string", description: "One short, friendly sentence for the customer." },
                  },
                  required: ["id", "kind", "reason"],
                },
              },
            },
            required: ["events"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_big_events" },
      messages: [{ role: "user", content: `Upcoming events (one JSON object per line):\n${list}` }],
    });

    const block = res.content.find((b) => b.type === "tool_use");
    const found = (block && block.type === "tool_use" ? (block.input as { events?: { id: string; kind: string; reason: string }[] }).events : []) ?? [];
    const byId = new Map(events.map((e) => [e.id, e]));
    return found
      .filter((f) => byId.has(f.id))
      .map((f) => {
        const e = byId.get(f.id)!;
        return { id: e.id, title: e.title, start: e.start, kind: f.kind, reason: f.reason };
      });
  } catch (err) {
    console.error("[big-events] Claude call failed, using keyword fallback", err);
    return detectByKeywords(events);
  }
}
