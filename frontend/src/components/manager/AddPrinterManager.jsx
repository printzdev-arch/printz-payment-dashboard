import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";
import Pagination from "../common/Pagination";
import BranchSelect from "../common/BranchSelect";
import "../../styles/printzTheme.css";
import "../../styles/addprinter.css";

import {
  Printer,
  Plus,
  Check,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  MapPin,
  Tag,
  DollarSign,
  Sparkles,
  FileText,
  Copy,
  Scroll,
  Palette,
  Image as ImageIcon,
  Scan,
  Settings,
  ChevronDown,
  ArrowLeft,
  Eye,
  Search,
} from "lucide-react";

const AddPrinterManager = () => {
  const locationState = useLocation();
  const navigate = useNavigate();
  const incomingPrinter = locationState?.state?.printer;

  const [editingPrinterId, setEditingPrinterId] = useState(incomingPrinter?.id || null);
  const [printerId, setPrinterId] = useState(incomingPrinter?.printerId || "");
  const [location, setLocation] = useState(incomingPrinter?.location || "");
  const [printerType, setPrinterType] = useState(incomingPrinter?.printerType || "MFP");
  const [printerName, setPrinterName] = useState(incomingPrinter?.printerName || "");
  const [sizes, setSizes] = useState([]);
  const [customServices, setCustomServices] = useState(
    incomingPrinter?.customServices || []
  );
  const [newServiceName, setNewServiceName] = useState("");
  const [showAddService, setShowAddService] = useState(false);
  const [servicePrices, setServicePrices] = useState({});
  const [activeService, setActiveService] = useState("TOTAL LARGE");
  const [confirmedServices, setConfirmedServices] = useState({});
  const [userId] = useState("");
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(
    incomingPrinter?.branchName || incomingPrinter?.branch || ""
  );
  const [jumboXeroxServices, setJumboXeroxServices] = useState([]);
  const [customJumboServices, setCustomJumboServices] = useState(
    incomingPrinter?.customJumboServices || []
  );
  const [newJumboServiceName, setNewJumboServiceName] = useState("");
  const [showAddJumboService, setShowAddJumboService] = useState(false);
  const [jumboServicePrices, setJumboServicePrices] = useState({});
  const [jumboServiceSizes, setJumboServiceSizes] = useState({});
  const [activeJumboService, setActiveJumboService] = useState("COLOUR");
  const [activeJumboPaperSize, setActiveJumboPaperSize] = useState("");
  const [hasActiveLFP, setHasActiveLFP] = useState(false);
  const [isGeneratingPrinterId, setIsGeneratingPrinterId] = useState(false);
  const [userEditedPrinterId, setUserEditedPrinterId] = useState(
    Boolean(incomingPrinter?.printerId)
  );
  const [printersInBranch, setPrintersInBranch] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [printerSearchTerm, setPrinterSearchTerm] = useState("");
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [printersPerPage, setPrintersPerPage] = useState(5);

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const branchDropdownRef = useRef(null);

  const { popup, showSuccess, showError } = usePopup();

  const defaultServices = [
    "TOTAL LARGE",
    "TOTAL SMALL",
    "B/W SCAN",
    "COLOUR SCAN",
    "LONG SHEET",
  ];

  const defaultJumboServices = ["COLOUR", "PHOTO PRINT", "SCAN", "B&W"];
  const paperSizes = ["A0", "A1", "A2", "A3", "A4", "A5"];

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches");
        const branchList = res.data?.data || res.data || [];
        const branchData = branchList.map((b) => ({
          id: b.id || b._id,
          name: (b.name || "").toString(),
          address: b.address || "",
          code: (b.code || "").toString(),
        }));

        const sortedBranches = branchData.sort((a, b) => {
          const nameA = a.name.trim().toLowerCase();
          const nameB = b.name.trim().toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        // Build unique two-letter codes (letters only) and persist missing ones
        const usedCodes = new Set(
          sortedBranches
            .map((b) => (b.code || "").replace(/[^A-Za-z]/g, "").toUpperCase())
            .filter((c) => c.length === 2)
        );

        const computeCodeFor = (name, used) => {
          const letters = (name || "").replace(/[^A-Za-z]/g, "").toUpperCase();
          if (letters.length === 0) {
            for (let i = 0; i < 26; i++) {
              for (let j = 0; j < 26; j++) {
                const cc =
                  String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
                if (!used.has(cc)) return cc;
              }
            }
            return "XX";
          }
          const first = letters[0];
          for (let k = 1; k < letters.length; k++) {
            const cc = first + letters[k];
            if (!used.has(cc)) return cc;
          }
          for (let i = 0; i < letters.length; i++) {
            for (let j = i + 1; j < letters.length; j++) {
              const cc = letters[i] + letters[j];
              if (!used.has(cc)) return cc;
            }
          }
          for (let j = 0; j < 26; j++) {
            const cc = first + String.fromCharCode(65 + j);
            if (!used.has(cc)) return cc;
          }
          return "XX";
        };

        const branchesNeedingUpdate = [];
        for (const b of sortedBranches) {
          const current = (b.code || "")
            .replace(/[^A-Za-z]/g, "")
            .toUpperCase();
          if (current.length === 2) continue;
          const newCode = computeCodeFor(b.name, usedCodes);
          b.code = newCode;
          usedCodes.add(newCode);
          branchesNeedingUpdate.push({ id: b.id, code: newCode });
        }

        if (branchesNeedingUpdate.length > 0) {
          try {
            await Promise.all(
              branchesNeedingUpdate.map((br) =>
                api.put(`/branches/${br.id}`, { code: br.code })
              )
            );
          } catch (e) {
            console.warn(
              "Failed to persist some branch codes. Proceeding with in-memory codes.",
              e
            );
          }
        }

        setBranches(sortedBranches);

        if (sortedBranches.length > 0) {
          const defaultBranch = sortedBranches[0].name;
          setSelectedBranch(
            (prev) =>
              prev ||
              incomingPrinter?.branchName ||
              incomingPrinter?.branch ||
              defaultBranch
          );
        }
      } catch (error) {
        console.error("Failed to fetch branch names: ", error);
      }
    };
    fetchBranches();
  }, [incomingPrinter]);

  const restoreIncomingPrinter = useCallback(
    async (printer) => {
      if (!printer) return;

      setEditingPrinterId(printer.id || null);
      setSelectedBranch(
        printer.branchName || printer.branch || ""
      );
      setPrinterId(printer.printerId || "");
      setUserEditedPrinterId(Boolean(printer.printerId));
      setPrinterName(printer.printerName || "");
      setPrinterType(printer.printerType || "MFP");
      setLocation(printer.location || "");

      setNewServiceName("");
      setShowAddService(false);
      setNewJumboServiceName("");
      setShowAddJumboService(false);

      // Populate prices, confirmedServices, sizes, customServices
      const pPrices = {};
      const pConfirmed = {};
      const pSizes = [];
      const pCustom = Array.isArray(printer.customServices)
        ? [...printer.customServices]
        : [];

      if (printer.prices && Array.isArray(printer.prices)) {
        printer.prices.forEach((p) => {
          if (p && p.size) {
            pPrices[p.size] = p.price;
            pConfirmed[p.size] = true;
            pSizes.push(p.size);
            if (!defaultServices.includes(p.size) && !pCustom.includes(p.size)) {
              pCustom.push(p.size);
            }
          }
        });
      }

      setServicePrices(pPrices);
      setConfirmedServices(pConfirmed);
      setSizes(pSizes);
      setCustomServices(pCustom);
      if (pSizes.length > 0) {
        setActiveService(pSizes[0]);
      } else {
        setActiveService("TOTAL LARGE");
      }

      // If LFP, load JumboXerox services from collection
      if (printer.printerType === "LFP" && printer.printerId) {
        try {
          const res = await api.get("/jumbo-xerox/machines", {
            params: {
              printerId: printer.printerId,
              isActive: true,
            },
          });
          const machines = res.data?.data || res.data || [];
          const jPrices = {};
          const jSizes = {};
          const jTypes = new Set();
          const jCustom = Array.isArray(printer.customJumboServices)
            ? [...printer.customJumboServices]
            : [];

          machines.forEach((data) => {
            const type = data.type;
            const size = data.size;
            const unitPrice = data.unitPrice;
            if (type && size) {
              jPrices[`${type}_${size}`] = unitPrice;
              if (!jSizes[type]) jSizes[type] = [];
              if (!jSizes[type].includes(size)) jSizes[type].push(size);
              jTypes.add(type);
              if (
                !defaultJumboServices.includes(type) &&
                !jCustom.includes(type)
              ) {
                jCustom.push(type);
              }
            }
          });

          const typesList = Array.from(jTypes);
          setJumboServicePrices(jPrices);
          setJumboServiceSizes(jSizes);
          setJumboXeroxServices(typesList);
          setCustomJumboServices(jCustom);

          if (typesList.length > 0) {
            const firstType = typesList[0];
            setActiveJumboService(firstType);
            if (jSizes[firstType]?.length > 0) {
              setActiveJumboPaperSize(jSizes[firstType][0]);
            } else {
              setActiveJumboPaperSize("");
            }
          } else {
            setActiveJumboService("COLOUR");
            setActiveJumboPaperSize("");
          }
        } catch (err) {
          console.error("Error loading Jumbo Xerox rates for printer:", err);
        }
      } else {
        setJumboServicePrices({});
        setJumboServiceSizes({});
        setJumboXeroxServices([]);
        setCustomJumboServices(printer.customJumboServices || []);
        setActiveJumboService("COLOUR");
        setActiveJumboPaperSize("");
      }
    },
    [defaultServices, defaultJumboServices]
  );

  // Load all details from incoming printer (passed from View icon in Printer List)
  useEffect(() => {
    if (incomingPrinter) {
      restoreIncomingPrinter(incomingPrinter);
    }
  }, [incomingPrinter, restoreIncomingPrinter]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target)
      ) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectBranch = (branchName) => {
    setSelectedBranch(branchName);
    setUserEditedPrinterId(false);
    setPrinterId("");
    setBranchDropdownOpen(false);
    setBranchSearch("");
  };

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    setUserEditedPrinterId(false);
    setPrinterId("");
  };

  // Check if branch already has an active LFP
  const checkActiveLFPForBranch = useCallback(
    async (branchName) => {
      if (!branchName) {
        setHasActiveLFP(false);
        return;
      }
      try {
        const res = await api.get("/printers", {
          params: {
            branchName,
            isActive: true,
            printerType: "LFP",
          },
        });
        const list = res.data?.data || res.data || [];
        const otherLfps = list.filter(
          (docSnap) => (docSnap.id || docSnap._id) !== editingPrinterId
        );
        setHasActiveLFP(otherLfps.length > 0);
      } catch (error) {
        console.error("Error checking LFP for branch: ", error);
      }
    },
    [editingPrinterId]
  );

  useEffect(() => {
    if (selectedBranch) {
      checkActiveLFPForBranch(selectedBranch);
    }
  }, [selectedBranch, checkActiveLFPForBranch]);

  const fetchPrintersForBranch = useCallback(
    async (branchName) => {
      if (!branchName) {
        setPrintersInBranch([]);
        setHasActiveLFP(false);
        return;
      }

      setLoadingPrinters(true);

      try {
        const res = await api.get("/printers", {
          params: {
            branchName,
            isActive: true,
          },
        });
        const docs = res.data?.data || res.data || [];

        const printersList = [];
        let foundActiveLFP = false;

        for (const printerDoc of docs) {
          const printerData = {
            ...printerDoc,
            id: printerDoc.id || printerDoc._id,
          };

          if (
            printerData.printerType === "LFP" &&
            printerData.isActive &&
            printerData.id !== editingPrinterId
          ) {
            foundActiveLFP = true;
          }

          // Load Jumbo Xerox services only for LFP printers
          if (printerData.printerType === "LFP") {
            try {
              const jumboRes = await api.get("/jumbo-xerox/machines", {
                params: {
                  printerId: printerData.printerId,
                  branch: branchName,
                  isActive: true,
                },
              });
              printerData.jumboServices = jumboRes.data?.data || jumboRes.data || [];
            } catch (jErr) {
              console.error("Error fetching jumbo machines for printer:", jErr);
              printerData.jumboServices = [];
            }
          }

          printersList.push(printerData);
        }

        setHasActiveLFP(foundActiveLFP);

        printersList.sort((a, b) =>
          String(a.printerId || "").localeCompare(
            String(b.printerId || "")
          )
        );

        setPrintersInBranch(printersList);
      } catch (error) {
        console.error("Error fetching printers:", error);

        if (typeof showError === "function") {
          showError("Failed to load printers for this branch");
        }
      } finally {
        setLoadingPrinters(false);
      }
    },
    [showError, editingPrinterId]
  );

  useEffect(() => {
    if (selectedBranch) {
      fetchPrintersForBranch(selectedBranch);
    } else {
      setPrintersInBranch([]);
      setHasActiveLFP(false);
    }
  }, [selectedBranch, fetchPrintersForBranch]);

  // Generate next unique printer ID for the branch: PS-XX-###
  const generateUniquePrinterIdForBranch = useCallback(
    async (branchName) => {
      if (!branchName) throw new Error("Branch name required");

      const b = branches.find((x) => x.name === branchName);
      let code = (b?.code || "").replace(/[^A-Za-z]/g, "").toUpperCase();
      if (code.length !== 2) {
        const cleaned = (branchName || "")
          .replace(/[^A-Za-z]/g, "")
          .toUpperCase();
        if (cleaned.length >= 2) code = cleaned.slice(0, 2);
        else if (cleaned.length === 1) code = cleaned + "X";
        else code = "XX";
      }
      const prefix = `PS-${code}-`;

      const allPrintersRes = await api.get("/printers");
      const allPrinters = allPrintersRes.data?.data || allPrintersRes.data || [];
      const usedNumbers = new Set();
      const existingPrinterIds = new Set(
        allPrinters.map((p) => String(p.printerId || "").toUpperCase())
      );

      allPrinters.forEach((d) => {
        const pid = String(d.printerId || "").toUpperCase();
        const m = pid.match(new RegExp(`^PS-${code}-(\\d+)$`));
        if (m) {
          const num = parseInt(m[1], 10);
          if (!Number.isNaN(num)) usedNumbers.add(num);
        }
      });

      let next =
        usedNumbers.size > 0 ? Math.max(...Array.from(usedNumbers)) + 1 : 1;

      for (let i = 0; i < 2000; i++) {
        const candidate = `${prefix}${String(next).padStart(3, "0")}`;
        if (!existingPrinterIds.has(candidate)) return candidate;
        next++;
      }
      return `${prefix}${String(next).padStart(3, "0")}`;
    },
    [branches]
  );

  const startAutoGeneratePrinterId = useCallback(async () => {
    if (!selectedBranch) return;
    if (userEditedPrinterId) return;
    if (editingPrinterId) return;
    try {
      setIsGeneratingPrinterId(true);
      setPrinterId("GENERATING PRINTER ID...");
      const id = await generateUniquePrinterIdForBranch(selectedBranch);
      if (!userEditedPrinterId && !editingPrinterId) setPrinterId(id);
    } catch (err) {
      console.error(err);
      showError(err?.message || "Failed to generate printer ID");
      if (!userEditedPrinterId && !editingPrinterId) setPrinterId("");
    } finally {
      setIsGeneratingPrinterId(false);
    }
  }, [
    selectedBranch,
    userEditedPrinterId,
    editingPrinterId,
    generateUniquePrinterIdForBranch,
    showError,
  ]);

  useEffect(() => {
    startAutoGeneratePrinterId();
  }, [startAutoGeneratePrinterId]);

  const checkPrinterIdExists = async (printerIdToCheck) => {
    try {
      const res = await api.get("/printers", {
        params: { printerId: printerIdToCheck.toUpperCase() },
      });
      const list = res.data?.data || res.data || [];

      const existingPrinter = list.find(
        (p) =>
          String(p.printerId || "").trim().toUpperCase() ===
          String(printerIdToCheck || "").trim().toUpperCase()
      );

      if (existingPrinter) {
        return {
          exists: true,
          branchName: existingPrinter.branchName,
          printerName: existingPrinter.printerName,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error("Error checking printer ID: ", error);
      return { exists: false };
    }
  };

  const handleSizeChange = (service) => {
    setSizes((prevSizes) => {
      const isSelected = prevSizes.includes(service);
      if (!isSelected) {
        return [...prevSizes, service];
      } else {
        const updatedPrices = { ...servicePrices };
        delete updatedPrices[service];
        setServicePrices(updatedPrices);
        return prevSizes.filter((s) => s !== service);
      }
    });
  };

  const handleJumboSizeChange = (type) => {
    setJumboXeroxServices((prevServices) => {
      const isSelected = prevServices.includes(type);
      if (!isSelected) {
        return [...prevServices, type];
      } else {
        const updatedPrices = { ...jumboServicePrices };
        const updatedSizes = { ...jumboServiceSizes };

        Object.keys(updatedPrices).forEach((key) => {
          if (key.startsWith(`${type}_`)) {
            delete updatedPrices[key];
          }
        });
        delete updatedSizes[type];

        setJumboServicePrices(updatedPrices);
        setJumboServiceSizes(updatedSizes);
        return prevServices.filter((s) => s !== type);
      }
    });
  };

  const handleJumboTypeSizeChange = (type, size) => {
    setJumboServiceSizes((prev) => {
      const currentSizes = prev[type] || [];
      const isSelected = currentSizes.includes(size);

      if (!isSelected) {
        return {
          ...prev,
          [type]: [...currentSizes, size],
        };
      } else {
        const priceKey = `${type}_${size}`;
        const updatedPrices = { ...jumboServicePrices };
        delete updatedPrices[priceKey];
        setJumboServicePrices(updatedPrices);

        return {
          ...prev,
          [type]: currentSizes.filter((s) => s !== size),
        };
      }
    });
  };

  const handleJumboPriceChange = (type, size, price) => {
    const priceKey = `${type}_${size}`;
    setJumboServicePrices((prev) => ({
      ...prev,
      [priceKey]: price,
    }));
  };

  const formatServiceName = (name) => {
    if (!name) return "";
    const upper = name.toUpperCase();
    if (upper === "B/W SCAN") return "B/W Scan";
    return name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getServiceIcon = (service, size = 20, isLive = false) => {
    const s = (service || "").toUpperCase();
    const color = isLive ? "#10b981" : "#64748b";

    if (s === "TOTAL LARGE") {
      return <Printer size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    if (s === "TOTAL SMALL") {
      return <FileText size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    if (s === "B/W SCAN") {
      return <Copy size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    if (s === "COLOUR SCAN") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="7.2" r="4.2" fill="#ec4899" />
          <circle cx="7.2" cy="15.8" r="4.2" fill="#0ea5e9" />
          <circle cx="16.8" cy="15.8" r="4.2" fill="#eab308" />
        </svg>
      );
    }
    if (s === "LONG SHEET") {
      return <Scroll size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    return <Tag size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
  };

  const handleConfirmService = (service) => {
    const price = servicePrices[service];
    if (price === undefined || price === "" || Number(price) <= 0) {
      showError(`Please enter a valid price for ${formatServiceName(service)}`);
      return;
    }
    setConfirmedServices((prev) => ({ ...prev, [service]: true }));
    setSizes((prev) => (prev.includes(service) ? prev : [...prev, service]));
    showSuccess(`${formatServiceName(service)} price confirmed: ₹${price}`);
  };

  const handlePriceChange = (serviceName, price) => {
    setServicePrices((prev) => ({
      ...prev,
      [serviceName]: price,
    }));
    if (!price || Number(price) <= 0) {
      setConfirmedServices((prev) => {
        const next = { ...prev };
        delete next[serviceName];
        return next;
      });
      setSizes((prev) => prev.filter((s) => s !== serviceName));
    }
  };

  const handleAddCustomService = () => {
    const serviceNameUpper = newServiceName.trim().toUpperCase();
    if (
      serviceNameUpper &&
      !customServices.map((s) => s.toUpperCase()).includes(serviceNameUpper) &&
      !defaultServices.map((s) => s.toUpperCase()).includes(serviceNameUpper)
    ) {
      setCustomServices((prev) => [...prev, serviceNameUpper]);
      setActiveService(serviceNameUpper);
      setNewServiceName("");
      setShowAddService(false);
      showSuccess(`Custom service "${serviceNameUpper}" added successfully`);
    } else if (
      defaultServices.map((s) => s.toUpperCase()).includes(serviceNameUpper) ||
      customServices.map((s) => s.toUpperCase()).includes(serviceNameUpper)
    ) {
      showError("Service already exists");
    } else {
      showError("Please enter a valid service name");
    }
  };

  const getJumboServiceIcon = (service, size = 20, isLive = false) => {
    const s = (service || "").toUpperCase();
    const color = isLive ? "#10b981" : "#64748b";

    if (s === "COLOUR") {
      return <Palette size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    if (s === "PHOTO PRINT") {
      return <ImageIcon size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    if (s === "SCAN") {
      return <Scan size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    if (s === "B&W" || s === "B/W") {
      return <FileText size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
    }
    return <Tag size={size} color={color} strokeWidth={isLive ? 2.3 : 1.8} />;
  };

  const handleJumboRateChange = (type, size, price) => {
    const priceKey = `${type}_${size}`;
    setJumboServicePrices((prev) => ({
      ...prev,
      [priceKey]: price,
    }));

    if (price && Number(price) > 0) {
      setJumboXeroxServices((prev) =>
        prev.includes(type) ? prev : [...prev, type]
      );
      setJumboServiceSizes((prev) => ({
        ...prev,
        [type]: (prev[type] || []).includes(size)
          ? prev[type]
          : [...(prev[type] || []), size],
      }));
    } else {
      setJumboServiceSizes((prev) => {
        const remaining = (prev[type] || []).filter((sz) => sz !== size);
        return {
          ...prev,
          [type]: remaining,
        };
      });
    }
  };

  const handleAddCustomJumboService = () => {
    const serviceNameUpper = newJumboServiceName.trim().toUpperCase();
    if (
      serviceNameUpper &&
      !customJumboServices
        .map((s) => s.toUpperCase())
        .includes(serviceNameUpper) &&
      !defaultJumboServices
        .map((s) => s.toUpperCase())
        .includes(serviceNameUpper)
    ) {
      setCustomJumboServices((prev) => [...prev, serviceNameUpper]);
      setActiveJumboService(serviceNameUpper);
      setNewJumboServiceName("");
      setShowAddJumboService(false);
      showSuccess(
        `Custom jumbo service "${serviceNameUpper}" added successfully`
      );
    } else if (
      defaultJumboServices
        .map((s) => s.toUpperCase())
        .includes(serviceNameUpper) ||
      customJumboServices.map((s) => s.toUpperCase()).includes(serviceNameUpper)
    ) {
      showError("Jumbo service already exists");
    } else {
      showError("Please enter a valid jumbo service name");
    }
  };

  const handleRemoveCustomService = (serviceName) => {
    setCustomServices((prev) =>
      prev.filter((service) => service !== serviceName)
    );
    setSizes((prev) => prev.filter((size) => size !== serviceName));
    setConfirmedServices((prev) => {
      const next = { ...prev };
      delete next[serviceName];
      return next;
    });
    const updatedPrices = { ...servicePrices };
    delete updatedPrices[serviceName];
    setServicePrices(updatedPrices);
    if (activeService === serviceName) {
      setActiveService("TOTAL LARGE");
    }
    showSuccess(`Custom service "${serviceName}" removed`);
  };

  const handleRemoveCustomJumboService = (serviceName) => {
    setCustomJumboServices((prev) =>
      prev.filter((service) => service !== serviceName)
    );
    setJumboXeroxServices((prev) =>
      prev.filter((size) => size !== serviceName)
    );
    const updatedPrices = { ...jumboServicePrices };
    Object.keys(updatedPrices).forEach((k) => {
      if (k.startsWith(`${serviceName}_`)) delete updatedPrices[k];
    });
    setJumboServicePrices(updatedPrices);
    if (activeJumboService === serviceName) {
      setActiveJumboService("COLOUR");
    }
    showSuccess(`Custom jumbo service "${serviceName}" removed`);
  };

  const handleReset = async () => {
    if (incomingPrinter) {
      await restoreIncomingPrinter(incomingPrinter);
      return;
    }
    setLocation("");
    setPrinterName("");
    setPrinterType("MFP");
    setSizes([]);
    setCustomServices([]);
    setServicePrices({});
    setConfirmedServices({});
    setActiveService("TOTAL LARGE");
    setNewServiceName("");
    setShowAddService(false);
    setJumboXeroxServices([]);
    setCustomJumboServices([]);
    setJumboServicePrices({});
    setJumboServiceSizes({});
    setActiveJumboService("COLOUR");
    setActiveJumboPaperSize("");
    setNewJumboServiceName("");
    setShowAddJumboService(false);
    setUserEditedPrinterId(false);
    startAutoGeneratePrinterId();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. If updating an existing printer
      if (editingPrinterId) {
        const printerIdUpper = printerId.trim().toUpperCase();
        const oldPrinterId = (incomingPrinter?.printerId || "").toUpperCase();

        if (oldPrinterId && oldPrinterId !== printerIdUpper) {
          const printerCheck = await checkPrinterIdExists(printerIdUpper);
          if (printerCheck.exists) {
            showError(
              `Printer ID "${printerIdUpper}" already exists in ${printerCheck.branchName} branch as "${printerCheck.printerName}"`
            );
            setIsLoading(false);
            return;
          }
        }

        // Validate LFP restriction if transitioning to or maintaining LFP
        if (printerType === "LFP") {
          const lfpRes = await api.get("/printers", {
            params: {
              branchName: selectedBranch,
              isActive: true,
              printerType: "LFP",
            },
          });
          const lfpSnap = lfpRes.data?.data || lfpRes.data || [];
          const otherLfps = lfpSnap.filter((d) => (d.id || d._id) !== editingPrinterId);
          if (otherLfps.length > 0) {
            showError(
              `Cannot set to LFP. ${selectedBranch} already has an active LFP printer.`
            );
            setIsLoading(false);
            return;
          }
        }

        const prices = [];
        const servicesToSave = Array.from(
          new Set([
            ...sizes,
            ...Object.keys(servicePrices).filter(
              (s) => servicePrices[s] && Number(servicePrices[s]) > 0
            ),
          ])
        );
        servicesToSave.forEach((service) => {
          if (servicePrices[service] && Number(servicePrices[service]) > 0) {
            prices.push({
              size: service,
              price: Number(servicePrices[service]),
            });
          }
        });

        await api.put(`/printers/${editingPrinterId}`, {
          branchName: selectedBranch,
          printerId: printerIdUpper,
          location: location.toUpperCase(),
          printerName: printerName.toUpperCase(),
          printerType,
          prices,
          customServices: customServices,
          updatedDate: new Date(),
        });

        // Fetch existing JumboXerox docs for this printer
        let existingJumboDocs = [];
        try {
          const jumboRes = await api.get("/jumbo-xerox/machines", {
            params: { printerId: printerIdUpper },
          });
          existingJumboDocs = jumboRes.data?.data || jumboRes.data || [];
        } catch (jErr) {
          console.error("Error fetching jumbo machines for printer update:", jErr);
        }

        if (printerType === "LFP") {
          // Build desired records map: key = type + "_" + size
          const desiredRecordsMap = new Map();

          const activeJumboTypes = Array.from(
            new Set([
              ...jumboXeroxServices,
              ...defaultJumboServices,
              ...customJumboServices,
              ...Object.keys(jumboServicePrices)
                .filter((k) => Number(jumboServicePrices[k]) > 0)
                .map((k) => {
                  const uIdx = k.indexOf("_");
                  return uIdx !== -1 ? k.substring(0, uIdx) : k;
                }),
            ])
          );

          activeJumboTypes.forEach((type) => {
            const typeSizes = Array.from(
              new Set([
                ...(jumboServiceSizes[type] || []),
                ...paperSizes,
                ...Object.keys(jumboServicePrices)
                  .filter(
                    (k) =>
                      k.startsWith(`${type}_`) &&
                      Number(jumboServicePrices[k]) > 0
                  )
                  .map((k) => k.slice(type.length + 1)),
              ])
            );

            typeSizes.forEach((size) => {
              const priceKey = `${type}_${size}`;
              const priceVal = jumboServicePrices[priceKey];
              if (priceVal && Number(priceVal) > 0) {
                desiredRecordsMap.set(priceKey, {
                  branch: selectedBranch,
                  printerId: printerIdUpper,
                  printerName: printerName.toUpperCase(),
                  type: type,
                  size: size,
                  unitPrice: Number(priceVal),
                  isActive: true,
                  updatedDate: new Date(),
                });
              }
            });
          });

          const groupedExistingDocs = new Map();
          existingJumboDocs.forEach((docSnap) => {
            const key = `${docSnap.type}_${docSnap.size}`;
            if (!groupedExistingDocs.has(key)) {
              groupedExistingDocs.set(key, []);
            }
            groupedExistingDocs.get(key).push(docSnap);
          });

          const syncPromises = [];
          const representativeDocsByKey = new Map();

          for (const [key, docList] of groupedExistingDocs.entries()) {
            const activeIndex = docList.findIndex((item) => item.isActive === true);
            const chosenIndex = activeIndex !== -1 ? activeIndex : 0;
            const chosenItem = docList[chosenIndex];

            representativeDocsByKey.set(key, chosenItem);

            docList.forEach((item, idx) => {
              if (idx !== chosenIndex && item.isActive !== false) {
                syncPromises.push(
                  api.put(`/jumbo-xerox/machines/${item.id || item._id}`, {
                    isActive: false,
                    updatedDate: new Date(),
                  })
                );
              }
            });
          }

          for (const [key, desiredData] of desiredRecordsMap.entries()) {
            if (representativeDocsByKey.has(key)) {
              const docSnap = representativeDocsByKey.get(key);
              syncPromises.push(
                api.put(`/jumbo-xerox/machines/${docSnap.id || docSnap._id}`, {
                  ...desiredData,
                  branch: selectedBranch,
                  printerId: printerIdUpper,
                  printerName: printerName.toUpperCase(),
                  isActive: true,
                  updatedDate: new Date(),
                })
              );
            } else {
              syncPromises.push(
                api.post("/jumbo-xerox/machines", {
                  ...desiredData,
                  createdAt: new Date(),
                  updatedDate: new Date(),
                  isActive: true,
                })
              );
            }
          }

          for (const [key, data] of representativeDocsByKey.entries()) {
            if (!desiredRecordsMap.has(key)) {
              if (data.isActive !== false) {
                syncPromises.push(
                  api.put(`/jumbo-xerox/machines/${data.id || data._id}`, {
                    isActive: false,
                    updatedDate: new Date(),
                  })
                );
              }
            }
          }

          if (syncPromises.length > 0) {
            await Promise.all(syncPromises);
          }
        } else {
          const deactivatePromises = existingJumboDocs
            .filter((d) => d.isActive !== false)
            .map((d) =>
              api.put(`/jumbo-xerox/machines/${d.id || d._id}`, {
                isActive: false,
                updatedDate: new Date(),
              })
            );
          if (deactivatePromises.length > 0) {
            await Promise.all(deactivatePromises);
          }
        }

        showSuccess("Printer updated successfully");
        setIsLoading(false);
        setTimeout(() => {
          navigate("/printer-list");
        }, 600);
        return;
      }

      // 2. If creating a new printer
      if (printerType === "LFP" && hasActiveLFP) {
        showError(
          "Cannot add LFP printer. This branch already has an active LFP printer."
        );
        setIsLoading(false);
        return;
      }

      const printerIdUpper = printerId.trim().toUpperCase();

      const printerCheck = await checkPrinterIdExists(printerIdUpper);
      if (printerCheck.exists) {
        showError(
          `Printer ID "${printerIdUpper}" already exists in ${printerCheck.branchName} branch as "${printerCheck.printerName}"`
        );
        setIsLoading(false);
        return;
      }

      const prices = [];
      const servicesToSave = Array.from(
        new Set([
          ...sizes,
          ...Object.keys(servicePrices).filter(
            (s) => servicePrices[s] && Number(servicePrices[s]) > 0
          ),
        ])
      );
      servicesToSave.forEach((service) => {
        if (servicePrices[service] && Number(servicePrices[service]) > 0) {
          prices.push({ size: service, price: Number(servicePrices[service]) });
        }
      });

      await api.post("/printers", {
        userId,
        branchName: selectedBranch,
        printerId: printerIdUpper,
        location: location.toUpperCase(),
        printerName: printerName.toUpperCase(),
        printerType,
        prices,
        customServices: customServices,
        isActive: true,
      });

      if (printerType === "LFP") {
        const jumboPromises = [];
        const activeJumboTypes = Array.from(
          new Set([
            ...jumboXeroxServices,
            ...Object.keys(jumboServicePrices)
              .filter((k) => Number(jumboServicePrices[k]) > 0)
              .map((k) => k.split("_")[0]),
          ])
        );

        activeJumboTypes.forEach((type) => {
          const typeSizes = Array.from(
            new Set([
              ...(jumboServiceSizes[type] || []),
              ...Object.keys(jumboServicePrices)
                .filter(
                  (k) =>
                    k.startsWith(`${type}_`) &&
                    Number(jumboServicePrices[k]) > 0
                )
                .map((k) => k.slice(type.length + 1)),
            ])
          );

          typeSizes.forEach((size) => {
            const priceKey = `${type}_${size}`;
            if (
              jumboServicePrices[priceKey] &&
              Number(jumboServicePrices[priceKey]) > 0
            ) {
              jumboPromises.push(
                api.post("/jumbo-xerox/machines", {
                  branch: selectedBranch,
                  printerId: printerIdUpper,
                  printerName: printerName.toUpperCase(),
                  type: type,
                  size: size,
                  unitPrice: Number(jumboServicePrices[priceKey]),
                  createdAt: new Date(),
                  isActive: true,
                })
              );
            }
          });
        });

        if (jumboPromises.length > 0) {
          await Promise.all(jumboPromises);
        }
      }

      showSuccess("Printer added successfully");

      const currentUser = JSON.parse(localStorage.getItem("user"));
      try {
        await api.post("/general/inventory-movements", {
          type: "printer",
          action: "add",
          printerId: printerIdUpper,
          printerName: printerName.toUpperCase(),
          printerType,
          fromBranch: null,
          toBranch: selectedBranch,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          details: {
            prices: prices,
            customServices: customServices,
            location: location.toUpperCase(),

            ...(printerType === "LFP" && {
              jumboServices: Object.entries(jumboServicePrices)
                .filter(([, p]) => Number(p) > 0)
                .map(([key, p]) => {
                  const uIdx = key.indexOf("_");
                  return {
                    type: key.substring(0, uIdx),
                    size: key.substring(uIdx + 1),
                    unitPrice: Number(p),
                  };
                }),
            }),
          },
        });
      } catch (invErr) {
        console.warn("Could not record inventory movement:", invErr);
      }

      // Refresh printer list, LFP status and reset fields
      if (selectedBranch) {
        await fetchPrintersForBranch(selectedBranch);
      }
      checkActiveLFPForBranch(selectedBranch);
      handleReset();
    } catch (error) {
      showError("Failed to add printer: " + (error.response?.data?.message || error.message));
      console.error("Error adding printer: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const allServices = [...defaultServices, ...customServices];
  const allJumboServices = [...defaultJumboServices, ...customJumboServices];

  return (
    <div className="add-printer-page-container">
      {/* Toast Notification */}
      <Popup
        isOpen={popup.isOpen}
        content={popup.content}
        type={popup.type}
        title={popup.title}
        onClose={popup.onClose}
        autoClose={popup.autoClose}
        autoCloseDelay={popup.autoCloseDelay}
      />

      {/* Full Header Banner with green fading from left to right */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background: "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "12px 24px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
            }}
          >
            {editingPrinterId && (
              <button
                type="button"
                onClick={() => navigate("/printer-list")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#059669",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} /> Back to Printer List
              </button>
            )}
            <h1
              style={{
                margin: 0,
                fontSize: "26px",
                fontWeight: 700,
                color: "#111827",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {editingPrinterId ? "Printer" : "Add"}{" "}
              <span className="highlight" style={{ color: "#059669" }}>
                {editingPrinterId ? "Details" : "Printer"}
              </span>
            </h1>
            {editingPrinterId && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 10px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#2563eb",
                }}
              >
                <Eye size={13} /> View Mode
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            {editingPrinterId
              ? `Viewing complete hardware specifications and pricing details for ${printerName || printerId || "printer"} (${selectedBranch || "No Branch"}).`
              : "Configure a new printer device with pricing details, paper sizes, and branch assignment."}
          </p>
        </div>
      </div>

      {/* Active LFP Restriction Notice */}
      {hasActiveLFP && (
        <div className="printer-lfp-alert">
          <AlertTriangle
            size={22}
            color="#d97706"
            style={{ flexShrink: 0 }}
          />
          <div className="printer-lfp-alert-content">
            <h5>LFP Printer Limit Notice</h5>
            <p>
              <strong>{selectedBranch}</strong> already has an active{" "}
              <strong>Large Format Printer (LFP)</strong>. PrintZ policy
              restricts each store to one active LFP unit. You may register
              additional MFP or SFP machines.
            </p>
          </div>
        </div>
      )}

      {/* Main Add Printer Form Card */}
      <div className="add-printer-main-card">
        <form onSubmit={handleSubmit} className="add-printer-form-body">
          {/* Section 1: Basic Machine Info */}
          <div className="printer-section-card">
            {/* Header Row */}
            <div className="printer-services-header-row">
              <div className="printer-services-header-left">
                <div className="printer-services-tag-icon">
                  <Settings size={20} color="#059669" />
                </div>
                <div>
                  <h4 className="printer-services-title">
                    Machine Identification
                  </h4>
                </div>
              </div>
            </div>

            <div className="printer-grid-2">
              <div className="printer-form-field">
                <label>
                  Branch Store <span className="req">*</span>
                </label>
                <BranchSelect
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e)}
                  branches={branches}
                  placeholder="Select Branch"
                  required
                />
              </div>

              <div className="printer-form-field">
                <label>
                  Printer ID <span className="req">*</span>
                </label>
                <div
                  className={`printer-input-wrapper ${
                    editingPrinterId ? "" : "disabled"
                  }`}
                >
                  <span className="printer-input-prefix-icon">
                    <Tag size={16} />
                  </span>
                  <input
                    type="text"
                    value={printerId}
                    disabled={!editingPrinterId && isGeneratingPrinterId}
                    onChange={(e) => {
                      setUserEditedPrinterId(true);
                      setPrinterId(e.target.value.toUpperCase());
                    }}
                    className={`printer-field-input ${
                      editingPrinterId ? "" : "disabled"
                    }`}
                    style={{
                      fontWeight: "700",
                      letterSpacing: "0.02em",
                      color: "#0f172a",
                    }}
                    placeholder={
                      isGeneratingPrinterId
                        ? "Generating Printer ID..."
                        : "PS-AA-003"
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="printer-grid-2">
              <div className="printer-form-field">
                <label>
                  Printer Model / Name <span className="req">*</span>
                </label>
                <div className="printer-input-wrapper">
                  <span className="printer-input-prefix-icon">
                    <Printer size={16} />
                  </span>
                  <input
                    type="text"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value.toUpperCase())}
                    placeholder="e.g. CANON IR-2006"
                    className="printer-field-input"
                    required
                  />
                </div>
              </div>

              <div className="printer-form-field">
                <label>Floor / Desk Location</label>
                <div className="printer-input-wrapper">
                  <span className="printer-input-prefix-icon">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value.toUpperCase())}
                    placeholder="e.g. COUNTER 1"
                    className="printer-field-input"
                  />
                </div>
              </div>
            </div>

            {/* Printer Type Selection */}
            <div className="printer-form-field">
              <label>
                Printer Hardware Type <span className="req">*</span>
              </label>
              <div className="printer-type-cards">
                {/* MFP Card */}
                <button
                  type="button"
                  className={`printer-hw-card-btn ${
                    printerType === "MFP" ? "active-mfp" : ""
                  }`}
                  onClick={() => setPrinterType("MFP")}
                >
                  <div className="printer-hw-card-left">
                    <div className="printer-hw-icon-wrap mfp-icon-wrap">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9V2h12v7" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <path d="M6 14h12v8H6z" />
                      </svg>
                    </div>
                    <div className="printer-hw-info">
                      <span className="printer-hw-name">MFP</span>
                      <span className="printer-hw-desc">
                        Multi Function Printer
                      </span>
                    </div>
                  </div>
                  <div className="printer-hw-card-right">
                    {printerType === "MFP" ? (
                      <div className="printer-hw-check-badge">
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="printer-hw-radio-circle" />
                    )}
                  </div>
                </button>

                {/* SFP Card */}
                <button
                  type="button"
                  className={`printer-hw-card-btn ${
                    printerType === "SFP" ? "active-sfp" : ""
                  }`}
                  onClick={() => setPrinterType("SFP")}
                >
                  <div className="printer-hw-card-left">
                    <div className="printer-hw-icon-wrap sfp-icon-wrap">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9V2h12v7" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <path d="M6 14h12v8H6z" />
                      </svg>
                    </div>
                    <div className="printer-hw-info">
                      <span className="printer-hw-name">SFP</span>
                      <span className="printer-hw-desc">
                        Single Function Printer
                      </span>
                    </div>
                  </div>
                  <div className="printer-hw-card-right">
                    {printerType === "SFP" ? (
                      <div className="printer-hw-check-badge">
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="printer-hw-radio-circle" />
                    )}
                  </div>
                </button>

                {/* LFP Card */}
                <button
                  type="button"
                  disabled={hasActiveLFP}
                  className={`printer-hw-card-btn ${
                    printerType === "LFP" ? "active-lfp" : ""
                  }`}
                  onClick={() => !hasActiveLFP && setPrinterType("LFP")}
                >
                  <div className="printer-hw-card-left">
                    <div className="printer-hw-icon-wrap lfp-icon-wrap">
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="4" width="20" height="7" rx="2" />
                        <line x1="6" y1="8" x2="18" y2="8" />
                        <line x1="5" y1="11" x2="5" y2="20" />
                        <line x1="19" y1="11" x2="19" y2="20" />
                        <line x1="3" y1="20" x2="7" y2="20" />
                        <line x1="17" y1="20" x2="21" y2="20" />
                        <line x1="5" y1="16" x2="19" y2="16" />
                      </svg>
                    </div>
                    <div className="printer-hw-info">
                      <span className="printer-hw-name">LFP</span>
                      <span className="printer-hw-desc">
                        {hasActiveLFP
                          ? "Limit Reached in Store"
                          : "Large Format Printer"}
                      </span>
                    </div>
                  </div>
                  <div className="printer-hw-card-right">
                    {printerType === "LFP" ? (
                      <div className="printer-hw-check-badge">
                        <Check size={13} color="#ffffff" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="printer-hw-radio-circle" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Services for MFP or SFP */}
          {(printerType === "MFP" || printerType === "SFP") && (
            <div
              className="printer-fieldset printer-services-section"
              style={{ padding: "18px 22px", gap: "14px" }}
            >
              {/* Header Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "10px",
                  borderBottom: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#eaf7ee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#059669",
                    }}
                  >
                    <Tag size={15} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      Available Services & Rates
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddService((prev) => !prev)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 11px",
                    borderRadius: "7px",
                    border: "1px solid #059669",
                    background: "#ffffff",
                    color: "#059669",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Add Custom Service</span>
                </button>
              </div>

              {/* Add Custom Service Inline Bar */}
              {showAddService && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    margin: "12px 0",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      padding: "0 14px",
                      height: "40px",
                      boxSizing: "border-box",
                    }}
                  >
                    <Tag size={16} color="#059669" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      value={newServiceName}
                      onChange={(e) =>
                        setNewServiceName(e.target.value.toUpperCase())
                      }
                      placeholder="ENTER NEW SERVICE NAME"
                      autoFocus
                      style={{
                        flex: 1,
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        color: "#334155",
                        letterSpacing: "0.02em",
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddCustomService()
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomService}
                    style={{
                      height: "40px",
                      padding: "0 22px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#059669",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddService(false);
                      setNewServiceName("");
                    }}
                    style={{
                      height: "40px",
                      padding: "0 18px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Service Tab Cards Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                  gap: "8px",
                }}
              >
                {allServices.map((service) => {
                  const isLive = activeService === service;
                  const hasPrice =
                    Boolean(servicePrices[service]) &&
                    Number(servicePrices[service]) > 0;
                  const isConfirmed = Boolean(confirmedServices[service]) && hasPrice;
                  const isCustom = customServices.includes(service);

                  return (
                    <div
                      key={service}
                      onClick={() => setActiveService(service)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: isLive ? "1.5px solid #059669" : "1px solid #e2e8f0",
                        background: isLive ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", color: isLive ? "#059669" : "#64748b" }}>
                          {getServiceIcon(service, 15, isLive)}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: isLive ? 700 : 600,
                            color: isLive ? "#047857" : "#334155",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {formatServiceName(service)}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        {hasPrice && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#059669",
                              background: "#ecfdf5",
                              border: "1px solid #a7f3d0",
                              padding: "1px 5px",
                              borderRadius: "5px",
                            }}
                          >
                            ₹{servicePrices[service]}
                          </span>
                        )}

                        {isConfirmed ? (
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              background: "#10b981",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                            }}
                            title="Rate Confirmed"
                          >
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <ChevronRight
                            size={13}
                            style={{ color: isLive ? "#059669" : "#94a3b8" }}
                          />
                        )}

                        {isCustom && (
                          <button
                            type="button"
                            title="Delete custom service"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomService(service);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "1px",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Active Service Panel (No watermark photo) */}
              {activeService && (
                <div
                  style={{
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    background: "#f0fdf4",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        background: "#d1fae5",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {getServiceIcon(activeService, 15, true)}
                    </div>
                    <div>
                      <h5 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        Price for {formatServiceName(activeService)}
                      </h5>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "170px",
                        height: "34px",
                        background: "#ffffff",
                        border: "1.5px solid #34d399",
                        borderRadius: "7px",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          width: "32px",
                          height: "100%",
                          background: "#ecfdf5",
                          borderRight: "1px solid #d1fae5",
                          color: "#059669",
                          fontWeight: 700,
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={servicePrices[activeService] || ""}
                        onChange={(e) =>
                          handlePriceChange(activeService, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleConfirmService(activeService);
                          }
                        }}
                        style={{
                          border: "none",
                          outline: "none",
                          padding: "0 8px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#0f172a",
                          width: "100%",
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConfirmService(activeService)}
                      disabled={
                        !servicePrices[activeService] ||
                        Number(servicePrices[activeService]) <= 0
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "7px 13px",
                        borderRadius: "7px",
                        border: "none",
                        background:
                          confirmedServices[activeService] &&
                          Number(servicePrices[activeService]) > 0
                            ? "#059669"
                            : "#0f172a",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor:
                          !servicePrices[activeService] ||
                          Number(servicePrices[activeService]) <= 0
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          !servicePrices[activeService] ||
                          Number(servicePrices[activeService]) <= 0
                            ? 0.5
                            : 1,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {confirmedServices[activeService] &&
                      Number(servicePrices[activeService]) > 0 ? (
                        <>
                          <Check size={13} strokeWidth={2.5} />
                          <span>Confirmed</span>
                        </>
                      ) : (
                        <span>Confirm Rate</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Configured Rates Summary Banner */}
              {Object.keys(servicePrices).filter(
                (s) => servicePrices[s] && Number(servicePrices[s]) > 0
              ).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "7px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#64748b" }}>
                    Configured:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {Object.keys(servicePrices)
                      .filter(
                        (s) => servicePrices[s] && Number(servicePrices[s]) > 0
                      )
                      .map((s) => (
                        <div
                          key={s}
                          onClick={() => setActiveService(s)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 7px",
                            borderRadius: "5px",
                            border: activeService === s ? "1px solid #059669" : "1px solid #e2e8f0",
                            background: activeService === s ? "#ecfdf5" : "#ffffff",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                          title="Click to view/edit rate"
                        >
                          <span style={{ color: "#334155", fontWeight: 500 }}>
                            {formatServiceName(s)}:
                          </span>
                          <span style={{ color: "#059669", fontWeight: 700 }}>
                            ₹{servicePrices[s]}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: JumboXerox Services for LFP */}
          {printerType === "LFP" && !hasActiveLFP && (
            <div
              className="printer-fieldset jumbo-section-container"
              style={{ padding: "18px 22px", gap: "14px" }}
            >
              {/* Header Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "10px",
                  borderBottom: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#fef3c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#b45309",
                    }}
                  >
                    <Tag size={15} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                      JumboXerox Services & Rates
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddJumboService((prev) => !prev)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 11px",
                    borderRadius: "7px",
                    border: "1px solid #059669",
                    background: "#ffffff",
                    color: "#059669",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Add Custom Jumbo Service</span>
                </button>
              </div>

              {/* Add Custom Jumbo Service Inline Input */}
              {showAddJumboService && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    margin: "12px 0",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "#ffffff",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      padding: "0 14px",
                      height: "40px",
                      boxSizing: "border-box",
                    }}
                  >
                    <Tag size={16} color="#059669" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      value={newJumboServiceName}
                      onChange={(e) =>
                        setNewJumboServiceName(e.target.value.toUpperCase())
                      }
                      placeholder="ENTER CUSTOM JUMBO SERVICE NAME"
                      autoFocus
                      style={{
                        flex: 1,
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: "12.5px",
                        fontWeight: 500,
                        color: "#334155",
                        letterSpacing: "0.02em",
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddCustomJumboService()
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomJumboService}
                    style={{
                      height: "40px",
                      padding: "0 22px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#059669",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddJumboService(false);
                      setNewJumboServiceName("");
                    }}
                    style={{
                      height: "40px",
                      padding: "0 18px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Jumbo Service Tabs Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                  gap: "8px",
                }}
              >
                {allJumboServices.map((jumbo) => {
                  const isLive = activeJumboService === jumbo;
                  const hasAnyPrice = paperSizes.some(
                    (sz) => Number(jumboServicePrices[`${jumbo}_${sz}`]) > 0
                  );
                  const isCustom = customJumboServices.includes(jumbo);

                  return (
                    <div
                      key={jumbo}
                      onClick={() => setActiveJumboService(jumbo)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: isLive ? "1.5px solid #059669" : "1px solid #e2e8f0",
                        background: isLive ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", color: isLive ? "#059669" : "#64748b" }}>
                          {getJumboServiceIcon(jumbo, 15, isLive)}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: isLive ? 700 : 600,
                            color: isLive ? "#047857" : "#334155",
                          }}
                        >
                          {jumbo}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        {hasAnyPrice && (
                          <div
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              background: "#10b981",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                            }}
                            title="Rates Configured"
                          >
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}

                        {isCustom && (
                          <button
                            type="button"
                            title="Delete custom jumbo service"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomJumboService(jumbo);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "1px",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inner Card: Paper Sizes Selection & Rate Setting */}
              {activeJumboService && (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    background: "#ffffff",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Paper Sizes Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={14} color="#059669" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                      Select Paper Size for {activeJumboService}:
                    </span>
                  </div>

                  {/* Paper Sizes Row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {paperSizes.map((sz) => {
                      const isActiveSize = activeJumboPaperSize === sz;
                      const priceKey = `${activeJumboService}_${sz}`;
                      const hasPrice = Number(jumboServicePrices[priceKey]) > 0;

                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => setActiveJumboPaperSize(sz)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            border: isActiveSize
                              ? "1.5px solid #059669"
                              : hasPrice
                              ? "1px solid #a7f3d0"
                              : "1px solid #e2e8f0",
                            background: isActiveSize
                              ? "#ecfdf5"
                              : hasPrice
                              ? "#f0fdf4"
                              : "#f8fafc",
                            color: isActiveSize || hasPrice ? "#047857" : "#334155",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <span>{sz}</span>
                          {hasPrice && (
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#059669",
                                marginLeft: "2px",
                              }}
                            >
                              ₹{jumboServicePrices[priceKey]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rate Input Panel for selected paper size (compact, no watermark) */}
                  {activeJumboPaperSize && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "#f0fdf4",
                        border: "1px solid #a7f3d0",
                        borderRadius: "8px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>
                          {activeJumboService} ({activeJumboPaperSize}) Rate:
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "170px",
                          height: "32px",
                          background: "#ffffff",
                          border: "1.5px solid #34d399",
                          borderRadius: "6px",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            width: "30px",
                            height: "100%",
                            background: "#ecfdf5",
                            borderRight: "1px solid #d1fae5",
                            color: "#059669",
                            fontWeight: 700,
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={
                            jumboServicePrices[
                              `${activeJumboService}_${activeJumboPaperSize}`
                            ] || ""
                          }
                          onChange={(e) =>
                            handleJumboPriceChange(
                              activeJumboService,
                              activeJumboPaperSize,
                              e.target.value
                            )
                          }
                          style={{
                            border: "none",
                            outline: "none",
                            padding: "0 8px",
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: "#0f172a",
                            width: "100%",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Summary of all configured sizes for active jumbo service */}
                  {paperSizes.filter(
                    (sz) =>
                      Number(
                        jumboServicePrices[`${activeJumboService}_${sz}`]
                      ) > 0
                  ).length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 10px",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "7px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "11.5px", fontWeight: 600, color: "#92400e" }}>
                        {activeJumboService} Configured:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {paperSizes
                          .filter(
                            (sz) =>
                              Number(
                                jumboServicePrices[
                                  `${activeJumboService}_${sz}`
                                ]
                              ) > 0
                          )
                          .map((sz) => (
                            <div
                              key={sz}
                              onClick={() => setActiveJumboPaperSize(sz)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                border:
                                  activeJumboPaperSize === sz
                                    ? "1px solid #b45309"
                                    : "1px solid #fcd34d",
                                background:
                                  activeJumboPaperSize === sz ? "#fef3c7" : "#ffffff",
                                fontSize: "11px",
                                cursor: "pointer",
                              }}
                              title="Click to edit rate"
                            >
                              <span style={{ color: "#78350f", fontWeight: 600 }}>{sz}:</span>
                              <span style={{ color: "#b45309", fontWeight: 700 }}>
                                ₹{jumboServicePrices[`${activeJumboService}_${sz}`]}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="add-printer-actions-bar">
            {editingPrinterId && (
              <button
                type="button"
                onClick={() => navigate("/printer-list")}
                className="printz-btn-secondary"
                disabled={isLoading}
              >
                <ArrowLeft size={15} />
                <span>Back to Printer List</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="printz-btn-secondary"
              disabled={isLoading}
            >
              <RotateCcw size={15} />
              <span>{editingPrinterId ? "Reset Changes" : "Reset Form"}</span>
            </button>
            <button
              type="submit"
              className="printz-btn-primary"
              disabled={isLoading || isGeneratingPrinterId}
              style={{ minWidth: "150px" }}
            >
              {isLoading ? (
                <span>
                  {editingPrinterId
                    ? "Updating Printer..."
                    : "Adding Printer..."}
                </span>
              ) : (
                <>
                  <Check size={16} />
                  <span>
                    {editingPrinterId ? "Save Changes" : "Add Printer"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {selectedBranch && (() => {
          const filteredPrintersInBranch = printersInBranch.filter((printer) => {
            if (!printerSearchTerm.trim()) return true;
            const term = printerSearchTerm.trim().toLowerCase();
            const pid = String(printer.printerId || "").toLowerCase();
            const pname = String(printer.printerName || "").toLowerCase();
            const ptype = String(printer.printerType || "").toLowerCase();
            const ploc = String(printer.location || "").toLowerCase();
            const pservices = (printer.prices || []).map((p) => `${p.size} ${p.price}`).join(" ").toLowerCase();
            const pjumbo = (printer.jumboServices || []).map((j) => `${j.type} ${j.size} ${j.unitPrice}`).join(" ").toLowerCase();
            return (
              pid.includes(term) ||
              pname.includes(term) ||
              ptype.includes(term) ||
              ploc.includes(term) ||
              pservices.includes(term) ||
              pjumbo.includes(term)
            );
          });

          const totalPages = Math.ceil(filteredPrintersInBranch.length / printersPerPage) || 1;
          const safePage = Math.min(Math.max(1, tableCurrentPage), totalPages);
          const startIndex = (safePage - 1) * printersPerPage;
          const paginatedPrinters = filteredPrintersInBranch.slice(
            startIndex,
            startIndex + printersPerPage
          );

          return (
            <div
              className="printer-section-card"
              style={{
                marginTop: "20px",
                padding: 0,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
                background: "#ffffff",
              }}
            >
              {/* Clean Card Header with Search and Larger Title */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 24px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#ffffff",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "#eaf7ee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#059669",
                      flexShrink: 0,
                    }}
                  >
                    <Printer size={22} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18.5px",
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Printers in {selectedBranch}
                    </h3>
                  </div>
                </div>

                {/* Right Area: Search input & Active Count */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      height: "36px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "0 10px",
                      gap: "8px",
                      width: "230px",
                    }}
                  >
                    <Search size={15} color="#94a3b8" />
                    <input
                      type="text"
                      value={printerSearchTerm}
                      onChange={(e) => {
                        setPrinterSearchTerm(e.target.value);
                        setTableCurrentPage(1);
                      }}
                      placeholder="Search printers..."
                      style={{
                        border: "none",
                        background: "transparent",
                        outline: "none",
                        fontSize: "12.5px",
                        color: "#0f172a",
                        width: "100%",
                      }}
                    />
                    {printerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setPrinterSearchTerm("");
                          setTableCurrentPage(1);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#94a3b8",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {printersInBranch.length > 0 && (
                    <div
                      style={{
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#047857",
                        padding: "5px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "#10b981",
                          display: "inline-block",
                        }}
                      ></span>
                      <span>{printersInBranch.length} Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table Content */}
              <div style={{ padding: "0" }}>
                {loadingPrinters ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <div className="stock-loading-spinner"></div>
                    <p style={{ margin: 0, fontSize: "13.5px", color: "#64748b", fontWeight: 500 }}>
                      Loading printers for {selectedBranch}...
                    </p>
                  </div>
                ) : printersInBranch.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    <Printer size={32} color="#cbd5e1" style={{ marginBottom: "8px" }} />
                    <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 500 }}>
                      No printers found for {selectedBranch}.
                    </p>
                  </div>
                ) : filteredPrintersInBranch.length === 0 ? (
                  <div
                    style={{
                      padding: "36px 20px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    <Search size={28} color="#cbd5e1" style={{ marginBottom: "8px" }} />
                    <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 500 }}>
                      No printers matching &ldquo;{printerSearchTerm}&rdquo; found.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", width: "100%" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                        textAlign: "left",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#eaf7ee",
                            borderBottom: "1px solid #d1fae5",
                          }}
                        >
                          <th
                            style={{
                              width: "55px",
                              textAlign: "center",
                              padding: "12px 14px",
                              color: "#047857",
                              fontWeight: 700,
                              fontSize: "11.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            S.No
                          </th>
                          <th
                            style={{
                              padding: "12px 16px",
                              color: "#047857",
                              fontWeight: 700,
                              fontSize: "11.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              minWidth: "110px",
                            }}
                          >
                            Printer ID
                          </th>
                          <th
                            style={{
                              padding: "12px 16px",
                              color: "#047857",
                              fontWeight: 700,
                              fontSize: "11.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              minWidth: "150px",
                            }}
                          >
                            Printer Name
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              color: "#047857",
                              fontWeight: 700,
                              fontSize: "11.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              width: "80px",
                              textAlign: "center",
                            }}
                          >
                            Type
                          </th>
                          <th
                            style={{
                              padding: "12px 14px",
                              color: "#047857",
                              fontWeight: 700,
                              fontSize: "11.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              width: "90px",
                              textAlign: "center",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              padding: "12px 16px",
                              color: "#047857",
                              fontWeight: 700,
                              fontSize: "11.5px",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Services & Pricing
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedPrinters.map((printer, index) => {
                          const isLfp = printer.printerType === "LFP";
                          const hasPrices = Array.isArray(printer.prices) && printer.prices.length > 0;
                          const hasJumbo = Array.isArray(printer.jumboServices) && printer.jumboServices.length > 0;

                          return (
                            <tr
                              key={printer.id}
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                transition: "background-color 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                              <td
                                style={{
                                  textAlign: "center",
                                  padding: "12px 14px",
                                  color: "#64748b",
                                  fontWeight: 600,
                                  fontSize: "12.5px",
                                  verticalAlign: "middle",
                                }}
                              >
                                {startIndex + index + 1}
                              </td>
                              <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                                <span
                                  style={{
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    background: "#f1f5f9",
                                    border: "1px solid #e2e8f0",
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    display: "inline-block",
                                    letterSpacing: "-0.01em",
                                  }}
                                >
                                  {printer.printerId || "-"}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  color: "#0f172a",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  verticalAlign: "middle",
                                }}
                              >
                                {printer.printerName || "-"}
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 10px",
                                    borderRadius: "20px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    letterSpacing: "0.03em",
                                    background: isLfp ? "#fef3c7" : "#eff6ff",
                                    color: isLfp ? "#92400e" : "#1d4ed8",
                                    border: isLfp ? "1px solid #fde68a" : "1px solid #bfdbfe",
                                  }}
                                >
                                  {printer.printerType || "-"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "3px 10px",
                                    borderRadius: "20px",
                                    fontSize: "11.5px",
                                    fontWeight: 600,
                                    background: printer.isActive ? "#ecfdf5" : "#fef2f2",
                                    color: printer.isActive ? "#047857" : "#dc2626",
                                    border: printer.isActive ? "1px solid #a7f3d0" : "1px solid #fecaca",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      background: printer.isActive ? "#10b981" : "#ef4444",
                                      display: "inline-block",
                                    }}
                                  ></span>
                                  {printer.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                    alignItems: "center",
                                  }}
                                >
                                  {hasPrices &&
                                    printer.prices.map((p, pIdx) => (
                                      <span
                                        key={pIdx}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          background: "#f8fafc",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "6px",
                                          padding: "3px 8px",
                                          fontSize: "11.5px",
                                          color: "#334155",
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                        }}
                                      >
                                        <span style={{ color: "#475569", fontWeight: 500 }}>{p.size}:</span>
                                        <span style={{ color: "#059669", fontWeight: 700 }}>₹{p.price}</span>
                                      </span>
                                    ))}

                                  {isLfp && hasJumbo &&
                                    printer.jumboServices.map((jumbo, jIdx) => (
                                      <span
                                        key={`jumbo-${jIdx}`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          background: "#fffbeb",
                                          border: "1px solid #fde68a",
                                          borderRadius: "6px",
                                          padding: "3px 8px",
                                          fontSize: "11.5px",
                                          color: "#78350f",
                                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                        }}
                                      >
                                        <span style={{ color: "#92400e", fontWeight: 600 }}>
                                          {jumbo.type} ({jumbo.size}):
                                        </span>
                                        <span style={{ color: "#b45309", fontWeight: 700 }}>₹{jumbo.unitPrice}</span>
                                      </span>
                                    ))}

                                  {!hasPrices && (!isLfp || !hasJumbo) && (
                                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>-</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Standard Pagination Controls Footer */}
              <Pagination
                currentPage={safePage}
                totalItems={filteredPrintersInBranch.length}
                itemsPerPage={printersPerPage}
                onPageChange={setTableCurrentPage}
                onItemsPerPageChange={(limit) => {
                  setPrintersPerPage(limit);
                  setTableCurrentPage(1);
                }}
                pageSizeOptions={[3, 5, 10, 20]}
                itemLabel="printers"
              />
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default AddPrinterManager;
