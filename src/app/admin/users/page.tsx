'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomerTable } from '@/components/users/customers-table';
import CustomersMetrics from '@/components/users/CustomersMetrics';
import { FC, Suspense } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <ProtectedRoute requiredSection="users">
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
        <div className="flex min-w-0 flex-col px-2 py-10 xs:px-5 sm:px-10">
          <Suspense
            fallback={
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            }
          >
            <CustomersMetrics />
          </Suspense>
          <CustomerTable />
        </div>
      </ScrollArea>
    </ProtectedRoute>
  );
};

export default page;
