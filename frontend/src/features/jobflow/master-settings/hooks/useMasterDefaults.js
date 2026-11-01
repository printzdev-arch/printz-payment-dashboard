import { useState, useEffect, useCallback } from "react";
import masterSettingsApi from "../api/masterSettingsApi";
import { DEFAULT_MASTER_CATEGORIES } from "../constants/defaultMasterSpecs";

const STORAGE_KEY = "printz_master_settings_cache";

// Helper to convert category array into easy keyed object
const transformSettingsMap = (categoriesList = []) => {
  const map = {};
  categoriesList.forEach((cat) => {
    map[cat.category] = (cat.items || [])
      .filter((it) => it.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });
  return map;
};

// Initial cached state
const getInitialState = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          rawCategories: parsed,
          map: transformSettingsMap(parsed),
        };
      }
    }
  } catch {}
  return {
    rawCategories: DEFAULT_MASTER_CATEGORIES,
    map: transformSettingsMap(DEFAULT_MASTER_CATEGORIES),
  };
};

export const useMasterDefaults = () => {
  const initial = getInitialState();
  const [categories, setCategories] = useState(initial.rawCategories);
  const [optionsMap, setOptionsMap] = useState(initial.map);
  const [loading, setLoading] = useState(false);

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      const res = await masterSettingsApi.getAllSettings();
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setCategories(list);
        const nextMap = transformSettingsMap(list);
        setOptionsMap(nextMap);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch {}
      }
    } catch {
      // Offline fallback: keep cached / seed values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatest();

    // Listen for cross-component or cross-tab updates
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCategories(parsed);
          setOptionsMap(transformSettingsMap(parsed));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("master_settings_updated", fetchLatest);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("master_settings_updated", fetchLatest);
    };
  }, [fetchLatest]);

  // Convenience getters for individual specification lists
  const productTypes = optionsMap.productTypes || [];
  const paperTypes = optionsMap.paperTypes || [];
  const paperGsmList = optionsMap.paperGsmList || [];
  const sizes = optionsMap.sizes || [];
  const colors = optionsMap.colors || [];
  const printingSides = optionsMap.printingSides || [];
  const laminationTypes = optionsMap.laminationTypes || [];
  const finishingEffects = optionsMap.finishingEffects || [];
  const proofRequirements = optionsMap.proofRequirements || [];
  const finishingServicesList = optionsMap.finishingServicesList || [];
  const paymentMethods = optionsMap.paymentMethods || [];
  const deliveryMethods = optionsMap.deliveryMethods || [];
  const productionOperations = optionsMap.productionOperations || [];

  const getDefaultValue = (category, fallback = "") => {
    const list = optionsMap[category] || [];
    const defaultItem = list.find((it) => it.isDefault);
    return defaultItem?.name || list[0]?.name || fallback;
  };

  return {
    categories,
    optionsMap,
    productTypes,
    paperTypes,
    paperGsmList,
    sizes,
    colors,
    printingSides,
    laminationTypes,
    finishingEffects,
    proofRequirements,
    finishingServicesList,
    paymentMethods,
    deliveryMethods,
    productionOperations,
    getDefaultValue,
    loading,
    refresh: fetchLatest,
  };
};

export default useMasterDefaults;
