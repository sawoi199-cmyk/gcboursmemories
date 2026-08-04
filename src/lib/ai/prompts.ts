export const AI_OUTPUT_SCHEMA_HINT = `{
  "titleCandidates": [
    { "kind": "event", "text": "event-based title, max 80" },
    { "kind": "emotion", "text": "emotion-based title, max 80" },
    { "kind": "detail", "text": "detail-based title, max 80" }
  ],
  "recommendedTitle": "string, max 80 — pick the best of the three",
  "oneLine": "string, max 160 — one-line summary",
  "diaryBody": "string, 50-3000 chars, plain text paragraphs only",
  "factsUsed": ["verified facts from notes / metadata that you used"],
  "inferredFacts": ["soft inferences that need human review"],
  "questionsToConfirm": ["questions for the user — never put these in diaryBody"],
  "confidence": 0.0
}`;

export const AI_SYSTEM_PROMPT = `You are the diary-writing assistant for a private couple memory archive.

Your job is to transform verified user notes and light event context into warm, natural titles and diary drafts.

Rules:
1. The user's written notes (真实记忆备注) are the primary source of truth.
2. Secondary context only: event date, location, story chapter, existing one-line summary, observable photo filenames/metadata, selected tone, excluded details.
3. Never invent dates, places, first-time events, promises or relationship milestones.
4. Do not infer sensitive personal attributes.
5. Do not identify unknown people.
6. Do not assume every person in a photo is part of the couple.
7. Use specific observable details instead of generic romantic phrases.
8. Avoid clichés, exaggerated promises and overly dramatic language.
9. When uncertain, add a question to questionsToConfirm — never insert questions or inferred content into diaryBody.
10. Separate factsUsed (verified) from inferredFacts (guesses).
11. Return ONLY one valid JSON object matching the schema below. No markdown fences, no commentary, no thinking tags.
12. Escape newlines inside JSON strings as \\n. No trailing commas.
13. Do not mention that you are an AI.
14. Keep the writing personal, gentle and believable.
15. The output is a draft and will be reviewed by the user. Do not publish.
16. Write recommendedTitle / titleCandidates / oneLine / diaryBody in the requested language.
17. titleCandidates MUST be three structurally different titles with kinds exactly: event, emotion, detail.
18. Do not suggest chapter, template, mood, tags, place changes, or photo roles — text fields only.

JSON schema:
${AI_OUTPUT_SCHEMA_HINT}`;

export function buildUserPrompt(input: {
  language: string;
  tone: string;
  userNote: string;
  excludedDetails: string;
  relationshipContext: string;
  mode: string;
  preserveTitle: boolean;
  preserveOneLine: boolean;
  currentTitle: string | null;
  currentOneLine: string | null;
  currentDiaryBody: string | null;
  eventMetadata: string;
  photoObservations: string;
}) {
  const titleBlock =
    input.preserveTitle && input.currentTitle
      ? `Current title (preserve — do not invent a replacement intent; still return titleCandidates/recommendedTitle that match this title closely):\n${input.currentTitle}`
      : `Current title:\n(omit — invent fresh titles; do not anchor on any previous title)`;

  const oneLineBlock = input.currentOneLine
    ? `Existing one-line summary (secondary context${input.preserveOneLine ? "; preserve intent — return a matching oneLine" : ""}):\n${input.currentOneLine}`
    : `Existing one-line summary:\n(none)`;

  const diaryBlock = input.currentDiaryBody
    ? `Current diary body (for continuity when mode asks to keep or lightly align):\n${input.currentDiaryBody}`
    : `Current diary body:\n(none)`;

  const modeInstructions =
    input.mode === "title_only"
      ? `Mode: regenerate TITLE only.
- Focus quality on titleCandidates + recommendedTitle.
- Still return oneLine and diaryBody (you may reuse/adapt the current diary so it stays valid JSON and ≥50 chars).`
      : input.mode === "diary_only"
        ? `Mode: regenerate DIARY only.
- Focus quality on diaryBody${input.preserveOneLine ? "" : " and oneLine"}.
- Still return titleCandidates + recommendedTitle (align with current title if provided).`
        : `Mode: generate TITLE and DIARY together.
- Produce fresh titleCandidates, recommendedTitle, oneLine, and diaryBody as appropriate.`;

  return `Language:
${input.language}

Tone:
${input.tone}

${modeInstructions}

Preserve title field after generation: ${input.preserveTitle ? "yes" : "no"}
Preserve one-line field after generation: ${input.preserveOneLine ? "yes" : "no"}

Verified user note (PRIMARY):
${input.userNote || "(empty)"}

Do not mention:
${input.excludedDetails || "(none)"}

Known relationship context:
${input.relationshipContext || "(none)"}

Event metadata (date / location / chapter / photo count):
${input.eventMetadata}

${titleBlock}

${oneLineBlock}

${diaryBlock}

Photo observations (filenames / EXIF only — not roles):
${input.photoObservations}

Create the JSON draft using only the supplied information.
Respond with a single JSON object only.`;
}
