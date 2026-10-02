/** Pagamento online ligado no painel e com as credenciais do gateway escolhido. */
export async function onlinePaymentReady(): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_settings")
    .select("provider,enabled,mp_access_token,infinitepay_handle")
    .eq("id", true)
    .maybeSingle();
  if (!data?.enabled) return false;
  return data.provider === "infinitepay"
    ? data.infinitepay_handle.replace(/^\$/, "").trim().length > 0
    : data.mp_access_token.length > 0;
}
