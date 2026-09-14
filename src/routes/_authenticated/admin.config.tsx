import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchSettings } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/config")({
  component: ConfigAdmin,
});

const inputClass =
  "w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary";

function ConfigAdmin() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const [whatsapp, setWhatsapp] = useState("");
  const [welcome, setWelcome] = useState("");
  const [about, setAbout] = useState("");
  const [instagram, setInstagram] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setWhatsapp(data.whatsapp);
    setWelcome(data.welcome_message);
    setAbout(data.about_text);
    setInstagram(data.instagram_url);
  }, [data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Informe um número de WhatsApp válido com DDI e DDD.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("store_settings")
        .update({
          whatsapp: digits.slice(0, 15),
          welcome_message: welcome.trim().slice(0, 160),
          about_text: about.trim().slice(0, 3000),
          instagram_url: instagram.trim().slice(0, 200),
        })
        .eq("id", true);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="max-w-2xl space-y-6">
      <h1 className="text-2xl">Configurações da loja</h1>

      <div className="space-y-5 bg-card p-6">
        <label className="block">
          <span className="eyebrow">WhatsApp de vendas (com DDI e DDD)</span>
          <input
            value={whatsapp}
            maxLength={20}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputClass + " mt-2"}
            placeholder="5527988291158"
          />
        </label>
        <label className="block">
          <span className="eyebrow">Mensagem de boas-vindas (home)</span>
          <input
            value={welcome}
            maxLength={160}
            onChange={(e) => setWelcome(e.target.value)}
            className={inputClass + " mt-2"}
          />
        </label>
        <label className="block">
          <span className="eyebrow">Texto institucional (Sobre)</span>
          <textarea
            value={about}
            maxLength={3000}
            rows={7}
            onChange={(e) => setAbout(e.target.value)}
            className={inputClass + " mt-2"}
          />
        </label>
        <label className="block">
          <span className="eyebrow">Instagram</span>
          <input
            value={instagram}
            maxLength={200}
            onChange={(e) => setInstagram(e.target.value)}
            className={inputClass + " mt-2"}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
