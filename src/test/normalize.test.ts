import { describe, expect, it } from "vitest";
import { normalizeOrder, triggerFor, fillTemplate } from "@/lib/normalize";

describe("gateway normalization", () => {
  it("reads a Hotmart-like approved purchase", () => {
    const o = normalizeOrder({ event: "PURCHASE_APPROVED", data: { buyer: { name: "Ana Souza", email: "a@x.com", phone: "+55 (11) 99999-0000" }, product: { name: "Curso" }, purchase: { transaction: "HP1", price: { value: 197 }, payment: { type: "PIX" } } } });
    expect(o.status).toBe("approved");
    expect(o.payment_method).toBe("pix");
    expect(o.customer_phone).toBe("5511999990000");
    expect(o.value).toBe(197);
    expect(triggerFor(o)).toBe("compra_aprovada");
  });
  it("detects abandoned carts", () => {
    expect(triggerFor(normalizeOrder({ event: "abandoned_cart", customer: { name: "B" } }))).toBe("carrinho_abandonado");
  });
  it("pending pix fires pix trigger", () => {
    expect(triggerFor(normalizeOrder({ status: "waiting_payment", payment_method: "pix" }))).toBe("pix_gerado");
  });
  it("fills message variables", () => {
    expect(fillTemplate("Oi {nome}, {produto}", { customer_name: "Ana Souza", product: "Curso" })).toBe("Oi Ana, Curso");
  });
});
