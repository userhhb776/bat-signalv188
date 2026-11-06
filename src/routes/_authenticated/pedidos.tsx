import { createFileRoute } from "@tanstack/react-router";
import { OrdersTable } from "@/components/OrdersTable";
import { PageHeader, head } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => head("Pedidos", "Todos os pedidos recebidos dos seus gateways."),
  component: Orders,
});

function Orders() {
  return (
    <>
      <PageHeader title="Pedidos" subtitle="Tudo o que seus gateways enviaram, em tempo real" />
      <OrdersTable />
    </>
  );
}
