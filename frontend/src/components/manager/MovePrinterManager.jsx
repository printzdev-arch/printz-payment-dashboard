import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../services/api";
import "../../styles/moveprinter.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup";
import Pagination from "../common/Pagination.jsx";
import BranchSelect from "../common/BranchSelect.jsx";
import {
  ArrowRight,
  ArrowLeftRight,
  Copy,
  RotateCcw,
  Printer,
  Building2,
  AlertTriangle,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  Tag,
} from "lucide-react";

const MovePrinterManager = () => {
  const { popup, showSuccess, showError } = usePopup();
  const [branchName, setBranchName] = useState("");
  const [selectedPrinters, setSelectedPrinters] = useState([]);
  const [userId, setUserId] = useState("");
  const [branches, setBranches] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [toLocation, setToLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [destinationHasLFP, setDestinationHasLFP] = useState(false);
  const [showPrinterIdPopup, setShowPrinterIdPopup] = useState(false);
  const [newPrinterId, setNewPrinterId] = useState("");
  const [currentCloningPrinter, setCurrentCloningPrinter] = useState(null);
  const [currentPrinterIndex, setCurrentPrinterIndex] = useState(0);
  const [totalPrintersToClone, setTotalPrintersToClone] = useState(0);
  const [printerIdError, setPrinterIdError] = useState("");
  const [isGeneratingPrinterId, setIsGeneratingPrinterId] = useState(false);
  // Track IDs reserved during a single clone session to avoid duplicates before they hit DB
  const reservedCloneIdsRef = useRef(new Set());

  // Compute a 2-letter branch code from branch name (fallback when no persisted code exists)
  const computeBranchCodeFromName = useCallback((name) => {
    const cleaned = (name || "").replace(/[^A-Za-z]/g, "").toUpperCase();
    if (cleaned.length >= 2) return cleaned.slice(0, 2);
    if (cleaned.length === 1) return cleaned + "X";
    return "XX";
  }, []);

  // Generate next unique printer ID for the destination branch: PS-XX-###
  const generateUniquePrinterIdForBranch = useCallback(
    async (branch) => {
      if (!branch) throw new Error("Destination branch required");

      // Prefer stored two-letter branch code when available
      const br = branches.find((b) => b.name === branch);
      let code = (br?.code || "").replace(/[^A-Za-z]/g, "").toUpperCase();
      if (code.length !== 2) {
        code = computeBranchCodeFromName(branch);
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
          const n = parseInt(m[1], 10);
          if (!Number.isNaN(n)) usedNumbers.add(n);
        }
      });

      let next = usedNumbers.size > 0 ? Math.max(...Array.from(usedNumbers)) + 1 : 1;

      for (let i = 0; i < 2000; i++) {
        const candidate = `${prefix}${String(next).padStart(3, "0")}`;
        if (!existingPrinterIds.has(candidate)) return candidate;
        next++;
      }
      return `${prefix}${String(next).padStart(3, "0")}`;
    },
    [branches, computeBranchCodeFromName]
  );

  const startAutoGenerateNewPrinterId = useCallback(async () => {
    if (!toLocation) return;
    try {
      setIsGeneratingPrinterId(true);
      setNewPrinterId("Generating Printer ID...");
      const initialId = await generateUniquePrinterIdForBranch(toLocation);

      const allPrintersRes = await api.get("/printers");
      const allPrinters = allPrintersRes.data?.data || allPrintersRes.data || [];
      const existingPrinterIds = new Set(
        allPrinters.map((p) => String(p.printerId || "").toUpperCase())
      );

      let candidate = initialId;
      for (let i = 0; i < 2000; i++) {
        if (!reservedCloneIdsRef.current.has(candidate) && !existingPrinterIds.has(candidate.toUpperCase())) {
          break;
        }

        const m = candidate.match(/^(PS-[A-Z]{2}-)(\d+)$/i);
        if (!m) break;
        const prefix = m[1];
        const num = parseInt(m[2], 10) + 1;
        candidate = `${prefix}${String(num).padStart(3, "0")}`;
      }

      setNewPrinterId(candidate);
      setPrinterIdError("");
    } catch (err) {
      console.error(err);
      setNewPrinterId("");
      setPrinterIdError(err?.message || "Failed to generate printer ID");
    } finally {
      setIsGeneratingPrinterId(false);
    }
  }, [toLocation, generateUniquePrinterIdForBranch]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get("/branches");
        const branchesList = res.data?.data || res.data || [];
        const branchesData = branchesList.map((userData) => ({
          name: userData.name,
          id: userData.id || userData._id,
          code: userData.code || "",
        }));

        const sortedBranches = branchesData.sort((a, b) => {
          const nameA = a.name.trim().toLowerCase();
          const nameB = b.name.trim().toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        setBranches(sortedBranches);
      } catch (error) {
        showError("Error fetching branches: " + error.message);
      }
    };

    fetchBranches();
  }, [showError]);

  useEffect(() => {
    const fetchPrinters = async () => {
      if (!branchName) {
        setPrinters([]);
        setSelectedPrinters([]);
        return;
      }

      try {
        const res = await api.get("/printers", {
          params: {
            branchName,
            isActive: true,
          },
        });
        const docs = res.data?.data || res.data || [];
        const printersData = [];

        for (const doc of docs) {
          const printerData = { ...doc, id: doc.id || doc._id };

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

          printersData.push(printerData);
        }

        setPrinters(printersData);
        setSelectedPrinters([]);
        setSelectAll(false);
      } catch (error) {
        showError("Error fetching printers: " + error.message);
      }
    };

    fetchPrinters();
  }, [branchName, showError]);

  useEffect(() => {
    const checkDestinationLFP = async () => {
      if (!toLocation) {
        setDestinationHasLFP(false);
        return;
      }

      try {
        const res = await api.get("/printers", {
          params: {
            branchName: toLocation,
            printerType: "LFP",
            isActive: true,
          },
        });
        const list = res.data?.data || res.data || [];
        setDestinationHasLFP(list.length > 0);
      } catch (error) {
        console.error("Error checking destination LFP:", error);
        setDestinationHasLFP(false);
      }
    };

    checkDestinationLFP();
  }, [toLocation]);

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find(
      (branch) => branch.name === e.target.value
    );
    setBranchName(e.target.value);
    setUserId(selectedBranch ? selectedBranch.id : "");
    setSelectedPrinters([]);
    setSelectAll(false);
  };

  const handleDestinationBranchChange = (e) => {
    setToLocation(e.target.value);
  };

  const handlePrinterSelection = (printer) => {
    setSelectedPrinters((prev) => {
      const isSelected = prev.some(
        (selected) => selected.printerId === printer.printerId
      );
      if (isSelected) {
        return prev.filter(
          (selected) => selected.printerId !== printer.printerId
        );
      } else {
        return [...prev, printer];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPrinters([]);
    } else {
      setSelectedPrinters([...printers]);
    }
    setSelectAll(!selectAll);
  };

  const markPrintersAsInactive = async (printersToMove) => {
    const updatePromises = printersToMove.map(async (printer) => {
      const pid = printer.id || printer._id;
      if (pid) {
        return api.put(`/printers/${pid}`, { isActive: false });
      } else {
        const queryRes = await api.get("/printers", {
          params: {
            branchName,
            printerId: printer.printerId,
            isActive: true,
          },
        });
        const docs = queryRes.data?.data || queryRes.data || [];
        return Promise.all(
          docs.map((doc) => api.put(`/printers/${doc.id || doc._id}`, { isActive: false }))
        );
      }
    });

    await Promise.all(updatePromises);
    console.log(
      `Marked ${printersToMove.length} printers as inactive in ${branchName}`
    );
  };

  const getLatestReadingsForPrinter = async (printerId, currentBranch) => {
    try {
      console.log(
        `Fetching latest readings for printer ${printerId} in branch ${currentBranch}`
      );

      const res = await api.get("/printer-readings", {
        params: { branchName: currentBranch },
      });
      const readingsSnapshotDocs = res.data?.data || res.data || [];
      const sortedDocs = [...readingsSnapshotDocs].sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );

      console.log(
        `Found ${sortedDocs.length} reading documents for branch ${currentBranch}`
      );

      for (const docSnapshot of sortedDocs) {
        const data = docSnapshot;
        console.log(`Checking document with date: ${data.date}`);

        if (data.readings && data.readings[printerId]) {
          console.log(
            `Found readings for printer ${printerId}:`,
            data.readings[printerId]
          );

          const printerReadings = data.readings[printerId];
          const lastFinalReadings = {};

          Object.entries(printerReadings).forEach(([size, sizeData]) => {
            if (
              sizeData["FINAL READING"] !== undefined &&
              sizeData.price !== undefined
            ) {
              lastFinalReadings[size] = {
                "FINAL READING": sizeData["FINAL READING"],
                price: sizeData.price,
              };
            }
          });

          console.log(
            `Extracted lastFinalReadings for printer ${printerId}:`,
            lastFinalReadings
          );
          return Object.keys(lastFinalReadings).length > 0
            ? lastFinalReadings
            : null;
        }
      }

      console.log(
        `No readings found for printer ${printerId} in branch ${currentBranch}`
      );
      return null;
    } catch (error) {
      console.error("Error fetching latest readings:", error);
      return null;
    }
  };

  const getLatestJumboCounter = async (printerId) => {
    try {
      console.log(`Fetching latest jumbo counter for printer ${printerId}`);

      const res = await api.get("/jumbo-xerox/readings", {
        params: { printerId },
      });
      const docs = res.data?.data || res.data || [];
      const sorted = [...docs].sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );

      if (sorted.length > 0) {
        const latestReading = sorted[0];
        console.log(
          `Found jumbo reading for printer ${printerId}:`,
          latestReading
        );

        if (latestReading.jumboCounter) {
          return {
            start: latestReading.jumboCounter.start || 0,
            end: latestReading.jumboCounter.end || 0,
            sftPrinted: latestReading.jumboCounter.sftPrinted || 0,
          };
        }
      }

      console.log(`No jumbo counter found for printer ${printerId}`);
      return null;
    } catch (error) {
      console.error("Error fetching jumbo counter:", error);
      return null;
    }
  };

  const getJumboXeroxDocsByPrinterId = async (branchName, printerId) => {
    try {
      console.log(
        `Fetching jumboXerox documents for printerId: ${printerId} in branch: ${branchName}`
      );
      if (!printerId || typeof printerId !== "string") {
        console.error("Invalid printerId provided:", printerId);
        return [];
      }

      const res = await api.get("/jumbo-xerox/machines", {
        params: {
          branch: branchName.trim(),
          printerId: printerId.trim(),
        },
      });

      const docs = res.data?.data || res.data || [];

      console.log(
        `✅ Found ${docs.length} document(s) for printerId: ${printerId} in branch: ${branchName}`
      );

      return docs;
    } catch (error) {
      console.error("❌ Error fetching documents by printerId:", error);
      return [];
    }
  };

  const validatePrinterIdUniqueness = async (printerId) => {
    try {
      const res = await api.get("/printers", {
        params: {
          printerId: printerId,
          isActive: true,
        },
      });
      const docs = res.data?.data || res.data || [];

      if (docs.length > 0) {
        const existingPrinter = docs[0];
        return {
          isValid: false,
          message: `Printer ID "${printerId}" already exists in branch: ${existingPrinter.branchName}`,
        };
      }

      return { isValid: true, message: "" };
    } catch (error) {
      console.error("Error validating printer ID:", error);
      return { isValid: false, message: "Error validating printer ID" };
    }
  };

  const markJumboXeroxAsInactive = async (printerId, branchName) => {
    try {
      const res = await api.get("/jumbo-xerox/machines", {
        params: {
          printerId: printerId,
          branch: branchName,
          isActive: true,
        },
      });
      const docs = res.data?.data || res.data || [];

      if (docs.length > 0) {
        const updatePromises = docs.map((doc) =>
          api.put(`/jumbo-xerox/machines/${doc.id || doc._id}`, {
            isActive: false,
            deactivatedAt: new Date(),
            reason: "Printer moved to another branch",
          })
        );

        await Promise.all(updatePromises);
        console.log(
          `Marked ${docs.length} JumboXerox configurations as inactive for printer ${printerId}`
        );
      }
    } catch (error) {
      console.error(
        "Error marking JumboXerox configurations as inactive:",
        error
      );
    }
  };

  const migratePrinterReadingHistory = async (
    printerId,
    fromBranch,
    toBranch
  ) => {
    try {
      console.log(
        `Starting printer reading history migration for ${printerId} from ${fromBranch} to ${toBranch}`
      );

      const res = await api.get("/printer-readings", {
        params: { branchName: fromBranch },
      });
      const docs = res.data?.data || res.data || [];
      let migratedRecords = 0;

      if (docs.length === 0) {
        console.log(
          `No printer reading documents found for branch ${fromBranch}`
        );
        return { success: true, migratedRecords: 0 };
      }

      const migrationPromises = docs.map(
        async (docData) => {
          if (!docData.readings || !docData.readings[printerId]) {
            return null;
          }

          const newDocData = {
            ...docData,
            branchName: toBranch,
            readings: {
              [printerId]: docData.readings[printerId],
            },
            migratedFrom: fromBranch,
            migratedAt: new Date(),
          };
          delete newDocData.id;
          delete newDocData._id;
          delete newDocData.createdAt;
          delete newDocData.updatedAt;

          await api.post("/printer-readings", newDocData);

          const updatedReadings = { ...docData.readings };
          delete updatedReadings[printerId];

          await api.put(`/printer-readings/${docData.id || docData._id}`, {
            readings: updatedReadings,
          });

          console.log(
            `Migrated reading history for printer ${printerId} from document dated ${docData.date}`
          );
          return true;
        }
      );

      const results = await Promise.all(migrationPromises);
      migratedRecords = results.filter((result) => result !== null).length;

      console.log(
        `Successfully migrated ${migratedRecords} printer reading records for ${printerId}`
      );
      return { success: true, migratedRecords };
    } catch (error) {
      console.error("Error migrating printer reading history:", error);
      return { success: false, error: error.message, migratedRecords: 0 };
    }
  };

  const transferJumboXeroxEntry = async (
    docId,
    newBranchName,
    action,
    printerName,
    newPrinterId = null
  ) => {
    try {
      const res = await api.get(`/jumbo-xerox/machines/${docId}`);
      const existingData = res.data?.data || res.data;

      if (!existingData) {
        console.error(`No document found with ID: ${docId}`);
        return;
      }

      if (action === "move") {
        const newDocData = {
          ...existingData,
          branch: newBranchName,
          printerId: newPrinterId || existingData.printerId,
          printerName: printerName || existingData.printerName,
          createdAt: new Date(),
          movedFrom: existingData.branch,
          isActive: true,
        };
        delete newDocData.id;
        delete newDocData._id;

        const newDocRes = await api.post("/jumbo-xerox/machines", newDocData);
        const newDoc = newDocRes.data?.data || newDocRes.data;
        console.log(
          `✅ Created new JumboXerox entry ${newDoc?.id || newDoc?._id} for moved printer in branch: ${newBranchName}`
        );
        return newDoc?.id || newDoc?._id;
      } else if (action === "clone") {
        const newDocData = {
          ...existingData,
          branch: newBranchName,
          printerId: newPrinterId || existingData.printerId,
          printerName: printerName || existingData.printerName,
          createdAt: new Date(),
          clonedFrom: existingData.branch,
          isActive: true,
        };
        delete newDocData.id;
        delete newDocData._id;

        const newDocRes = await api.post("/jumbo-xerox/machines", newDocData);
        const newDoc = newDocRes.data?.data || newDocRes.data;
        console.log(
          `✅ Created new jumboXerox entry ${newDoc?.id || newDoc?._id} for cloned printer in branch: ${newBranchName}`
        );
        return newDoc?.id || newDoc?._id;
      }
    } catch (error) {
      console.error("❌ Error during JumboXerox transfer:", error);
      throw error;
    }
  };

  const handleMove = async () => {
    if (selectedPrinters.length === 0) {
      showError("Please select at least one printer to move");
      return;
    }

    const hasLFPInSelection = selectedPrinters.some(
      (printer) => printer.printerType === "LFP"
    );
    if (hasLFPInSelection && destinationHasLFP) {
      showError(
        "Cannot move LFP printer. The destination branch already has an active LFP printer."
      );
      return;
    }

    setIsLoading(true);

    try {
      const destinationBranch = branches.find(
        (branch) => branch.name === toLocation
      );
      console.log(
        `Moving ${selectedPrinters.length} printers from ${branchName} to ${toLocation}`
      );

      const movePromises = selectedPrinters.map(async (printer) => {
        console.log(
          `Processing printer: ${printer.printerId} (${printer.printerName})`
        );

        const lastFinalReadings = await getLatestReadingsForPrinter(
          printer.printerId,
          branchName
        );

        const newPrinterData = {
          userId: destinationBranch ? destinationBranch.id : userId,
          branchName: toLocation,
          printerId: printer.printerId,
          printerName: printer.printerName,
          printerType: printer.printerType || "Unknown",
          prices: printer.prices,
          customServices: printer.customServices || [],
          isActive: true,
          migratedFrom: branchName,
        };

        if (lastFinalReadings && Object.keys(lastFinalReadings).length > 0) {
          newPrinterData.lastFinalReadings = lastFinalReadings;
        }

        if (printer.printerType === "LFP") {
          const jumboCounter = await getLatestJumboCounter(printer.printerId);
          const existingJumboXeroxDocs = await getJumboXeroxDocsByPrinterId(
            branchName,
            printer.printerId
          );

          if (existingJumboXeroxDocs.length > 0) {
            for (const doc of existingJumboXeroxDocs) {
              await transferJumboXeroxEntry(
                doc.id || doc._id,
                toLocation,
                "move",
                printer.printerName,
                printer.printerId
              );
            }

            await markJumboXeroxAsInactive(printer.printerId, branchName);
          } else {
            const defaultJumboConfig = {
              branch: toLocation,
              printerId: printer.printerId,
              printerName: printer.printerName,
              type: "COLOUR",
              size: "A0",
              unitPrice: 0,
              isActive: true,
              createdAt: new Date(),
            };

            await api.post("/jumbo-xerox/machines", defaultJumboConfig);
          }

          if (jumboCounter) {
            newPrinterData.lastFinalReadings = {
              ...newPrinterData.lastFinalReadings,
              jumboCounter: jumboCounter,
            };
          }
        }

        return api.post("/printers", newPrinterData);
      });

      await Promise.all(movePromises);
      await markPrintersAsInactive(selectedPrinters);

      // Migrate printer reading history for each moved printer
      const migrationResults = [];

      for (const printer of selectedPrinters) {
        const migrationResult = await migratePrinterReadingHistory(
          printer.printerId,
          branchName,
          toLocation
        );
        migrationResults.push({
          printerId: printer.printerId,
          ...migrationResult,
        });
      }

      // Calculate migration summary
      const totalMigratedRecords = migrationResults.reduce(
        (sum, result) => sum + result.migratedRecords,
        0
      );
      const failedMigrations = migrationResults.filter(
        (result) => !result.success
      );

      let successMessage = `Successfully moved ${selectedPrinters.length} printers to ${toLocation}`;

      if (totalMigratedRecords > 0) {
        successMessage += `\n✅ Migrated ${totalMigratedRecords} printer reading history records`;
      } else {
        successMessage += `\nℹ️ No printer reading history found to migrate`;
      }

      if (failedMigrations.length > 0) {
        successMessage += `\n⚠️ ${failedMigrations.length} reading history migrations failed`;
      }

      showSuccess(successMessage);

      const currentUser = JSON.parse(localStorage.getItem("user"));
      const movementPromises = selectedPrinters.map(async (printer) => {
        try {
          return await api.post("/general/inventory-movements", {
            type: "printer",
            action: "move",
            printerId: printer.printerId,
            printerName: printer.printerName,
            printerType: printer.printerType,
            fromBranch: branchName,
            toBranch: toLocation,
            movementDate: new Date(),
            performedBy: currentUser?.email || "Unknown",
            details: {
              prices: printer.prices,
              customServices: printer.customServices || [],
            },
          });
        } catch (invErr) {
          console.warn("Could not record movement:", invErr);
        }
      });

      await Promise.all(movementPromises);

      handleReset();
    } catch (error) {
      console.error("Error in handleMove:", error);
      showError("Failed to move printers: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClone = async () => {
    if (selectedPrinters.length === 0) {
      showError("Please select at least one printer to clone");
      return;
    }

    // Check LFP restriction
    const hasLFPInSelection = selectedPrinters.some(
      (printer) => printer.printerType === "LFP"
    );
    if (hasLFPInSelection && destinationHasLFP) {
      showError(
        "Cannot clone LFP printer. The destination branch already has an active LFP printer."
      );
      return;
    }

    // Reset any prior reservations and initialize progress tracking
    reservedCloneIdsRef.current = new Set();
    setTotalPrintersToClone(selectedPrinters.length);
    setCurrentPrinterIndex(0);

    // For each selected printer, prompt for new printer ID
    const printerIdMappings = [];

    try {
      for (let i = 0; i < selectedPrinters.length; i++) {
        const printer = selectedPrinters[i];
        setCurrentPrinterIndex(i + 1);

        const newId = await promptForPrinterId(printer);
        if (!newId) {
          showError(
            "Clone operation cancelled. All printers must have valid printer IDs."
          );
          return;
        }
        printerIdMappings.push({
          originalPrinter: printer,
          newPrinterId: newId,
        });
      }

      // Proceed with cloning using the provided printer IDs
      await performCloneOperation(printerIdMappings);
    } catch (error) {
      console.error("Error during clone operation:", error);
      showError("Clone operation failed: " + (error.response?.data?.message || error.message));
    } finally {
      // Reset progress tracking
      setCurrentPrinterIndex(0);
      setTotalPrintersToClone(0);
    }
  };

  const promptForPrinterId = (printer) => {
    return new Promise((resolve, reject) => {
      setCurrentCloningPrinter(printer);
      setNewPrinterId("");
      setPrinterIdError("");
      setShowPrinterIdPopup(true);

      // Start generating the new printer ID immediately
      if (toLocation) {
        startAutoGenerateNewPrinterId();
      }

      // Store resolve function to call later with proper cleanup
      window.printerIdResolve = resolve;
      window.printerIdReject = reject;
    });
  };

  const handlePrinterIdSubmit = async () => {
    if (!newPrinterId.trim()) {
      setPrinterIdError("Printer ID is required");
      return;
    }

    // Check uniqueness
    const validation = await validatePrinterIdUniqueness(newPrinterId);
    if (!validation.isValid) {
      setPrinterIdError(validation.message);
      return;
    }

    // Valid printer ID, close popup and resolve
    reservedCloneIdsRef.current.add(newPrinterId.trim());
    setShowPrinterIdPopup(false);
    if (window.printerIdResolve) {
      window.printerIdResolve(newPrinterId);
      delete window.printerIdResolve;
      delete window.printerIdReject;
    }
  };

  const handlePrinterIdCancel = () => {
    setShowPrinterIdPopup(false);
    if (window.printerIdResolve) {
      window.printerIdResolve(null);
      delete window.printerIdResolve;
      delete window.printerIdReject;
    }
  };

  const performCloneOperation = async (printerIdMappings) => {
    setIsLoading(true);

    try {
      const destinationBranch = branches.find(
        (branch) => branch.name === toLocation
      );

      const addPromises = printerIdMappings.map(
        async ({ originalPrinter, newPrinterId }) => {
          const newPrinterData = {
            userId: destinationBranch ? destinationBranch.id : userId,
            branchName: toLocation,
            printerId: newPrinterId,
            printerName: originalPrinter.printerName,
            printerType: originalPrinter.printerType,
            prices: originalPrinter.prices,
            customServices: originalPrinter.customServices || [],
            isActive: true,
          };

          if (originalPrinter.printerType === "LFP") {
            const existingJumboXeroxDocs = await getJumboXeroxDocsByPrinterId(
              branchName,
              originalPrinter.printerId
            );

            if (existingJumboXeroxDocs.length > 0) {
              for (const doc of existingJumboXeroxDocs) {
                await transferJumboXeroxEntry(
                  doc.id || doc._id,
                  toLocation,
                  "clone",
                  originalPrinter.printerName,
                  newPrinterId
                );
              }
            } else {
              showError(
                `No LFP configurations found for printer ${originalPrinter.printerId}. Cannot clone without existing configurations.`
              );
              return null;
            }
          }

          return api.post("/printers", newPrinterData);
        }
      );

      const results = await Promise.all(addPromises);
      const successfulClones = results.filter((result) => result !== null);

      if (successfulClones.length > 0) {
        showSuccess(
          `Successfully cloned ${successfulClones.length} printers to ${toLocation}`
        );

        const currentUser = JSON.parse(localStorage.getItem("user"));
        const clonePromises = printerIdMappings.map(
          async ({ originalPrinter, newPrinterId }) => {
            try {
              return await api.post("/general/inventory-movements", {
                type: "printer",
                action: "clone",
                originalPrinterId: originalPrinter.printerId,
                newPrinterId: newPrinterId,
                printerName: originalPrinter.printerName,
                printerType: originalPrinter.printerType,
                fromBranch: branchName,
                toBranch: toLocation,
                movementDate: new Date(),
                performedBy: currentUser?.email || "Unknown",
                details: {
                  prices: originalPrinter.prices,
                  customServices: originalPrinter.customServices || [],
                },
              });
            } catch (invErr) {
              console.warn("Could not record clone inventory movement:", invErr);
            }
          }
        );

        await Promise.all(clonePromises);
      }

      handleReset();
    } catch (error) {
      showError("Failed to clone printers: " + (error.response?.data?.message || error.message));
      console.error("Error cloning printers: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedPrinters([]);
    setToLocation("");
    setBranchName("");
    setSelectAll(false);
    setUserId("");
    setDestinationHasLFP(false);
  };

  return (
    <div className="move-printer-page-container">
      <Popup {...popup} />

      {/* Modern Loading Glassmorphism Overlay */}
      {isLoading && (
        <div className="mp-loading-overlay">
          <div className="mp-loading-card">
            <div className="mp-loading-spinner" />
            <h3>Processing Printers & Data</h3>
            <p>
              Please wait while we transfer hardware records, update configurations, and migrate reading history to the destination branch.
            </p>
          </div>
        </div>
      )}

      {/* Sequential Clone Printer ID Modal Dialog */}
      {showPrinterIdPopup && (
        <div className="mp-modal-backdrop">
          <div className="mp-modal-box">
            <div className="mp-modal-header">
              <div className="printer-services-header-left">
                <div className="printer-services-tag-icon" style={{ width: "34px", height: "34px" }}>
                  <Copy size={18} color="#059669" />
                </div>
                <div>
                  <h3 className="mp-modal-title">Enter Printer ID for Clone</h3>
                  <p className="mp-modal-subtitle">Unique identifier for destination hardware</p>
                </div>
              </div>
              {totalPrintersToClone > 1 && (
                <span className="mp-modal-step-badge">
                  {currentPrinterIndex} of {totalPrintersToClone}
                </span>
              )}
            </div>

            <div className="mp-modal-body">
              {currentCloningPrinter && (
                <div className="mp-modal-source-preview">
                  <div className="mp-modal-preview-row">
                    <span className="mp-modal-preview-label">Original Printer ID</span>
                    <span className="mp-id-badge">{currentCloningPrinter.printerId}</span>
                  </div>
                  <div className="mp-modal-preview-row">
                    <span className="mp-modal-preview-label">Model Name</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {currentCloningPrinter.printerName}
                    </span>
                  </div>
                  <div className="mp-modal-preview-row">
                    <span className="mp-modal-preview-label">Destination Branch</span>
                    <span style={{ fontWeight: 700, color: "#047857" }}>{toLocation}</span>
                  </div>
                </div>
              )}

              <div className="mp-modal-input-group">
                <label>New Generated Printer ID</label>
                <div className="printer-input-wrapper disabled">
                  <span className="printer-input-prefix-icon">
                    <Tag size={16} />
                  </span>
                  <input
                    type="text"
                    value={newPrinterId}
                    readOnly
                    disabled
                    placeholder={
                      isGeneratingPrinterId
                        ? "Generating Unique Printer ID..."
                        : "Auto-generated Printer ID"
                    }
                    className={`printer-field-input disabled ${printerIdError ? "has-error" : ""}`}
                  />
                </div>
                {printerIdError && (
                  <p className="mp-modal-error-msg">{printerIdError}</p>
                )}
              </div>
            </div>

            <div className="mp-modal-footer">
              <button
                type="button"
                className="mp-btn mp-btn-reset"
                onClick={handlePrinterIdCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="mp-btn mp-btn-move"
                onClick={handlePrinterIdSubmit}
                disabled={!newPrinterId.trim() || isGeneratingPrinterId}
              >
                Confirm ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Header Banner - Green gradient banner without illustration */}
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
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="printz-header-title-area">
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            Move & Clone <span className="highlight" style={{ color: "#059669" }}>Printers</span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Transfer hardware ownership and reading histories or clone printer setups across branches.
          </p>
        </div>
      </div>

      {/* LFP Printer Restriction Warning */}
      {destinationHasLFP &&
        selectedPrinters.some((printer) => printer.printerType === "LFP") && (
          <div className="move-printer-lfp-alert">
            <div className="move-printer-lfp-alert-icon">
              <AlertTriangle size={18} color="#e11d48" />
            </div>
            <div className="move-printer-lfp-alert-content">
              <h4>LFP Printer Restriction</h4>
              <p>
                Cannot move/clone LFP printer. The destination branch <strong>"{toLocation}"</strong> already has an active LFP printer. Only one LFP printer is allowed per branch.
              </p>
            </div>
          </div>
        )}

      {/* Section 1: Route & Action Configuration Card */}
      <div className="printer-section-card move-printer-route-card">
        {/* Section Header */}
        <div className="printer-services-header-row">
          <div className="printer-services-header-left">
            <div className="printer-services-tag-icon">
              <ArrowLeftRight size={20} color="#059669" />
            </div>
            <div>
              <h4 className="printer-services-title">Transfer Route Configuration</h4>
            </div>
          </div>
        </div>

        <div className="move-printer-route-grid">
          {/* Source Branch Box */}
          <div className="move-printer-branch-box">
            <div className="move-printer-box-header">
              <label className="move-printer-box-label source-label">
                <Building2 size={15} color="#059669" />
                <span>Source Branch <span className="req">*</span></span>
              </label>
              {branchName && printers.length > 0 && (
                <span className="move-printer-box-badge">
                  {printers.length} active printer{printers.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <BranchSelect
              value={branchName}
              onChange={handleBranchChange}
              branches={branches}
              placeholder="Select Source Branch"
              required
            />
          </div>

          {/* Transfer Flow Indicator */}
          <div className="move-printer-connector">
            <div className="move-printer-connector-icon">
              <ArrowRight size={20} />
            </div>
            <span className="move-printer-connector-text">Transfer</span>
          </div>

          {/* Destination Branch Box */}
          <div className="move-printer-branch-box">
            <div className="move-printer-box-header">
              <label className="move-printer-box-label dest-label">
                <Building2 size={15} color="#059669" />
                <span>Destination Branch <span className="req">*</span></span>
              </label>
              {toLocation && (
                <span className="move-printer-box-badge badge-dest-selected">
                  Selected
                </span>
              )}
            </div>
            <BranchSelect
              value={toLocation}
              onChange={handleDestinationBranchChange}
              branches={branches}
              exclude={branchName}
              placeholder="Select Destination Branch"
              required
            />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="move-printer-actions-bar">
          <div className="move-printer-status-info">
            {selectedPrinters.length > 0 ? (
              <span className="move-printer-count-pill">
                <Printer size={15} />
                {selectedPrinters.length} printer{selectedPrinters.length > 1 ? "s" : ""} selected
              </span>
            ) : (
              <span className="move-printer-status-hint">
                Select printers below to proceed with transfer or clone
              </span>
            )}
          </div>

          <div className="move-printer-buttons-group">
            <button
              type="button"
              onClick={handleMove}
              className="mp-btn mp-btn-move"
              disabled={
                isLoading ||
                selectedPrinters.length === 0 ||
                !toLocation ||
                (destinationHasLFP &&
                  selectedPrinters.some(
                    (printer) => printer.printerType === "LFP"
                  ))
              }
            >
              <ArrowLeftRight size={16} />
              <span>MOVE PRINTERS</span>
            </button>

            <button
              type="button"
              onClick={handleClone}
              className="mp-btn mp-btn-clone"
              disabled={
                isLoading ||
                selectedPrinters.length === 0 ||
                !toLocation ||
                (destinationHasLFP &&
                  selectedPrinters.some(
                    (printer) => printer.printerType === "LFP"
                  ))
              }
            >
              <Copy size={16} />
              <span>CLONE PRINTERS</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="mp-btn mp-btn-reset"
            >
              <RotateCcw size={15} />
              <span>RESET</span>
            </button>
          </div>
        </div>
      </div>

      {/* Available Hardware Selection Section */}
      {branchName ? (
        printers.length > 0 ? (
          <div className="printer-section-card move-printer-table-card">
            <div className="printer-services-header-row" style={{ alignItems: "center" }}>
              <div className="printer-services-header-left">
                <div className="printer-services-tag-icon">
                  <Printer size={20} color="#059669" />
                </div>
                <div>
                  <h4 className="printer-services-title">Printers in {branchName}</h4>
                </div>
              </div>

              <div className="move-printer-header-tools">
                <button
                  type="button"
                  className={`move-printer-select-all-pill ${selectAll ? "active" : ""}`}
                  onClick={handleSelectAll}
                >
                  {selectAll ? (
                    <CheckSquare size={16} color="#047857" />
                  ) : (
                    <Square size={16} color="#64748b" />
                  )}
                  <span>
                    {selectAll ? "Deselect All" : `Select All (${printers.length})`}
                  </span>
                </button>
              </div>
            </div>

            <div className="move-printer-table-wrapper">
              <table className="move-printer-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px", textAlign: "center" }}>Select</th>
                    <th>Printer ID</th>
                    <th>Printer Name</th>
                    <th>Type</th>
                    <th>Services & Pricing</th>
                  </tr>
                </thead>
                <tbody>
                  {printers
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((printer, index) => {
                    const isSelected = selectedPrinters.some(
                      (selected) => selected.printerId === printer.printerId
                    );
                    const typeClass =
                      printer.printerType === "LFP"
                        ? "type-lfp"
                        : printer.printerType === "SFP"
                        ? "type-sfp"
                        : "type-mfp";

                    return (
                      <tr
                        key={printer.id || index}
                        className={isSelected ? "row-selected" : ""}
                        onClick={() => handlePrinterSelection(printer)}
                        style={{ cursor: "pointer" }}
                      >
                        <td
                          style={{ textAlign: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="mp-checkbox-wrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handlePrinterSelection(printer)}
                              className="mp-checkbox-input"
                            />
                          </div>
                        </td>
                        <td>
                          <span className="mp-id-badge">{printer.printerId}</span>
                        </td>
                        <td>
                          <div className="mp-name-cell">
                            <span className="mp-name-title">{printer.printerName}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`mp-type-pill ${typeClass}`}>
                            {printer.printerType || "MFP"}
                          </span>
                        </td>
                        <td>
                          <div className="mp-services-list">
                            {printer.prices && printer.prices.length > 0 && (
                              printer.prices.map((priceObj, priceIndex) => (
                                <span key={priceIndex} className="mp-service-tag">
                                  <span className="service-size">{priceObj.size}</span>
                                  <span className="service-price">₹{priceObj.price}</span>
                                </span>
                              ))
                            )}

                            {printer.printerType === "LFP" &&
                              printer.jumboServices &&
                              printer.jumboServices.length > 0 && (
                                printer.jumboServices.map(
                                  (jumboService, jumboIndex) => (
                                    <span
                                      key={`jumbo-${jumboIndex}`}
                                      className="mp-service-tag jumbo-tag"
                                    >
                                      <span className="service-size">
                                        {jumboService.type} - {jumboService.size}
                                      </span>
                                      <span className="service-price">
                                        ₹{jumboService.unitPrice}
                                      </span>
                                    </span>
                                  )
                                )
                              )}

                            {(!printer.prices || printer.prices.length === 0) &&
                              (printer.printerType !== "LFP" ||
                                !printer.jumboServices ||
                                printer.jumboServices.length === 0) && (
                                <span className="mp-no-services">
                                  No services configured
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Standard Pagination */}
            {printers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={printers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                pageSizeOptions={[10, 20, 50, 100]}
                itemLabel="printers"
              />
            )}
          </div>
        ) : (
          <div className="printer-section-card move-printer-table-card">
            <div className="move-printer-empty-prompt">
              <div className="move-printer-empty-icon">
                <Printer size={28} />
              </div>
              <h4>No Active Printers Found</h4>
              <p>There are currently no active printers registered at <strong>{branchName}</strong>.</p>
            </div>
          </div>
        )
      ) : (
        <div className="printer-section-card move-printer-table-card">
          <div className="move-printer-empty-prompt">
            <div className="move-printer-empty-icon">
              <Building2 size={28} />
            </div>
            <h4>Select a Source Branch</h4>
            <p>
              Choose a source branch in the configuration above to view and select active printers for transfer or clone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovePrinterManager;
