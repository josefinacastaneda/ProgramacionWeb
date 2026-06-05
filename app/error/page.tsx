import ResultadoPago from '../components/ResultadoPago';

export default async function ErrorPago({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; status?: string }>;
}) {
  const { payment_id, status } = await searchParams;
  return <ResultadoPago variante="error" paymentId={payment_id} status={status} />;
}
