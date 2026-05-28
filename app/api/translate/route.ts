/**
 * app/api/translate/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dukkanni — Serverless Dynamic Translation Endpoint
 *
 * POST /api/translate
 * Body: { text: string[], target: "tr" | "en" | "ar" }
 * Response: { translations: string[] }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { type NextRequest } from "next/server";

// Simple type guard helper
interface TranslateBody {
  text: string[];
  target: "tr" | "en" | "ar";
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // If the text is purely numeric or special characters, don't waste time translating
  if (/^[\d\s+\-.,!@#$%^&*()_+={}\[\]|\\:;"'<>\/?`~]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 }, // Cache on edge for 24 hours
    });

    if (!response.ok) return trimmed;

    const data = await response.json();
    if (data && data[0]) {
      // Map segments together (Google Translate breaks long sentences into arrays of segments)
      const translatedSegments = data[0].map((segment: any) => segment[0]);
      return translatedSegments.join("").trim();
    }
    return trimmed;
  } catch (error) {
    console.error("[translateText] error:", error);
    return trimmed;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TranslateBody = await request.json();

    if (!body || !Array.isArray(body.text) || !body.target) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { text, target } = body;

    // Validate target language
    if (!["tr", "en", "ar"].includes(target)) {
      return Response.json({ error: "Unsupported target language" }, { status: 400 });
    }

    // Edge case: if translating to ar, just return the original text directly to save bandwidth
    if (target === "ar") {
      return Response.json({ translations: text });
    }

    // Execute translation of all strings in parallel
    const translations = await Promise.all(
      text.map((str) => translateText(str, target))
    );

    return Response.json({ translations });
  } catch (error) {
    console.error("[POST /api/translate] failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
