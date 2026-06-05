import ResultadoPago from '../components/ResultadoPago';

export default async function Gracias({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; status?: string }>;
}) {
  const { payment_id, status } = await searchParams;
  return <ResultadoPago variante="exito" paymentId={payment_id} status={status} />;
}
