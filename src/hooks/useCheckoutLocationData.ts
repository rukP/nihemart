'use client';

import { useState, useEffect, useCallback } from 'react';

// Location data (local JSON)
import provincesJson from '@/lib/data/provinces.json';
import districtsJson from '@/lib/data/districts.json';
import sectorsJson from '@/lib/data/sectors.json';

// ============================================================================
// CHECKOUT LOCATION DATA HOOK
// Handles loading and managing location data (provinces, districts, sectors)
// for Rwanda's administrative divisions. Also manages selected location state.
// ============================================================================

export interface Province {
  prv_id: string;
  prv_name: string;
}

export interface District {
  dst_id: string;
  dst_name: string;
  dst_province: string;
}

export interface Sector {
  sct_id: string;
  sct_name: string;
  sct_district: string;
}

export interface UseCheckoutLocationDataReturn {
  // Location data
  provinces: Province[];
  districts: District[];
  sectors: Sector[];

  // Selected values
  selectedProvince: string | null;
  selectedDistrict: string | null;
  selectedSector: string | null;

  // Setters
  setSelectedProvince: (province: string | null) => void;
  setSelectedDistrict: (district: string | null) => void;
  setSelectedSector: (sector: string | null) => void;

  // Filtered lists based on selections
  filteredDistricts: District[];
  filteredSectors: Sector[];

  // Helper functions
  findSectorByName: (name: string) => Sector | undefined;
  findDistrictById: (id: string) => District | undefined;
  findProvinceById: (id: string) => Province | undefined;
  resetLocationSelections: () => void;
}

export function useCheckoutLocationData(): UseCheckoutLocationDataReturn {
  // Location data state
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  // Selected location ids
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // Load location data from JSON imports
  useEffect(() => {
    try {
      const extract = (j: any, namePart: string) => {
        if (!j) return [];
        if (Array.isArray(j)) {
          const table = j.find(
            (x: any) => x.type === 'table' && x.name?.includes(namePart)
          );
          return table?.data || [];
        }
        if (j.type === 'table' && j.data) return j.data;
        return [];
      };

      setProvinces(extract(provincesJson, '1_provinces'));
      setDistricts(extract(districtsJson, '2_districts'));
      setSectors(extract(sectorsJson, '3_sectors'));
    } catch (_err) {
      // console.error('Failed to load location data:', _err);
    }
  }, []);

  // Clear dependent selections when province changes
  useEffect(() => {
    if (!selectedProvince) return;
    setSelectedDistrict(null);
    setSelectedSector(null);
  }, [selectedProvince]);

  // Clear sector when district changes
  useEffect(() => {
    if (!selectedDistrict) return;
    setSelectedSector(null);
  }, [selectedDistrict]);

  // Filtered districts based on selected province
  const filteredDistricts = selectedProvince
    ? districts.filter(d => d.dst_province === selectedProvince)
    : districts;

  // Filtered sectors based on selected district
  const filteredSectors = selectedDistrict
    ? sectors.filter(s => s.sct_district === selectedDistrict)
    : sectors;

  // Helper: find sector by name
  const findSectorByName = useCallback(
    (name: string) => {
      return sectors.find(
        s =>
          s.sct_name === name ||
          s.sct_name?.toLowerCase() === name?.toLowerCase()
      );
    },
    [sectors]
  );

  // Helper: find district by ID
  const findDistrictById = useCallback(
    (id: string) => {
      return districts.find(d => String(d.dst_id) === String(id));
    },
    [districts]
  );

  // Helper: find province by ID
  const findProvinceById = useCallback(
    (id: string) => {
      return provinces.find(p => String(p.prv_id) === String(id));
    },
    [provinces]
  );

  // Reset all location selections
  const resetLocationSelections = useCallback(() => {
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedSector(null);
  }, []);

  return {
    provinces,
    districts,
    sectors,
    selectedProvince,
    selectedDistrict,
    selectedSector,
    setSelectedProvince,
    setSelectedDistrict,
    setSelectedSector,
    filteredDistricts,
    filteredSectors,
    findSectorByName,
    findDistrictById,
    findProvinceById,
    resetLocationSelections,
  };
}

export default useCheckoutLocationData;
