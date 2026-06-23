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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create admin user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: "admin@crm.local",
      password: "admin123",
      email_confirm: true,
    });

    if (authError && !authError.message.includes("already been registered")) {
      throw new Error(authError.message);
    }

    const userId = authData?.user?.id;

    if (userId) {
      // Upsert profile
      await adminClient.from("profiles").upsert({
        id: userId,
        name: "مدير النظام",
        username: "admin",
        role: "admin",
        email: "admin@crm.local",
        status: "active",
      }, { onConflict: "id" });
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
