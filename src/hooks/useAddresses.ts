import { useEffect, useState, useCallback, useRef } from 'react';
import { Address } from '@/types/addresses';
import { useAuth } from './useAuth';
import {
  fetchAddresses as fetchAddressesAPI,
  createAddress,
  updateAddress as updateAddressAPI,
  deleteAddress,
  setDefaultAddress as setDefaultAddressAPI,
} from '@/lib/api/addresses';

export interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: any;
}

export function useAddresses() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');
  const { user } = useAuth();
  const GUESTADDRESS_KEY = 'nihemart_guest_address_v1';
  const EXPLICITUNSELECT_KEY = 'nihemart_explicit_unselect_address_v1';
  // Use ref to track auto-selection without causing dependency issues
  const hasAutoSelectedOnceRef = useRef(false);

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      // Authenticated user: fetch from backend API
      if (user) {
        const data: Address[] = await fetchAddressesAPI();
        setAddresses(data || []);

        // CRITICAL: Only auto-select on initial load (first fetch), and only if user hasn't explicitly unselected
        // Check if user has explicitly unselected an address
        const explicitUnselect =
          typeof window !== 'undefined'
            ? localStorage.getItem(EXPLICITUNSELECT_KEY) === 'true'
            : false;

        // Use functional update to avoid dependency on selected state
        setSelected(currentSelected => {
          // Only auto-select if:
          // 1. We haven't auto-selected before (initial load)
          // 2. User hasn't explicitly unselected
          // 3. There's no currently selected address
          if (
            data &&
            data.length > 0 &&
            !explicitUnselect &&
            !hasAutoSelectedOnceRef.current &&
            !currentSelected
          ) {
            const defaultAddr = data.find((addr: Address) => addr.is_default);
            const pick = defaultAddr || data[0];
            if (pick) {
              hasAutoSelectedOnceRef.current = true;
              return { ...pick };
            }
          } else if (
            hasAutoSelectedOnceRef.current &&
            !explicitUnselect &&
            currentSelected
          ) {
            // If we already auto-selected and the selected address still exists, keep it
            // But update it in case it was modified (e.g., is_default changed)
            const updatedSelected = data?.find(
              (addr: Address) => addr.id === currentSelected.id
            );
            if (updatedSelected) {
              return { ...updatedSelected };
            }
            // If selected address was deleted, return null
            return null;
          }
          // Don't change selection if user explicitly unselected
          if (explicitUnselect) {
            return null;
          }
          return currentSelected;
        });

        setLoading(false);
        return;
      }

      // Guest user: load a single temporary address from localStorage (if present)
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(GUESTADDRESS_KEY);
          const explicitUnselect =
            localStorage.getItem(EXPLICITUNSELECT_KEY) === 'true';

          if (raw) {
            const parsed = JSON.parse(raw);
            // normalize to an array for compatibility
            const arr = parsed
              ? Array.isArray(parsed)
                ? parsed
                : [parsed]
              : [];
            setAddresses(arr as Address[]);

            // Use functional update to avoid dependency on selected state
            setSelected(currentSelected => {
              // Only auto-select if user hasn't explicitly unselected and it's the first load
              if (
                arr.length > 0 &&
                !explicitUnselect &&
                !hasAutoSelectedOnceRef.current &&
                !currentSelected
              ) {
                const first = arr[0] as Address;
                hasAutoSelectedOnceRef.current = true;
                return { ...first };
              } else if (explicitUnselect) {
                return null;
              }
              return currentSelected;
            });
          } else {
            setAddresses([]);
            setSelected(null);
          }
        } catch (_e) {
          // console.warn('Failed to load guest address from localStorage', _e);
          setAddresses([]);
          setSelected(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching addresses');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // CRITICAL: Only fetch addresses when user changes, not when fetchAddresses function changes
  // This prevents infinite loops caused by useCallback dependencies
  useEffect(() => {
    fetchAddresses();
  }, [user]);

  const searchAddresses = useCallback(
    async (q: string) => {
      if (!q || q.trim().length < 2) return [];
      if (q === lastQuery) return suggestions;

      setLastQuery(q);
      try {
        const res = await fetch(`/api/addresses?q=${encodeURIComponent(q)}`);

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to fetch addresses');
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map(d => ({
            display_name: d.display_name,
            lat: d.lat,
            lon: d.lon,
            address: d.address,
          }));
          setSuggestions(mapped);
          return mapped;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (_e) {
        // console.error('Address search failed:', _e);
        setSuggestions([]);
        throw _e;
      }
    },
    [lastQuery, suggestions]
  );

  const saveAddress = async (
    addressData: AddressSuggestion & {
      street?: string;
      house_number?: string;
      phone?: string;
      is_default?: boolean;
    }
  ) => {
    // Authenticated users persist to DB
    if (user) {
      // Helper to add a timeout to promises so UI doesn't hang forever
      const _withTimeout = <T>(p: Promise<T>, ms = 10000): Promise<T> => {
        let timer: ReturnType<typeof setTimeout>;
        return Promise.race([
          p,
          new Promise<T>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error(`Request timed out after ${ms}ms`));
            }, ms);
          }),
        ]).finally(() => clearTimeout(timer));
      };

      try {
        // console.log('Saving address with data:', addressData);
        setLoading(true);

        const data = await createAddress({
          display_name: addressData.display_name,
          street: addressData.street,
          house_number: addressData.house_number,
          phone: addressData.phone,
          city: addressData.address?.city || addressData.address?.town,
          lat: addressData.lat,
          lon: addressData.lon,
          is_default: addressData.is_default,
        });

        setAddresses(prev => [...prev, data]);
        // CRITICAL: Clear explicit unselect flag when saving a new address (user wants to use it)
        if (typeof window !== 'undefined') {
          localStorage.removeItem(EXPLICITUNSELECT_KEY);
        }
        // Automatically select the newly saved address (important for checkout flow)
        setSelected({ ...data });
        hasAutoSelectedOnceRef.current = true;
        return data;
      } catch (err) {
        // console.error('saveAddress error:', err);
        setError(err instanceof Error ? err.message : 'Error adding address');
        return null;
      } finally {
        setLoading(false);
      }
    }

    // Guest users: persist a single temporary address in localStorage
    if (typeof window !== 'undefined') {
      try {
        setLoading(true);
        const temp = {
          id: `guest-${Date.now()}`,
          display_name: addressData.display_name,
          street: addressData.street || addressData.display_name,
          house_number: addressData.house_number || '',
          phone: addressData.phone || '',
          city: addressData.address?.city || addressData.address?.town || '',
          lat: addressData.lat || '0',
          lon: addressData.lon || '0',
          is_default: true,
        } as Address;
        // Only store a single temporary address for guests
        localStorage.setItem(GUESTADDRESS_KEY, JSON.stringify(temp));
        setAddresses([temp]);
        setSelected({ ...temp });
        return temp;
      } catch (_e) {
        // console.error('Failed to save guest address to localStorage', _e);
        setError('Failed to save address');
        return null;
      } finally {
        setLoading(false);
      }
    }

    return null;
  };

  const updateAddress = async (
    id: string,
    updates: Partial<Address>
  ): Promise<Address | null> => {
    // Authenticated update path
    if (user) {
      try {
        setLoading(true);
        const data: Address = await updateAddressAPI(id, updates);

        setAddresses(prev => prev.map(addr => (addr.id === id ? data : addr)));
        if (selected?.id === id) setSelected({ ...data });
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error updating address');
        return null;
      } finally {
        setLoading(false);
      }
    }

    // Guest update path: update the single temp address in localStorage
    if (typeof window !== 'undefined') {
      try {
        setLoading(true);
        const raw = localStorage.getItem(GUESTADDRESS_KEY);
        if (!raw) {
          setError('No saved address found');
          return null;
        }
        const parsed = JSON.parse(raw) as Address;
        if (!parsed) {
          setError('Invalid address data');
          return null;
        }
        // Validate that the ID matches the stored guest address
        // Handle both single object and array formats
        const storedAddress = Array.isArray(parsed) ? parsed[0] : parsed;
        if (storedAddress.id !== id) {
          setError('Address ID mismatch');
          return null;
        }
        const merged = { ...storedAddress, ...updates } as Address;
        localStorage.setItem(GUESTADDRESS_KEY, JSON.stringify(merged));
        setAddresses([merged]);
        setSelected({ ...merged });
        return merged;
      } catch (_e) {
        // console.error('Failed to update guest address', _e);
        setError('Failed to update address');
        return null;
      } finally {
        setLoading(false);
      }
    }

    return null;
  };

  const removeAddress = async (id: string) => {
    // Authenticated removal
    if (user) {
      try {
        setLoading(true);
        await deleteAddress(id);

        setAddresses(prev => prev.filter(addr => addr.id !== id));
        if (selected?.id === id) setSelected(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting address');
        return false;
      } finally {
        setLoading(false);
      }
    }

    // Guest removal: validate ID and clear the guest temp address
    if (typeof window !== 'undefined') {
      try {
        setLoading(true);
        const raw = localStorage.getItem(GUESTADDRESS_KEY);
        if (!raw) {
          setError('No saved address found');
          return false;
        }
        const parsed = JSON.parse(raw) as Address | Address[];
        // Handle both single object and array formats
        const storedAddress = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!storedAddress) {
          setError('Invalid address data');
          return false;
        }
        // Validate that the ID matches the stored guest address
        if (storedAddress.id !== id) {
          setError('Address ID mismatch');
          return false;
        }
        localStorage.removeItem(GUESTADDRESS_KEY);
        setAddresses([]);
        setSelected(null);
        return true;
      } catch (_e) {
        // console.error('Failed to remove guest address', _e);
        setError('Failed to remove address');
        return false;
      } finally {
        setLoading(false);
      }
    }

    return false;
  };

  const setDefaultAddress = async (id: string) => {
    if (!user) return null;

    try {
      setLoading(true);
      // CRITICAL FIX: Call the imported API function, not recursively call itself
      await setDefaultAddressAPI(id);

      // Clear explicit unselect flag when setting default (user wants to use an address)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(EXPLICITUNSELECT_KEY);
      }

      // Refresh addresses to get updated state
      const updatedAddresses = await fetchAddressesAPI();
      setAddresses(updatedAddresses || []);

      // Auto-select the newly set default address
      const newDefault = updatedAddresses?.find(
        (addr: Address) => addr.id === id
      );
      if (newDefault) {
        setSelected({ ...newDefault });
        hasAutoSelectedOnceRef.current = true;
      } else {
        // If the address was deleted, clear selection
        const stillExists = updatedAddresses?.find(
          (addr: Address) => addr.id === id
        );
        if (!stillExists) {
          setSelected(null);
        }
      }

      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error setting default address'
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectAddress = (id: string | null) => {
    if (!id) {
      // CRITICAL: When explicitly unselecting, set a flag to prevent auto-selection
      setSelected(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem(EXPLICITUNSELECT_KEY, 'true');
      }
      return;
    }

    // Clear explicit unselect flag when user selects an address
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EXPLICITUNSELECT_KEY);
    }

    const found = addresses.find(a => a.id === id) || null;
    setSelected(found);
    // Mark that we've had a user-initiated selection
    if (found) {
      hasAutoSelectedOnceRef.current = true;
    }
  };

  return {
    suggestions,
    addresses,
    saved: addresses, // for backward compatibility
    selected,
    loading,
    error,
    searchAddresses,
    saveAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    selectAddress,
    refresh: fetchAddresses,
    reloadSaved: fetchAddresses, // for backward compatibility
  };
}

export default useAddresses;
