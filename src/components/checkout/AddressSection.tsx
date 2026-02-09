'use client';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  AlertCircle,
  Edit3,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import CheckoutAddressForm from '@/components/checkout/CheckoutAddressForm';

// ============================================================================
// ADDRESS SECTION COMPONENT
// Handles the entire delivery address section including:
// - Add new address button
// - Address form (collapsible)
// - Saved/temporary address selection (collapsible)
// ============================================================================

// Using 'any' for address types since they come from different sources
// (useAddresses hook, temp addresses, etc.) with slightly different shapes
export interface AddressSectionProps {
  t: (key: string) => string;
  isLoggedIn: boolean;

  // Collapsible states
  addNewOpen: boolean;
  setAddNewOpen: (open: boolean) => void;
  addressOpen: boolean;
  setAddressOpen: (open: boolean) => void;

  // Address data - using any for flexibility with different address sources
  savedAddresses: any[];
  tempCheckoutAddress: any;
  effectiveAddress: any;
  selectedAddress: any;

  // Location data
  provinces: any[];
  districts: any[];
  sectors: any[];
  selectedProvince: string | null;
  setSelectedProvince: (province: string | null) => void;
  selectedDistrict: string | null;
  setSelectedDistrict: (district: string | null) => void;
  selectedSector: string | null;
  setSelectedSector: (sector: string | null) => void;

  // Address form fields
  houseNumber: string;
  setHouseNumber: (value: string) => void;
  phoneInput: string;
  setPhoneInput: (value: string) => void;
  editingAddressId: string | null;
  setEditingAddressId: (id: string | null) => void;

  // Address operations
  selectAddress: (id: string | null) => void;
  saveAddress: (data: any) => Promise<any>;
  updateAddress: (id: string, data: any) => Promise<any>;
  reloadSaved: () => Promise<void>;

  // Form data update
  setFormData: (updater: (prev: any) => any) => void;

  // Temp address handlers (for guests)
  setTempCheckoutAddress: (address: any) => void;
  handleUseAddressDirectly?: (data: any) => void;
  handleUpdateTempAddress?: (data: any) => void;

  // Edit/delete handlers
  handleEditAddressInCheckout: (addr: any) => void;
  handleDeleteAddressInCheckout: (addr: any, e: React.MouseEvent) => void;

  // Navigation
  onNavigateToAddresses: () => void;
  onNextStep: () => void;
}

export function AddressSection({
  t,
  isLoggedIn,
  addNewOpen,
  setAddNewOpen,
  addressOpen,
  setAddressOpen,
  savedAddresses,
  tempCheckoutAddress,
  effectiveAddress,
  selectedAddress,
  provinces,
  districts,
  sectors,
  selectedProvince,
  setSelectedProvince,
  selectedDistrict,
  setSelectedDistrict,
  selectedSector,
  setSelectedSector,
  houseNumber,
  setHouseNumber,
  phoneInput,
  setPhoneInput,
  editingAddressId,
  setEditingAddressId,
  selectAddress,
  saveAddress,
  updateAddress,
  reloadSaved,
  setFormData,
  setTempCheckoutAddress,
  handleUseAddressDirectly,
  handleUpdateTempAddress,
  handleEditAddressInCheckout,
  handleDeleteAddressInCheckout,
  onNavigateToAddresses,
  onNextStep,
}: AddressSectionProps) {
  // Handle address selection
  const handleAddressSelect = (addr: any) => {
    // If address is already selected, unselect it
    if (!addr._isTemp && selectedAddress?.id === addr.id) {
      selectAddress(null);
      setAddressOpen(false);
      toast.success('Address unselected');
      return;
    }

    // Handle temp address differently
    if (addr._isTemp) {
      setFormData((prev: any) => ({
        ...prev,
        address: addr.street || addr.display_name || '',
        city: addr.city || '',
        phone: addr.phone || '',
      }));
      setAddressOpen(false);
      toast.success('Address selected');
      return;
    }

    // Clear temp address when selecting a saved one
    setTempCheckoutAddress(null);
    try {
      localStorage.removeItem('checkout_temp_address');
    } catch (_error) {
      // console.error('Error clearing temp address:', _error);
    }

    selectAddress(addr.id);

    // Find matching sector for delivery fee calculation
    const foundSector = sectors.find(
      (s: any) =>
        s.sct_name === addr.street ||
        s.sct_name === addr.display_name ||
        s.sct_name === addr.city
    );
    if (foundSector) {
      setSelectedSector(foundSector.sct_id);
      setSelectedDistrict(foundSector.sct_district);
      const foundDistrict = districts.find(
        (d: any) => d.dst_id === foundSector.sct_district
      );
      if (foundDistrict) {
        setSelectedProvince(foundDistrict.dst_province);
      }
    }

    // Update form data
    const streetOrName = addr.street ?? addr.display_name ?? '';
    const firstSegment =
      streetOrName
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean)[0] || streetOrName;

    setFormData((prev: any) => ({
      ...prev,
      address: firstSegment || prev.address,
      city: addr.city ?? prev.city,
      phone: addr.phone ?? prev.phone,
    }));

    setAddressOpen(false);
    toast.success('Address selected');
  };

  // Combine saved addresses with temp address
  const allAddresses: any[] = [];
  if (tempCheckoutAddress) {
    allAddresses.push(tempCheckoutAddress);
  }
  if (savedAddresses && savedAddresses.length > 0) {
    allAddresses.push(...savedAddresses);
  }

  // Reset form for new address
  const handleAddNewAddress = () => {
    setAddNewOpen(true);
    setAddressOpen(false);
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedSector(null);
    setHouseNumber('');
    setPhoneInput('');
    setEditingAddressId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-5 border border-gray-200 rounded-xl p-4 sm:p-5 bg-gradient-to-b from-gray-50 to-white shadow-sm">
      {/* Header with Add Address button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {t('checkout.addDeliveryAddress')}
          </h2>
        </div>
        {isLoggedIn ? (
          <Button
            onClick={handleAddNewAddress}
            size="sm"
            variant="outline"
            className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 w-full sm:w-auto text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {t('checkout.addNewAddress')}
          </Button>
        ) : (
          <Button
            onClick={handleAddNewAddress}
            size="sm"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 w-full sm:w-auto text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            {t('checkout.addAddress')}
          </Button>
        )}
      </div>

      {/* Add New Address Form (collapsible) */}
      <Collapsible open={addNewOpen} onOpenChange={setAddNewOpen}>
        <CollapsibleTrigger asChild>
          <div className="mt-2"></div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 sm:mt-4">
          <CheckoutAddressForm
            provinces={provinces}
            districts={districts}
            sectors={sectors}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            selectedSector={selectedSector}
            setSelectedSector={setSelectedSector}
            houseNumber={houseNumber}
            setHouseNumber={setHouseNumber}
            phoneInput={phoneInput}
            setPhoneInput={setPhoneInput}
            editingAddressId={editingAddressId}
            setEditingAddressId={setEditingAddressId}
            saveAddress={saveAddress}
            updateAddress={updateAddress}
            reloadSaved={reloadSaved}
            setAddNewOpen={setAddNewOpen}
            setAddressOpen={setAddressOpen}
            onUseDirectly={!isLoggedIn ? handleUseAddressDirectly : undefined}
            onUpdateTempAddress={
              !isLoggedIn ? handleUpdateTempAddress : undefined
            }
            isLoggedIn={isLoggedIn}
            t={t}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Select Delivery Address (collapsible) */}
      <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-3 sm:p-3.5 flex items-center justify-between text-gray-700 hover:text-orange-600 hover:bg-orange-50/50 transition-all rounded-lg border border-gray-200 bg-white">
            <span className="text-xs sm:text-sm font-medium">
              {t('checkout.selectDeliveryAddress')}
            </span>
            {addressOpen ? (
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-transform" />
            ) : (
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 transition-transform" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 sm:mt-4">
          <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
            {allAddresses.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {allAddresses.map(addr => (
                  <div
                    key={addr.id}
                    role="button"
                    tabIndex={0}
                    onClick={e => {
                      // Don't select if clicking on action buttons
                      if ((e.target as HTMLElement).closest('button')) {
                        return;
                      }
                      handleAddressSelect(addr);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAddressSelect(addr);
                      }
                    }}
                    className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 bg-white hover:border-orange-300 hover:shadow-sm ${
                      effectiveAddress?.id === addr.id ||
                      (addr._isTemp && effectiveAddress?._isTemp)
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start">
                      {/* Radio indicator */}
                      <div className="flex items-center mr-2 sm:mr-3 mt-0.5">
                        <div
                          className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            effectiveAddress?.id === addr.id ||
                            (addr._isTemp && effectiveAddress?._isTemp)
                              ? 'bg-orange-500 border-orange-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {(effectiveAddress?.id === addr.id ||
                            (addr._isTemp && effectiveAddress?._isTemp)) && (
                            <div className="h-1 w-1 sm:h-2 sm:w-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>

                      {/* Address details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-xs sm:text-sm text-gray-800 truncate">
                            {addr.display_name}
                          </p>
                          {addr._isTemp && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              {t('checkout.tempAddress') || 'Temporary'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {addr.city}
                        </p>
                        {addr.phone && (
                          <p className="text-xs text-orange-600 mt-1">
                            {t('checkout.contactPhoneLabel')} {addr.phone}
                          </p>
                        )}
                      </div>

                      {/* Edit and Delete buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-gray-100"
                          onClick={e => {
                            e.stopPropagation();
                            handleEditAddressInCheckout(addr);
                          }}
                          title="Edit address"
                        >
                          <Edit3 className="h-3 w-3 text-gray-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-red-50"
                          onClick={e => handleDeleteAddressInCheckout(addr, e)}
                          title={
                            addr._isTemp
                              ? 'Remove temporary address'
                              : 'Delete address'
                          }
                        >
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Footer actions */}
                <div className="flex flex-col sm:flex-row justify-between pt-3 sm:pt-4 gap-2 sm:gap-0">
                  {isLoggedIn && (
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-9 sm:h-10"
                      onClick={onNavigateToAddresses}
                    >
                      Manage Addresses
                    </Button>
                  )}
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 text-xs sm:text-sm h-9 sm:h-10"
                    onClick={onNextStep}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            ) : (
              // No addresses message
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-orange-900">
                      {t('checkout.noSavedAddresses') || 'No saved addresses'}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Please add a delivery address above to continue with your
                      order.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default AddressSection;
