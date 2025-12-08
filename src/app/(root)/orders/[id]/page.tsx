import { redirect } from 'next/navigation';
import { fetchOrderById } from '@/integrations/supabase/orders';
import OrderClientPage from './order-client-page';
import { createClient } from '@/utils/supabase/server';
import { Metadata } from 'next';

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

  // Get authenticated user
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    redirect('/signin');
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/signin?redirect=/orders/${id}`);
  }

  // Fetch order data
  let orderData;
  try {
    orderData = await fetchOrderById(id);
  } catch (error) {
    console.error('Failed to fetch order:', error);
    redirect('/orders');
  }

  if (!orderData) {
    redirect('/orders');
  }

  // Check if user has permission to view this order
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = userProfile?.role === 'admin';
  const isOwner = orderData.user_id === user.id;

  if (!isAdmin && !isOwner) {
    redirect('/orders');
  }

  return <OrderClientPage initialData={orderData} user={user} isAdmin={isAdmin} />;
}
