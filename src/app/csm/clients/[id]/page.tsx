import ClientDetailView from "./ClientDetailView";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClientDetailView id={id} />;
}
