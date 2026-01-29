import { redirect } from 'next/navigation';
import OrderClientPage from './order-client-page';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
   
   title: "Komande",
   description:
      "Komande yawe watumije kuri Nihemart.",
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  // Validate UUID format
  const isValidUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);

  if (!isValidUUID) {
    redirect('/orders');
  }

  // Check if user is authenticated
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) {
    redirect(`/signin?redirect=/orders/${id}`);
  }

  // Client component will fetch the order using the hook
  // Pass minimal props - client component will handle fetching
  return <OrderClientPage orderId={id} />;
}
