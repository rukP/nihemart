import { authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';
import { Address } from '@/types/addresses';

/**
 * Fetch addresses for the current user
 */
export async function fetchAddresses(): Promise<Address[]> {
  return handleApiRequest(() => authorizedAPI.get('/users/profile/addresses'));
}

/**
 * Create a new address
 */
export async function createAddress(data: {
  display_name: string;
  street?: string;
  house_number?: string;
  phone?: string;
  city?: string;
  lat?: string;
  lon?: string;
  is_default?: boolean;
}): Promise<Address> {
  return handleApiRequest(() =>
    authorizedAPI.post('/users/profile/addresses', data)
  );
}

/**
 * Update an address
 */
export async function updateAddress(
  id: string,
  data: Partial<Address>
): Promise<Address> {
  return handleApiRequest(() =>
    authorizedAPI.put(`/users/profile/addresses/${id}`, data)
  );
}

/**
 * Delete an address
 */
export async function deleteAddress(id: string): Promise<void> {
  return handleApiRequest(() =>
    authorizedAPI.delete(`/users/profile/addresses/${id}`)
  );
}

/**
 * Set default address
 */
export async function setDefaultAddress(id: string): Promise<void> {
  return handleApiRequest(() =>
    authorizedAPI.patch(`/users/profile/addresses/${id}/set-default`)
  );
}
