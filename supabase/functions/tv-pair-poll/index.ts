import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const poll_token = String(body.poll_token || "");
    if (!poll_token || poll_token.length < 32) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pairing, error } = await admin
      .from("tv_pairings")
      .select("id, claimed, access_token, refresh_token, expires_at")
      .eq("poll_token", poll_token)
      .maybeSingle();

    if (error) throw error;
    if (!pairing) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(pairing.expires_at).getTime() < Date.now()) {
      await admin.from("tv_pairings").delete().eq("id", pairing.id);
      return new Response(JSON.stringify({ status: "expired" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!pairing.claimed) {
      return new Response(JSON.stringify({ status: "pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const access_token = pairing.access_token;
    const refresh_token = pairing.refresh_token;
    // Tokens are single-use: delete the pairing
    await admin.from("tv_pairings").delete().eq("id", pairing.id);

    return new Response(JSON.stringify({ status: "claimed", access_token, refresh_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
