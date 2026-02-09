'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ============================================================================
// CHECKOUT ADDRESS HANDLERS HOOK
// Manages temp addresses, address editing, and deletion for checkout.
// ============================================================================

interface UseCheckoutAddressHandlersProps {
  isLoggedIn: boolean;
  sectors: any[];
  districts: any[];
  setSelectedProvince: (province: string | null) => void;
  setSelectedDistrict: (district: string | null) => void;
  setSelectedSector: (sector: string | null) => void;
  selectedProvince: string | null;
  selectedDistrict: string | null;
  selectedSector: string | null;
  setFormData: (updater: (prev: any) => any) => void;
  setAddNewOpen: (open: boolean) => void;
  setAddressOpen: (open: boolean) => void;
  removeAddress: (id: string) => Promise<boolean>;
  reloadSaved: () => Promise<void>;
  selectedAddress: any;
  selectAddress: (id: string | null) => void;
  t: (key: string) => string;
}

export function useCheckoutAddressHandlers({
  isLoggedIn,
  sectors,
  districts,
  setSelectedProvince,
  setSelectedDistrict,
  setSelectedSector,
  selectedProvince,
  selectedDistrict,
  selectedSector,
  setFormData,
  setAddNewOpen,
  setAddressOpen,
  removeAddress,
  reloadSaved,
  selectedAddress,
  selectAddress,
  t,
}: UseCheckoutAddressHandlersProps) {
  // Temporary address state (for guests - not saved to DB)
  const [tempCheckoutAddress, setTempCheckoutAddress] = useState<any>(null);

  // Address form fields
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<any>(null);

  // Effective address: logged-in users use selectedAddress, guests use temp
  const effectiveAddress = isLoggedIn
    ? selectedAddress
    : tempCheckoutAddress || selectedAddress;

  // Update temp address (for editing existing temp)
  const handleUpdateTempAddress = useCallback(
    (addressData: any) => {
      if (isLoggedIn) return;
      const preservedTempData = tempCheckoutAddress?._temp || {};
      const updatedTemp = {
        ...tempCheckoutAddress,
        ...addressData,
        _isTemp: true,
        _temp: {
          ...preservedTempData,
          selectedProvince,
          selectedDistrict,
          selectedSector,
        },
      };
      setTempCheckoutAddress(updatedTemp);
      try {
        localStorage.setItem(
          'checkout_temp_address',
          JSON.stringify(updatedTemp)
        );
      } catch (_e) {
        // console.error('Error saving temp address:', _e);
      }
      setFormData((prev: any) => ({
        ...prev,
        address: addressData.street || addressData.display_name || prev.address,
        city: addressData.city || prev.city,
        phone: addressData.phone || prev.phone,
      }));
      setAddNewOpen(false);
      setAddressOpen(true);
      setEditingAddressId(null);
      setHouseNumber('');
      setPhoneInput('');
    },
    [
      isLoggedIn,
      tempCheckoutAddress,
      selectedProvince,
      selectedDistrict,
      selectedSector,
      setFormData,
      setAddNewOpen,
      setAddressOpen,
    ]
  );

  // Use address directly (create new temp)
  const handleUseAddressDirectly = useCallback(
    (addressData: any) => {
      if (isLoggedIn) return;
      const tempAddress = {
        id: 'temp-checkout-address',
        display_name: addressData.display_name,
        street: addressData.street,
        house_number: addressData.house_number,
        phone: addressData.phone,
        city: addressData.city,
        lat: addressData.lat,
        lon: addressData.lon,
        _isTemp: true,
        ...addressData,
      };
      if (addressData._temp) {
        if (addressData._temp.selectedProvince) {
          setSelectedProvince(addressData._temp.selectedProvince);
        }
        if (addressData._temp.selectedDistrict) {
          setSelectedDistrict(addressData._temp.selectedDistrict);
        }
        if (addressData._temp.selectedSector) {
          setSelectedSector(addressData._temp.selectedSector);
        }
      }
      setTempCheckoutAddress(tempAddress);
      try {
        localStorage.setItem(
          'checkout_temp_address',
          JSON.stringify(tempAddress)
        );
      } catch (_error) {
        // console.error('Error saving temp address to localStorage:', _error);
      }
      setFormData((prev: any) => ({
        ...prev,
        address: addressData.street || addressData.display_name || '',
        city: addressData.city || '',
        phone: addressData.phone || '',
      }));
      setAddNewOpen(false);
      setAddressOpen(false);
      toast.success(
        t('checkout.addressReadyForCheckout') || 'Address ready for checkout!'
      );
    },
    [
      isLoggedIn,
      setSelectedProvince,
      setSelectedDistrict,
      setSelectedSector,
      setFormData,
      setAddNewOpen,
      setAddressOpen,
      t,
    ]
  );

  // Clear temp address
  const handleClearTempAddress = useCallback(() => {
    setTempCheckoutAddress(null);
    try {
      localStorage.removeItem('checkout_temp_address');
    } catch (_error) {
      // console.error('Error removing temp address from localStorage:', _error);
    }
    toast.info('Address cleared');
  }, []);

  // Edit address in checkout
  const handleEditAddressInCheckout = useCallback(
    (addr: any) => {
      setAddressOpen(false);
      setAddNewOpen(true);
      if (addr._isTemp) {
        setEditingAddressId('temp-address-edit');
      } else {
        setEditingAddressId(addr.id);
      }
      setHouseNumber(addr.house_number || '');
      setPhoneInput(addr.phone || '');

      // Try to find matching sector for pre-selection
      let foundSector = sectors.find(
        (s: any) =>
          s.sct_name === addr.street || s.sct_name === addr.display_name
      );
      if (!foundSector) {
        foundSector = sectors.find((s: any) => s.sct_name === addr.city);
      }
      if (foundSector) {
        setSelectedSector(foundSector.sct_id);
        setSelectedDistrict(foundSector.sct_district);
        const foundDistrict = districts.find(
          (d: any) => d.dst_id === foundSector.sct_district
        );
        if (foundDistrict) {
          setSelectedProvince(foundDistrict.dst_province);
        }
      } else {
        const foundDistrict = districts.find(
          (d: any) => d.dst_name?.toLowerCase() === addr.city?.toLowerCase()
        );
        if (foundDistrict) {
          setSelectedDistrict(foundDistrict.dst_id);
          setSelectedProvince(foundDistrict.dst_province);
        }
      }
      setFormData((prev: any) => ({
        ...prev,
        address: addr.street || addr.display_name || prev.address,
        city: addr.city || prev.city,
        phone: addr.phone || prev.phone,
      }));
    },
    [
      sectors,
      districts,
      setSelectedProvince,
      setSelectedDistrict,
      setSelectedSector,
      setFormData,
      setAddNewOpen,
      setAddressOpen,
    ]
  );

  // Delete address in checkout (show confirmation)
  const handleDeleteAddressInCheckout = useCallback(
    (addr: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setAddressToDelete(addr);
      setDeleteConfirmOpen(true);
    },
    []
  );

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    if (!addressToDelete) return;
    if (addressToDelete._isTemp) {
      handleClearTempAddress();
      toast.success('Temporary address removed');
    } else {
      const success = await removeAddress(addressToDelete.id);
      if (success) {
        toast.success('Address deleted successfully');
        await reloadSaved();
        if (selectedAddress?.id === addressToDelete.id) {
          selectAddress(null);
        }
      } else {
        toast.error('Failed to delete address');
      }
    }
    setDeleteConfirmOpen(false);
    setAddressToDelete(null);
  }, [
    addressToDelete,
    handleClearTempAddress,
    removeAddress,
    reloadSaved,
    selectedAddress,
    selectAddress,
  ]);

  // Load temp address from localStorage on mount (for guests)
  const loadTempAddress = useCallback(() => {
    if (isLoggedIn) {
      try {
        localStorage.removeItem('checkout_temp_address');
      } catch (_e) {
        // console.error('Error clearing temp address:', _e);
      }
      return;
    }
    try {
      const savedTempAddress = localStorage.getItem('checkout_temp_address');
      if (savedTempAddress) {
        const parsedAddress = JSON.parse(savedTempAddress);
        setTempCheckoutAddress(parsedAddress);
        if (parsedAddress._temp) {
          if (parsedAddress._temp.selectedProvince) {
            setSelectedProvince(parsedAddress._temp.selectedProvince);
          }
          if (parsedAddress._temp.selectedDistrict) {
            setSelectedDistrict(parsedAddress._temp.selectedDistrict);
          }
          if (parsedAddress._temp.selectedSector) {
            setSelectedSector(parsedAddress._temp.selectedSector);
          }
        }
        setFormData((prev: any) => ({
          ...prev,
          address: parsedAddress.street || parsedAddress.display_name || '',
          city: parsedAddress.city || '',
          phone: parsedAddress.phone || '',
        }));
      }
    } catch (_error) {
      // console.error('Error loading temp address from localStorage:', _error);
    }
  }, [
    isLoggedIn,
    setSelectedProvince,
    setSelectedDistrict,
    setSelectedSector,
    setFormData,
  ]);

  return {
    // State
    tempCheckoutAddress,
    setTempCheckoutAddress,
    effectiveAddress,
    houseNumber,
    setHouseNumber,
    phoneInput,
    setPhoneInput,
    editingAddressId,
    setEditingAddressId,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    addressToDelete,
    setAddressToDelete,

    // Handlers
    handleUpdateTempAddress,
    handleUseAddressDirectly,
    handleClearTempAddress,
    handleEditAddressInCheckout,
    handleDeleteAddressInCheckout,
    handleConfirmDelete,
    loadTempAddress,
  };
}

export default useCheckoutAddressHandlers;
