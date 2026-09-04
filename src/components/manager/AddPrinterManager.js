import { useState, useEffect, useCallback } from "react";
import { db } from "../../services/authservice";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { FaTimes, FaPlus } from "react-icons/fa";
import "../../styles/stocklist.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

const AddPrinterManager = () => {
  const [printerId, setPrinterId] = useState("");
  const [location, setLocation] = useState("");
  const [printerType, setPrinterType] = useState("small");
  const [printerName, setPrinterName] = useState("");
  const [sizes, setSizes] = useState([]);
  const [customServices, setCustomServices] = useState([]);
  const [newServiceName, setNewServiceName] = useState("");
  const [showAddService, setShowAddService] = useState(false);
  const [servicePrices, setServicePrices] = useState({});
  const [userId] = useState("");
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [printersInBranch, setPrintersInBranch] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [jumboXeroxServices, setJumboXeroxServices] = useState([]);
  const [customJumboServices, setCustomJumboServices] = useState([]);
  const [newJumboServiceName, setNewJumboServiceName] = useState("");
  const [showAddJumboService, setShowAddJumboService] = useState(false);
  const [jumboServicePrices, setJumboServicePrices] = useState({});
  const [jumboServiceSizes, setJumboServiceSizes] = useState({});
  const [hasActiveLFP, setHasActiveLFP] = useState(false);
  const [isGeneratingPrinterId, setIsGeneratingPrinterId] = useState(false);
  const [userEditedPrinterId, setUserEditedPrinterId] = useState(false);
  const { popup, showSuccess, showError } = usePopup();

  const defaultServices = [
    "TOTAL LARGE",
    "TOTAL SMALL",
    "B/W SCAN",
    "COLOUR SCAN",
    "LONG SHEET",
  ];

  const defaultJumboServices = ["COLOUR", "PHOTO PRINT", "SCAN", "B&W"];

  const paperSizes = ["A0", "A1", "A2", "A3", "A4"];

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branches"));
        const branchData = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: (docSnap.data().name || "").toString(),
          address: docSnap.data().address || "",
          code: (docSnap.data().code || "").toString(),
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
          // If no letters, assign any unused AA..ZZ
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
          // Prefer second letter from name in order: ensures "T BRANCH" -> TB
          for (let k = 1; k < letters.length; k++) {
            const cc = first + letters[k];
            if (!used.has(cc)) return cc;
          }
          // Try any ordered pair within the name
          for (let i = 0; i < letters.length; i++) {
            for (let j = i + 1; j < letters.length; j++) {
              const cc = letters[i] + letters[j];
              if (!used.has(cc)) return cc;
            }
          }
          // Fallback: first letter + any alphabet letter
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
                updateDoc(doc(db, "branches", br.id), { code: br.code })
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
          // Set default branch only if not already chosen
          setSelectedBranch((prev) => prev || defaultBranch);
        }
      } catch (error) {
        console.error("Failed to fetch branch names: ", error);
      }
    };
    fetchBranches();
  }, []);

  const handleBranchChange = (event) => {
    const selectedBranchName = event.target.value;
    setSelectedBranch(selectedBranchName);
    // Reset printer ID generation state on branch change so a fresh ID is generated
    setUserEditedPrinterId(false);
    setPrinterId("");
    if (!selectedBranchName) {
      setPrintersInBranch([]);
      setHasActiveLFP(false);
    }
  };

  const fetchPrintersForBranch = useCallback(
    async (branchName) => {
      if (!branchName) return;

      setLoadingPrinters(true);
      try {
        const q = query(
          collection(db, "printers"),
          where("branchName", "==", branchName),
          where("isActive", "==", true)
        );
        const querySnapshot = await getDocs(q);
        const printersList = [];
        let foundActiveLFP = false;

        for (const doc of querySnapshot.docs) {
          const printerData = { id: doc.id, ...doc.data() };

          if (printerData.printerType === "LFP" && printerData.isActive) {
            foundActiveLFP = true;
          }

          if (printerData.printerType === "LFP") {
            const jumboQuery = query(
              collection(db, "JumboXerox"),
              where("printerId", "==", printerData.printerId),
              where("branch", "==", branchName),
              where("isActive", "==", true)
            );
            const jumboSnapshot = await getDocs(jumboQuery);
            printerData.jumboServices = jumboSnapshot.docs.map((jumboDoc) => ({
              id: jumboDoc.id,
              ...jumboDoc.data(),
            }));
          }

          printersList.push(printerData);
        }

        setHasActiveLFP(foundActiveLFP);
        printersList.sort(
          (a, b) =>
            a.printerId.localeCompare(b.printerId) && a.isActive !== false
        );
        setPrintersInBranch(printersList);
      } catch (error) {
        console.error("Error fetching printers: ", error);
        showError("Failed to load printers for this branch");
      } finally {
        setLoadingPrinters(false);
      }
    },
    [showError]
  );

  // Whenever selectedBranch changes (including first auto-select), load printers for that branch
  useEffect(() => {
    if (selectedBranch) {
      fetchPrintersForBranch(selectedBranch);
    }
  }, [selectedBranch, fetchPrintersForBranch]);

  // Removed getBranchCode: inlined logic in generateUniquePrinterIdForBranch

  // Generate next unique printer ID for the branch: PS-XX-###
  const generateUniquePrinterIdForBranch = useCallback(
    async (branchName) => {
      if (!branchName) throw new Error("Branch name required");

      // Use stored branch code when available, else derive from letters
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

      // Fetch all printers for this branch to determine the next sequence number (active + inactive)
      const branchPrintersSnap = await getDocs(
        query(collection(db, "printers"), where("branchName", "==", branchName))
      );
      const usedNumbers = new Set();
      branchPrintersSnap.docs.forEach((d) => {
        const pid = String(d.data()?.printerId || "").toUpperCase();
        const m = pid.match(new RegExp(`^PS-${code}-(\\d+)$`));
        if (m) {
          const num = parseInt(m[1], 10);
          if (!Number.isNaN(num)) usedNumbers.add(num);
        }
      });

      let next =
        usedNumbers.size > 0 ? Math.max(...Array.from(usedNumbers)) + 1 : 1;

      // Ensure global uniqueness: keep incrementing until no document matches this printerId
      for (let i = 0; i < 2000; i++) {
        const candidate = `${prefix}${String(next).padStart(3, "0")}`;
        const existsSnap = await getDocs(
          query(collection(db, "printers"), where("printerId", "==", candidate))
        );
        if (existsSnap.empty) return candidate;
        next++;
      }
      throw new Error(
        "Unable to generate a unique printer ID. Please try again."
      );
    },
    [branches]
  );

  const startAutoGeneratePrinterId = useCallback(async () => {
    if (!selectedBranch) return;
    if (userEditedPrinterId) return; // don't override if user started typing
    try {
      setIsGeneratingPrinterId(true);
      setPrinterId("GENERATING PRINTER ID...");
      const id = await generateUniquePrinterIdForBranch(selectedBranch);
      // avoid overwriting if user typed while generating
      if (!userEditedPrinterId) setPrinterId(id);
    } catch (err) {
      console.error(err);
      showError(err?.message || "Failed to generate printer ID");
      if (!userEditedPrinterId) setPrinterId("");
    } finally {
      setIsGeneratingPrinterId(false);
    }
  }, [
    selectedBranch,
    userEditedPrinterId,
    generateUniquePrinterIdForBranch,
    showError,
  ]);

  // Trigger auto-generation when the selected branch changes
  useEffect(() => {
    startAutoGeneratePrinterId();
  }, [startAutoGeneratePrinterId]);

  const checkPrinterIdExists = async (printerIdToCheck) => {
    try {
      const q = query(
        collection(db, "printers"),
        where("printerId", "==", printerIdToCheck.toUpperCase())
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingPrinter = querySnapshot.docs[0].data();
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

  const handleSizeChange = (e) => {
    const { value, checked } = e.target;
    setSizes((prevSizes) => {
      if (checked) {
        return [...prevSizes, value];
      } else {
        const updatedPrices = { ...servicePrices };
        delete updatedPrices[value];
        setServicePrices(updatedPrices);
        return prevSizes.filter((size) => size !== value);
      }
    });
  };

  const handleJumboSizeChange = (type, checked) => {
    setJumboXeroxServices((prevServices) => {
      if (checked) {
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

  const handleJumboTypeSizeChange = (type, size, checked) => {
    setJumboServiceSizes((prev) => {
      const typeKey = type;
      const currentSizes = prev[typeKey] || [];

      if (checked) {
        return {
          ...prev,
          [typeKey]: [...currentSizes, size],
        };
      } else {
        const priceKey = `${type}_${size}`;
        const updatedPrices = { ...jumboServicePrices };
        delete updatedPrices[priceKey];
        setJumboServicePrices(updatedPrices);

        return {
          ...prev,
          [typeKey]: currentSizes.filter((s) => s !== size),
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

  const handlePriceChange = (serviceName, price) => {
    setServicePrices((prev) => ({
      ...prev,
      [serviceName]: price,
    }));
  };

  const handleAddCustomService = () => {
    const serviceNameUpper = newServiceName.trim().toUpperCase();
    if (
      serviceNameUpper &&
      !customServices.map((s) => s.toUpperCase()).includes(serviceNameUpper) &&
      !defaultServices.map((s) => s.toUpperCase()).includes(serviceNameUpper)
    ) {
      setCustomServices((prev) => [...prev, serviceNameUpper]);
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
    const updatedPrices = { ...servicePrices };
    delete updatedPrices[serviceName];
    setServicePrices(updatedPrices);
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
    delete updatedPrices[serviceName];
    setJumboServicePrices(updatedPrices);
    showSuccess(`Custom jumbo service "${serviceName}" removed`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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
      sizes.forEach((service) => {
        if (servicePrices[service]) {
          prices.push({ size: service, price: Number(servicePrices[service]) });
        }
      });

      await addDoc(collection(db, "printers"), {
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

      if (printerType === "LFP" && jumboXeroxServices.length > 0) {
        const jumboPromises = [];

        jumboXeroxServices.forEach((type) => {
          const typeSizes = jumboServiceSizes[type] || [];
          typeSizes.forEach((size) => {
            const priceKey = `${type}_${size}`;
            if (jumboServicePrices[priceKey]) {
              jumboPromises.push(
                addDoc(collection(db, "JumboXerox"), {
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

        await Promise.all(jumboPromises);
      }

      showSuccess("Printer added successfully");

      const currentUser = JSON.parse(localStorage.getItem("user"));
      await addDoc(collection(db, "inventoryMovements"), {
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

          ...(printerType === "LFP" &&
            jumboXeroxServices.length > 0 && {
              jumboServices: jumboXeroxServices.flatMap((type) => {
                const typeSizes = jumboServiceSizes[type] || [];
                return typeSizes.map((size) => ({
                  type: type,
                  size: size,
                  unitPrice: Number(jumboServicePrices[`${type}_${size}`] || 0),
                }));
              }),
            }),
        },
      });

      if (selectedBranch) {
        fetchPrintersForBranch(selectedBranch);
      }

      handleReset();
    } catch (error) {
      showError("Failed to add printer: " + error.message);
      console.error("Error adding printer: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrinterId("");
    setLocation("");
    setPrinterName("");
    setPrinterType("small");
    setSizes([]);
    setCustomServices([]);
    setServicePrices({});
    setNewServiceName("");
    setShowAddService(false);
    setJumboXeroxServices([]);
    setCustomJumboServices([]);
    setJumboServicePrices({});
    setJumboServiceSizes({});
    setNewJumboServiceName("");
    setShowAddJumboService(false);
  };

  const allServices = [...defaultServices, ...customServices];
  const allJumboServices = [...defaultJumboServices, ...customJumboServices];

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Adding printer...</p>
      </div>
    );
  }

  return (
    <div className="stock-readings-container">
      <Popup
        isOpen={popup.isOpen}
        content={popup.content}
        type={popup.type}
        title={popup.title}
        onClose={popup.onClose}
        autoClose={popup.autoClose}
        autoCloseDelay={popup.autoCloseDelay}
      />
      <div className="stock-page-header">
        <h2>Add New Printer</h2>
        <p>Configure a new printer with pricing details</p>
      </div>

      {}
      {hasActiveLFP && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "8px",
            padding: "15px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              backgroundColor: "#f39c12",
              color: "white",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            !
          </div>
          <div>
            <strong style={{ color: "#856404" }}>
              LFP Printer Restriction:
            </strong>
            <p
              style={{
                margin: "5px 0 0 0",
                color: "#856404",
                fontSize: "14px",
              }}
            >
              This branch already has an active LFP printer. Only one LFP
              printer is allowed per branch. You can only add MFP or SFP
              printers to this branch.
            </p>
          </div>
        </div>
      )}

      <div className="stock-list">
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Printer Configuration</h3>
            </div>
          </div>

          <div className="stock-card-content">
            <form onSubmit={handleSubmit}>
              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label>Branch Name *</label>
                  <select
                    value={selectedBranch}
                    onChange={handleBranchChange}
                    className="stock-select-input"
                    required
                  >
                    <option value="" disabled>
                      Select Branch Name
                    </option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="stock-date-picker-wrapper">
                  <label>Printer ID *</label>
                  <input
                    type="text"
                    value={printerId}
                    // Disabled as this value is auto-generated
                    className="stock-select-input"
                    placeholder={
                      isGeneratingPrinterId
                        ? "Generating Printer ID..."
                        : "Auto-generated"
                    }
                    disabled
                    required
                  />
                </div>
              </div>

              <div className="stock-date-picker-container">
                <div className="stock-date-picker-wrapper">
                  <label>Printer Name *</label>
                  <input
                    type="text"
                    value={printerName}
                    onChange={(e) =>
                      setPrinterName(e.target.value.toUpperCase())
                    }
                    className="stock-select-input"
                    placeholder="Enter printer name"
                    required
                  />
                </div>

                <div className="stock-date-picker-wrapper">
                  <label>Printer Type *</label>
                  <select
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value)}
                    className="stock-select-input"
                    required
                  >
                    <option value="">Select printer type</option>
                    <option value="MFP">MFP - Multi Function Printer</option>
                    <option value="SFP">SFP - Single Function Printer</option>
                    <option value="LFP" disabled={hasActiveLFP}>
                      LFP - Large format Printer{" "}
                      {hasActiveLFP ? "(Already exists in branch)" : ""}
                    </option>
                  </select>
                </div>
              </div>

              {}
              {(printerType === "MFP" || printerType === "SFP") && (
                <div
                  className="stock-card"
                  style={{ marginTop: "25px", marginBottom: "25px" }}
                >
                  <div className="stock-card-header">
                    <div className="stock-card-title">
                      <h4>Available Services *</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddService(true)}
                      className="stock-save-button"
                      style={{
                        padding: "8px 15px",
                        fontSize: "13px",
                        minWidth: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FaPlus /> Add Custom Service
                    </button>
                  </div>

                  <div className="stock-card-content">
                    {showAddService && (
                      <div
                        className="stock-date-picker-container"
                        style={{ marginBottom: "25px" }}
                      >
                        <div className="stock-date-picker-wrapper">
                          <label>Custom Service Name</label>
                          <input
                            type="text"
                            value={newServiceName}
                            onChange={(e) =>
                              setNewServiceName(e.target.value.toUpperCase())
                            }
                            className="stock-select-input"
                            placeholder="Enter custom service name"
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddCustomService()
                            }
                          />
                        </div>
                        <div
                          className="stock-action-buttons"
                          style={{
                            marginTop: "0",
                            paddingTop: "0",
                            border: "none",
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleAddCustomService}
                            className="stock-save-button"
                            style={{ padding: "8px 15px", fontSize: "13px" }}
                          >
                            Add Service
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddService(false);
                              setNewServiceName("");
                            }}
                            className="stock-cancel-button"
                            style={{ padding: "8px 15px", fontSize: "13px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="stock-checkbox-container">
                      {allServices.map((service) => (
                        <div key={service} className="stock-checkbox-item">
                          <div className="checkbox-wrapper">
                            <input
                              type="checkbox"
                              id={service}
                              value={service}
                              onChange={handleSizeChange}
                              checked={sizes.includes(service)}
                              className="checkbox-input"
                            />
                            <label
                              htmlFor={service}
                              className="checkbox-label"
                              style={{ marginLeft: "10px" }}
                            >
                              {service}
                            </label>
                          </div>
                          {customServices.includes(service) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomService(service)}
                              className="remove-service-btn"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {}
              {(printerType === "MFP" || printerType === "SFP") &&
                sizes.length > 0 && (
                  <div
                    className="stock-card"
                    style={{ marginTop: "25px", marginBottom: "25px" }}
                  >
                    <div className="stock-card-header">
                      <div className="stock-card-title">
                        <h4>Service Pricing</h4>
                      </div>
                    </div>
                    <div className="stock-card-content">
                      <div className="stock-date-picker-container">
                        {sizes.map((service) => (
                          <div
                            key={service}
                            className="stock-date-picker-wrapper"
                          >
                            <label>{service} PRICE (₹)</label>
                            <input
                              type="number"
                              value={servicePrices[service] || ""}
                              onChange={(e) =>
                                handlePriceChange(service, e.target.value)
                              }
                              className="stock-select-input"
                              placeholder="Enter price"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {}
              {printerType === "LFP" && !hasActiveLFP && (
                <div
                  className="stock-card"
                  style={{ marginTop: "25px", marginBottom: "25px" }}
                >
                  <div className="stock-card-header">
                    <div className="stock-card-title">
                      <h4>JumboXerox Services *</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddJumboService(true)}
                      className="stock-save-button"
                      style={{
                        padding: "8px 15px",
                        fontSize: "13px",
                        minWidth: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FaPlus /> Add Custom Jumbo Service
                    </button>
                  </div>

                  <div className="stock-card-content">
                    {showAddJumboService && (
                      <div
                        className="stock-date-picker-container"
                        style={{ marginBottom: "25px" }}
                      >
                        <div className="stock-date-picker-wrapper">
                          <label>Custom Jumbo Service Name</label>
                          <input
                            type="text"
                            value={newJumboServiceName}
                            onChange={(e) =>
                              setNewJumboServiceName(
                                e.target.value.toUpperCase()
                              )
                            }
                            className="stock-select-input"
                            placeholder="Enter custom jumbo service name"
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddCustomJumboService()
                            }
                          />
                        </div>
                        <div
                          className="stock-action-buttons"
                          style={{
                            marginTop: "0",
                            paddingTop: "0",
                            border: "none",
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleAddCustomJumboService}
                            className="stock-save-button"
                            style={{ padding: "8px 15px", fontSize: "13px" }}
                          >
                            Add Jumbo Service
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddJumboService(false);
                              setNewJumboServiceName("");
                            }}
                            className="stock-cancel-button"
                            style={{ padding: "8px 15px", fontSize: "13px" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="stock-checkbox-container">
                      {allJumboServices.map((service) => (
                        <div key={service} className="stock-checkbox-item">
                          <div className="checkbox-wrapper">
                            <input
                              type="checkbox"
                              id={`jumbo-${service}`}
                              value={service}
                              onChange={(e) =>
                                handleJumboSizeChange(service, e.target.checked)
                              }
                              checked={jumboXeroxServices.includes(service)}
                              className="checkbox-input"
                            />
                            <label
                              htmlFor={`jumbo-${service}`}
                              className="checkbox-label"
                              style={{ marginLeft: "10px", fontWeight: "600" }}
                            >
                              {service}
                            </label>
                          </div>
                          {customJumboServices.includes(service) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveCustomJumboService(service)
                              }
                              className="remove-service-btn"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {}
                    {jumboXeroxServices.map((type) => (
                      <div
                        key={type}
                        style={{
                          marginTop: "20px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          padding: "15px",
                        }}
                      >
                        <h5
                          style={{
                            margin: "0 0 10px 0",
                            color: "#333",
                            fontSize: "14px",
                          }}
                        >
                          Select sizes for {type}:
                        </h5>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(80px, 1fr))",
                            gap: "8px",
                          }}
                        >
                          {paperSizes.map((size) => (
                            <div
                              key={`${type}_${size}`}
                              className="checkbox-wrapper"
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <input
                                type="checkbox"
                                id={`${type}_${size}`}
                                onChange={(e) =>
                                  handleJumboTypeSizeChange(
                                    type,
                                    size,
                                    e.target.checked
                                  )
                                }
                                checked={(
                                  jumboServiceSizes[type] || []
                                ).includes(size)}
                                className="checkbox-input"
                              />
                              <label
                                htmlFor={`${type}_${size}`}
                                className="checkbox-label"
                                style={{ marginLeft: "6px", fontSize: "12px" }}
                              >
                                {size}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              {printerType === "LFP" &&
                !hasActiveLFP &&
                Object.keys(jumboServiceSizes).some(
                  (type) => jumboServiceSizes[type]?.length > 0
                ) && (
                  <div
                    className="stock-card"
                    style={{ marginTop: "25px", marginBottom: "25px" }}
                  >
                    <div className="stock-card-header">
                      <div className="stock-card-title">
                        <h4>JumboXerox Service Pricing</h4>
                      </div>
                    </div>
                    <div className="stock-card-content">
                      {Object.entries(jumboServiceSizes).map(
                        ([type, sizes]) =>
                          sizes &&
                          sizes.length > 0 && (
                            <div key={type} style={{ marginBottom: "20px" }}>
                              <h5
                                style={{
                                  margin: "0 0 10px 0",
                                  color: "#333",
                                  fontSize: "14px",
                                  textTransform: "uppercase",
                                }}
                              >
                                {type} Pricing:
                              </h5>
                              <div className="stock-date-picker-container">
                                {sizes.map((size) => (
                                  <div
                                    key={`${type}_${size}`}
                                    className="stock-date-picker-wrapper"
                                  >
                                    <label>
                                      {type} - {size} PRICE (₹)
                                    </label>
                                    <input
                                      type="number"
                                      value={
                                        jumboServicePrices[`${type}_${size}`] ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleJumboPriceChange(
                                          type,
                                          size,
                                          e.target.value
                                        )
                                      }
                                      className="stock-select-input"
                                      placeholder={`Enter ${type} ${size} price`}
                                      min="0"
                                      step="0.01"
                                      required
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                      )}
                    </div>
                  </div>
                )}

              <div className="stock-action-buttons">
                <div>
                  <button
                    type="submit"
                    className="stock-save-button"
                    disabled={isLoading}
                  >
                    Add Printer
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="stock-cancel-button"
                  >
                    Reset Form
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {}
        {selectedBranch && (
          <div className="stock-card" style={{ marginTop: "25px" }}>
            <div className="stock-card-header">
              <div className="stock-card-title">
                <h3>Printers in {selectedBranch}</h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    margin: "5px 0 0 0",
                  }}
                >
                  {printersInBranch.length} printer
                  {printersInBranch.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            <div className="stock-card-content">
              {loadingPrinters ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <div
                    className="stock-loading-spinner"
                    style={{ margin: "0 auto 10px" }}
                  ></div>
                  <p>Loading printers...</p>
                </div>
              ) : printersInBranch.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                  }}
                >
                  <p>No printers found for this branch.</p>
                </div>
              ) : (
                <div className="stock-table-wrapper">
                  <table className="stock-readings-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "center" }}>S.No</th>
                        <th>Printer ID</th>
                        <th>Printer Name</th>
                        <th style={{ textAlign: "center" }}>Type</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th>Services & Pricing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printersInBranch.map((printer, index) => (
                        <tr key={printer.id}>
                          <td style={{ textAlign: "center" }}>{index + 1}</td>
                          <td>{printer.printerId || "Unknown ID"}</td>
                          <td>{printer.printerName || "Unknown Name"}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className="qty-badge"
                              style={{
                                backgroundColor:
                                  printer.printerType === "LFP"
                                    ? "#e3f2fd"
                                    : printer.printerType === "SFP"
                                    ? "#fff3e0"
                                    : "#f3e5f5",
                                color:
                                  printer.printerType === "LFP"
                                    ? "#1976d2"
                                    : printer.printerType === "SFP"
                                    ? "#f57c00"
                                    : "#7b1fa2",
                              }}
                            >
                              {printer.printerType || "Unknown"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className="qty-badge"
                              style={{
                                backgroundColor: printer.isActive
                                  ? "#e8f5e8"
                                  : "#ffeaa7",
                                color: printer.isActive ? "#2d5a27" : "#8b6914",
                              }}
                            >
                              {printer.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td>
                            {}
                            {printer.prices && printer.prices.length > 0 && (
                              <div style={{ marginBottom: "8px" }}>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "4px",
                                  }}
                                >
                                  {printer.prices.map(
                                    (service, serviceIndex) => (
                                      <span
                                        key={serviceIndex}
                                        className="qty-badge"
                                        style={{
                                          backgroundColor: "#fff",
                                          border: "1px solid #dee2e6",
                                          marginRight: "4px",
                                          marginBottom: "2px",
                                        }}
                                      >
                                        <span style={{ fontWeight: "500" }}>
                                          {service.size || "Unknown Service"}
                                        </span>
                                        <span
                                          style={{
                                            color: "#28a745",
                                            marginLeft: "4px",
                                          }}
                                        >
                                          ₹{service.price || 0}
                                        </span>
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {}
                            {printer.printerType === "LFP" &&
                              printer.jumboServices &&
                              printer.jumboServices.length > 0 && (
                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "4px",
                                    }}
                                  >
                                    {printer.jumboServices.map(
                                      (jumboService, jumboIndex) => (
                                        <span
                                          key={jumboIndex}
                                          className="qty-badge"
                                          style={{
                                            backgroundColor: "#e3f2fd",
                                            border: "1px solid #1976d2",
                                            marginRight: "4px",
                                            marginBottom: "2px",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontWeight: "500",
                                              color: "#1976d2",
                                            }}
                                          >
                                            {jumboService.type || "Unknown"} -{" "}
                                            {jumboService.size || "Unknown"}
                                          </span>
                                          <span
                                            style={{
                                              color: "#1565c0",
                                              marginLeft: "4px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            ₹{jumboService.unitPrice || 0}
                                          </span>
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {}
                            {(!printer.prices || printer.prices.length === 0) &&
                              (printer.printerType !== "LFP" ||
                                !printer.jumboServices ||
                                printer.jumboServices.length === 0) && (
                                <span
                                  style={{
                                    color: "#6c757d",
                                    fontStyle: "italic",
                                  }}
                                >
                                  No services configured
                                </span>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPrinterManager;
