import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function randomString(len: number, alphabet: string) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function randomToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Purge expired entries to keep the table tidy
    await admin.from("tv_pairings").delete().lt("expires_at", new Date().toISOString());

    // Generate unique code with a few retries
    let code = "";
    for (let i = 0; i < 5; i++) {
      const candidate = randomString(6, CHARS);
      const { data } = await admin.from("tv_pairings").select("id").eq("code", candidate).maybeSingle();
      if (!data) { code = candidate; break; }
    }
    if (!code) throw new Error("could not allocate code");

    const poll_token = randomToken();

    const { error } = await admin.from("tv_pairings").insert({ code, poll_token });
    if (error) throw error;

    return new Response(JSON.stringify({ code, poll_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
