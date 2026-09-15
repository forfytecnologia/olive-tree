import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site-chrome";
import { StoredImage } from "@/components/stored-image";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import { MAX_INSTALLMENTS, installmentValue, pixDiscount } from "@/lib/pricing";
import { createOrder } from "@/lib/orders";
import { createPayment, PAYMENT_LABEL, type PaymentMethod } from "@/lib/payments";
import {
  isValidCep,
  lookupCep,
  onlyDigits,
  quoteShipping,
  type ShippingOption,
} from "@/lib/shipping";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Olive Tree Acessórios" },
      {
        name: "description",
        content: "Informe seus dados, calcule o frete e escolha como pagar sua compra Olive Tree.",
      },
      { property: "og:title", content: "Finalizar compra — Olive Tree" },
      { property: "og:description", content: "Checkout rápido e seguro da Olive Tree." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const FIELD =
  "mt-1 w-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function Step({ n, title, active }: { n: number; title: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={
          "flex h-7 w-7 items-center justify-center rounded-full text-xs " +
          (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
        }
      >
        {n}
      </span>
      <span className={"text-xs uppercase tracking-[0.2em] " + (active ? "" : "opacity-50")}>
        {title}
      </span>
    </div>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();

  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", document: "" });
  const [address, setAddress] = useState({
    zip: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
  });
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);

  const discount = method === "pix" ? pixDiscount(subtotal) : 0;
  const total = subtotal - discount + (shipping?.price ?? 0);

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h1 className="text-2xl">Sua sacola está vazia</h1>
          <Link to="/catalogo" className="mt-6 inline-block text-sm underline underline-offset-4">
            Ver catálogo
          </Link>
        </div>
      </SiteLayout>
    );
  }

  async function handleCep(value: string) {
    setAddress((a) => ({ ...a, zip: value }));
    if (!isValidCep(value)) return;
    const found = await lookupCep(value);
    if (found) {
      setAddress((a) => ({
        ...a,
        zip: found.zip,
        street: found.street || a.street,
        district: found.district || a.district,
        city: found.city,
        state: found.state,
      }));
    }
    setQuoting(true);
    setShipping(null);
    const quotes = await quoteShipping(value, items);
    setOptions(quotes);
    setQuoting(false);
  }

  function goToAddress() {
    if (!customer.name.trim() || !customer.email.includes("@") || !customer.phone.trim()) {
      toast.error("Preencha nome, e-mail e telefone.");
      return;
    }
    setStep(2);
  }

  function goToPayment() {
    if (!isValidCep(address.zip) || !address.street || !address.number || !address.city) {
      toast.error("Complete o endereço de entrega.");
      return;
    }
    if (!shipping) {
      toast.error("Escolha uma opção de entrega.");
      return;
    }
    setStep(3);
  }

  async function submit() {
    if (!shipping) return;
    setSubmitting(true);
    try {
      const order = await createOrder({
        customer,
        address: { ...address, zip: onlyDigits(address.zip) },
        shipping,
        payment_method: method,
        items,
      });
      await createPayment({ method, total, orderId: order.id });
      clear();
      navigate({ to: "/pedido/$id", params: { id: order.id } });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl">Finalizar compra</h1>
        <div className="mt-6 flex flex-wrap gap-6">
          <Step n={1} title="Seus dados" active={step >= 1} />
          <Step n={2} title="Entrega" active={step >= 2} />
          <Step n={3} title="Pagamento" active={step >= 3} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-10">
            {step === 1 && (
              <section className="bg-card p-6">
                <p className="eyebrow">Seus dados</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    Nome completo
                    <input
                      className={FIELD}
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    E-mail
                    <input
                      type="email"
                      className={FIELD}
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Telefone / WhatsApp
                    <input
                      className={FIELD}
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    CPF
                    <input
                      className={FIELD}
                      value={customer.document}
                      onChange={(e) => setCustomer({ ...customer, document: e.target.value })}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={goToAddress}
                  className="mt-6 bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90"
                >
                  Continuar
                </button>
              </section>
            )}

            {step === 2 && (
              <section className="bg-card p-6">
                <p className="eyebrow">Entrega</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm">
                    CEP
                    <input
                      className={FIELD}
                      value={address.zip}
                      inputMode="numeric"
                      onChange={(e) => handleCep(e.target.value)}
                    />
                  </label>
                  <label className="text-sm">
                    Rua
                    <input
                      className={FIELD}
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Número
                    <input
                      className={FIELD}
                      value={address.number}
                      onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Complemento
                    <input
                      className={FIELD}
                      value={address.complement}
                      onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Bairro
                    <input
                      className={FIELD}
                      value={address.district}
                      onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Cidade
                    <input
                      className={FIELD}
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    Estado
                    <input
                      className={FIELD}
                      value={address.state}
                      maxLength={2}
                      onChange={(e) =>
                        setAddress({ ...address, state: e.target.value.toUpperCase() })
                      }
                    />
                  </label>
                </div>

                <p className="eyebrow mt-8">Opções de envio</p>
                {quoting && <p className="mt-3 text-sm text-muted-foreground">Calculando frete…</p>}
                {!quoting && options.length === 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Informe o CEP para ver prazos e valores.
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setShipping(o)}
                      className={
                        "flex w-full items-center justify-between border px-4 py-3 text-left text-sm " +
                        (shipping?.id === o.id ? "border-primary bg-secondary" : "border-border")
                      }
                    >
                      <span>
                        {o.carrier} · {o.service}
                        <span className="block text-xs text-muted-foreground">
                          até {o.days} dias úteis
                        </span>
                      </span>
                      <span>{o.price === 0 ? "Grátis" : formatPrice(o.price)}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em]"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={goToPayment}
                    className="bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90"
                  >
                    Continuar
                  </button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="bg-card p-6">
                <p className="eyebrow">Pagamento</p>
                <div className="mt-5 space-y-2">
                  {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={
                        "block w-full border px-4 py-3 text-left text-sm " +
                        (method === m ? "border-primary bg-secondary" : "border-border")
                      }
                    >
                      {PAYMENT_LABEL[m]}
                      {m === "pix" && (
                        <span className="block text-xs text-muted-foreground">
                          Aprovação imediata
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Pagamento em ambiente de teste. A cobrança real será ativada quando o gateway for
                  conectado.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="border border-border px-6 py-3 text-xs uppercase tracking-[0.2em]"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={submit}
                    className="bg-primary px-8 py-3 text-xs uppercase tracking-[0.25em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Processando…" : "Concluir pedido"}
                  </button>
                </div>
              </section>
            )}
          </div>

          <aside className="h-fit bg-card p-6">
            <p className="eyebrow">Resumo</p>
            <div className="mt-5 space-y-4">
              {items.map((i) => (
                <div key={i.key} className="flex gap-3">
                  <StoredImage
                    reference={i.image}
                    alt={i.name}
                    className="h-20 w-16 flex-none object-cover"
                  />
                  <div className="flex-1 text-sm">
                    <p>{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[i.size, i.color].filter(Boolean).join(" · ")} · {i.quantity} un.
                    </p>
                  </div>
                  <span className="text-sm">{formatPrice(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span>
                  {shipping
                    ? shipping.price === 0
                      ? "Grátis"
                      : formatPrice(shipping.price)
                    : "a calcular"}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
