import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerProfile } = await adminClient
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? (await req.json().catch(() => ({}))).action;
    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    if (action === "create") {
      const { name, username, email: rawEmail, password, phone, department, status } = body;
      const email = rawEmail || `${username}@crm.local`;

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) throw new Error(authError.message);

      const { error: profileError } = await adminClient.from("profiles").insert({
        id: authData.user.id,
        name, username, email,
        phone: phone || null,
        department: department || null,
        role: "employee",
        status: status || "active",
      });
      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        throw new Error(profileError.message);
      }

      return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { userId } = body;
      await adminClient.auth.admin.deleteUser(userId);
      await adminClient.from("profiles").delete().eq("id", userId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset-password") {
      const { userId, password } = body;
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
