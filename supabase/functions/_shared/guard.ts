// ============================================================================
// Garde partagée des Edge Functions — R1.6 (audit JURIX 2026-09-15)
// ----------------------------------------------------------------------------
// Corrige les défauts B06 / B07 :
//   · CORS « * »            → liste d'origines autorisées (env ALLOWED_ORIGINS)
//   · aucun contrôle d'auth → JWT utilisateur obligatoire (verify_jwt = true)
//   · service_role exposé   → client scopé à l'utilisateur (la RLS s'applique)
//   · aucun quota           → comptage par utilisateur et par jour (ai_usage)
//
// Les fonctions n'écrivent JAMAIS avec la clé service_role : elles utilisent le
// JWT de l'appelant, ce qui garantit le périmètre multi-tenant (bank_id).
// ============================================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { User } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

/** Nombre maximal d'appels IA par utilisateur et par jour. */
export const AI_DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") ?? "50");

/** Origines autorisées à appeler les functions (séparées par des virgules). */
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:4173",
  "https://e1cc5e1c-c0cb-4d53-8dd4-9060e6d09d5c.lovableproject.com",
];

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(DEFAULT_ALLOWED_ORIGINS);

/** Erreur HTTP explicite (statut + message renvoyé au client). */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** En-têtes CORS pour une origine donnée (refus silencieux si non autorisée). */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export function json(
  req: Request,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function optionsResponse(req: Request): Response {
  const origin = req.headers.get("origin");
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  return new Response(null, {
    status: allowed ? 204 : 403,
    headers: corsHeaders(req),
  });
}

export interface AuthContext {
  user: User;
  /** Client Supabase scopé à l'utilisateur : la RLS s'applique à chaque appel. */
  supabase: SupabaseClient;
  token: string;
}

/**
 * Exige un JWT utilisateur valide et renvoie un client scopé.
 * Lève HttpError(401) sinon.
 */
export async function requireUser(req: Request): Promise<AuthContext> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new HttpError(401, "Jeton d'authentification manquant");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, "Session invalide ou expirée");
  }

  return { user: data.user, supabase, token };
}

/**
 * Consomme une unité de quota IA et refuse au-delà de AI_DAILY_LIMIT.
 * L'écriture passe par la fonction SQL `ai_consume_quota` (SECURITY DEFINER),
 * jamais par un accès direct en service_role.
 */
export async function consumeAiQuota(
  supabase: SupabaseClient,
  fnName: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("ai_consume_quota", { p_tokens: 0 });
  if (error) {
    console.error(`[${fnName}] quota error:`, error.message);
    throw new HttpError(500, "Contrôle de quota indisponible");
  }
  const calls = Number(data ?? 0);
  if (calls > AI_DAILY_LIMIT) {
    throw new HttpError(
      429,
      `Limite quotidienne d'appels IA atteinte (${AI_DAILY_LIMIT}). Réessayez demain ou contactez votre administrateur.`,
    );
  }
}

/** Enveloppe d'exécution : OPTIONS, garde d'auth, validation, quota, erreurs homogènes. */
export async function withGuards(
  fnName: string,
  req: Request,
  handler: (ctx: AuthContext, body: Record<string, unknown>) => Promise<unknown>,
  validate?: (body: Record<string, unknown>) => void,
): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse(req);

  try {
    if (req.method !== "POST") throw new HttpError(405, "Méthode non autorisée");
    if (!OPENAI_API_KEY) {
      throw new HttpError(503, "Service IA non configuré");
    }

    const ctx = await requireUser(req);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "Corps de requête JSON invalide");
    }

    // La validation précède la consommation de quota : une requête malformée
    // ne doit pas entamer le crédit quotidien de l'utilisateur.
    if (validate) validate(body);

    await consumeAiQuota(ctx.supabase, fnName);

    const result = await handler(ctx, body);
    return json(req, result);
  } catch (error) {
    if (error instanceof HttpError) {
      return json(req, { error: error.message, success: false }, error.status);
    }
    console.error(`[${fnName}]`, error);
    // Aucun détail interne renvoyé au client.
    return json(req, { error: "Erreur interne du service IA", success: false }, 500);
  }
}

/** Garde-fou anti-injection : borne la taille et le nombre de messages. */
export function sanitizeMessages(
  input: unknown,
  maxMessages = 20,
  maxChars = 4000,
): { role: "user" | "assistant" | "system"; content: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-maxMessages)
    .filter((m): m is { role: string; content: string } =>
      typeof m?.content === "string" &&
      ["user", "assistant", "system"].includes(m?.role))
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content.slice(0, maxChars),
    }));
}

/** Appel OpenAI mutualisé (modèle et borne de tokens pilotés par le serveur). */
export async function callOpenAI(
  messages: { role: string; content: string }[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "gpt-4o-mini",
      messages,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.4,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI error:", response.status, await response.text());
    throw new HttpError(502, "Le service IA n'a pas répondu correctement");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new HttpError(502, "Réponse IA vide");
  }
  return content;
}
