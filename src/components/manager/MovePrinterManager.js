import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../../services/authservice";
import {
  addDoc,
  collection,
  getDocs,
  where,
  getDoc,
  doc,
  query,
  updateDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import "../../styles/stocklist.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup";

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

      // Gather used sequence numbers for this branch
      const branchPrintersSnap = await getDocs(
        query(collection(db, "printers"), where("branchName", "==", branch))
      );
      const used = new Set();
      branchPrintersSnap.docs.forEach((d) => {
        const pid = String(d.data()?.printerId || "").toUpperCase();
        const m = pid.match(new RegExp(`^PS-${code}-(\\d+)$`));
        if (m) {
          const n = parseInt(m[1], 10);
          if (!Number.isNaN(n)) used.add(n);
        }
      });

      let next = used.size > 0 ? Math.max(...Array.from(used)) + 1 : 1;

      // Ensure global uniqueness across all branches
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
    [branches, computeBranchCodeFromName]
  );

  const startAutoGenerateNewPrinterId = useCallback(async () => {
    if (!toLocation) return;
    try {
      setIsGeneratingPrinterId(true);
      setNewPrinterId("Generating Printer ID...");
      const initialId = await generateUniquePrinterIdForBranch(toLocation);

      // If the initial ID is already reserved in this session, bump the sequence until we find one
      // that's neither reserved nor existing in DB (defensive check)
      let candidate = initialId;
      for (let i = 0; i < 2000; i++) {
        if (!reservedCloneIdsRef.current.has(candidate)) {
          const snap = await getDocs(
            query(
              collection(db, "printers"),
              where("printerId", "==", candidate)
            )
          );
          if (snap.empty) break;
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
        const querySnapshot = await getDocs(collection(db, "branches"));
        const branchesData = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          branchesData.push({
            name: userData.name,
            id: doc.id,
            code: userData.code || "",
          });
        });

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
        const querySnapshot = await getDocs(
          query(
            collection(db, "printers"),
            where("branchName", "==", branchName),
            where("isActive", "==", true)
          )
        );
        const printersData = [];

        for (const doc of querySnapshot.docs) {
          const printerData = { ...doc.data(), id: doc.id };

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
        const querySnapshot = await getDocs(
          query(
            collection(db, "printers"),
            where("branchName", "==", toLocation),
            where("printerType", "==", "LFP"),
            where("isActive", "==", true)
          )
        );
        setDestinationHasLFP(!querySnapshot.empty);
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
      const querySnapshot = await getDocs(
        query(
          collection(db, "printers"),
          where("branchName", "==", branchName),
          where("printerId", "==", printer.printerId),
          where("isActive", "==", true)
        )
      );
      const updatePrinterPromises = querySnapshot.docs.map((document) =>
        updateDoc(doc(db, "printers", document.id), { isActive: false })
      );
      return Promise.all(updatePrinterPromises);
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

      const readingsQuery = query(
        collection(db, "printerReadings"),
        where("branchName", "==", currentBranch),
        orderBy("date", "desc")
      );

      const readingsSnapshot = await getDocs(readingsQuery);
      console.log(
        `Found ${readingsSnapshot.docs.length} reading documents for branch ${currentBranch}`
      );

      for (const docSnapshot of readingsSnapshot.docs) {
        const data = docSnapshot.data();
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

      const jumboQuery = query(
        collection(db, "jumboXeroxReadings"),
        where("printerId", "==", printerId),
        orderBy("date", "desc"),
        limit(1)
      );

      const jumboSnapshot = await getDocs(jumboQuery);

      if (!jumboSnapshot.empty) {
        const latestReading = jumboSnapshot.docs[0].data();
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

      // Query for documents matching both branch AND printerId
      const xeroxQuery = query(
        collection(db, "JumboXerox"),
        where("branch", "==", branchName.trim()),
        where("printerId", "==", printerId.trim())
      );

      const snapshot = await getDocs(xeroxQuery);

      if (snapshot.empty) {
        console.log(
          `No documents found for printerId: ${printerId} in branch: ${branchName}`
        );
        return [];
      }

      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(
        `✅ Found ${docs.length} document(s) for printerId: ${printerId} in branch: ${branchName}`
      );
      console.log(
        `Documents found:`,
        docs.map((doc) => ({
          id: doc.id,
          printerId: doc.printerId,
          printerName: doc.printerName,
        }))
      );

      return docs;
    } catch (error) {
      console.error("❌ Error fetching documents by printerId:", error);
      return [];
    }
  };

  const validatePrinterIdUniqueness = async (printerId) => {
    try {
      // Check if printer ID exists in any branch
      const printerQuery = query(
        collection(db, "printers"),
        where("printerId", "==", printerId),
        where("isActive", "==", true)
      );

      const printerSnapshot = await getDocs(printerQuery);

      if (!printerSnapshot.empty) {
        const existingPrinter = printerSnapshot.docs[0].data();
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
      const jumboQuery = query(
        collection(db, "JumboXerox"),
        where("printerId", "==", printerId),
        where("branch", "==", branchName),
        where("isActive", "==", true)
      );

      const jumboSnapshot = await getDocs(jumboQuery);

      if (!jumboSnapshot.empty) {
        const updatePromises = jumboSnapshot.docs.map((doc) =>
          updateDoc(doc.ref, {
            isActive: false,
            deactivatedAt: new Date(),
            reason: "Printer moved to another branch",
          })
        );

        await Promise.all(updatePromises);
        console.log(
          `Marked ${jumboSnapshot.docs.length} JumboXerox configurations as inactive for printer ${printerId}`
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

      // Fetch all printerReadings documents from the source branch
      const readingsQuery = query(
        collection(db, "printerReadings"),
        where("branchName", "==", fromBranch)
      );

      const readingsSnapshot = await getDocs(readingsQuery);
      let migratedRecords = 0;

      if (readingsSnapshot.empty) {
        console.log(
          `No printer reading documents found for branch ${fromBranch}`
        );
        return { success: true, migratedRecords: 0 };
      }

      const migrationPromises = readingsSnapshot.docs.map(
        async (docSnapshot) => {
          const docData = docSnapshot.data();

          // Check if this document has readings for the specific printer
          if (!docData.readings || !docData.readings[printerId]) {
            return null; // No readings for this printer in this document
          }

          // Create new document for destination branch with only the moved printer's history
          const newDocData = {
            ...docData,
            branchName: toBranch,
            readings: {
              [printerId]: docData.readings[printerId], // Only include this printer's readings
            },
            migratedFrom: fromBranch,
            migratedAt: new Date(),
          };

          // Add the new document to destination branch
          await addDoc(collection(db, "printerReadings"), newDocData);

          // Remove the printer's readings from the original document
          const updatedReadings = { ...docData.readings };
          delete updatedReadings[printerId];

          // Update the original document (remove the printer's readings)
          await updateDoc(doc(db, "printerReadings", docSnapshot.id), {
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
      const existingDocRef = doc(db, "JumboXerox", docId);
      const existingDocSnap = await getDoc(existingDocRef);

      if (!existingDocSnap.exists()) {
        console.error(`No document found with ID: ${docId}`);
        return;
      }

      const existingData = existingDocSnap.data();

      if (action === "move") {
        // For move operation, create a new document in destination and keep original
        // The original will be handled when the printer is marked as inactive
        const newDocData = {
          ...existingData,
          branch: newBranchName,
          printerId: newPrinterId || existingData.printerId,
          printerName: printerName || existingData.printerName,
          createdAt: new Date(),
          movedFrom: existingData.branch, // Track where it came from
        };

        const newDoc = await addDoc(collection(db, "JumboXerox"), newDocData);
        console.log(
          `✅ Created new JumboXerox entry ${newDoc.id} for moved printer in branch: ${newBranchName}`
        );
        return newDoc.id;
      } else if (action === "clone") {
        // For clone operation, create a new document (original stays intact)
        const newDocData = {
          ...existingData,
          branch: newBranchName,
          printerId: newPrinterId || existingData.printerId,
          printerName: printerName || existingData.printerName,
          createdAt: new Date(),
          clonedFrom: existingData.branch, // Track where it was cloned from
        };

        const newDoc = await addDoc(collection(db, "JumboXerox"), newDocData);
        console.log(
          `✅ Created new jumboXerox entry ${newDoc.id} for cloned printer in branch: ${newBranchName}`
        );
        return newDoc.id;
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
        console.log(
          `Latest readings for ${printer.printerId}:`,
          lastFinalReadings
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
          // Track where this printer was migrated from (only for move operations)
          migratedFrom: branchName,
        };

        if (lastFinalReadings && Object.keys(lastFinalReadings).length > 0) {
          newPrinterData.lastFinalReadings = lastFinalReadings;
          console.log(
            `Added lastFinalReadings to new printer document for ${printer.printerId}`
          );
        }

        if (printer.printerType === "LFP") {
          console.log(
            `Processing LFP printer ${printer.printerId} - fetching jumbo counter`
          );

          const jumboCounter = await getLatestJumboCounter(printer.printerId);
          const existingJumboXeroxDocs = await getJumboXeroxDocsByPrinterId(
            branchName,
            printer.printerId
          );

          if (existingJumboXeroxDocs.length > 0) {
            console.log(
              `Found existing jumboXerox documents for printer ${printer.printerId}:`,
              existingJumboXeroxDocs
            );

            // Create new JumboXerox configuration documents in destination branch
            for (const doc of existingJumboXeroxDocs) {
              await transferJumboXeroxEntry(
                doc.id,
                toLocation,
                "move",
                printer.printerName,
                printer.printerId
              );
            }
            console.log(
              `Created ${existingJumboXeroxDocs.length} new jumboXerox entries for printer ${printer.printerId} in ${toLocation}`
            );

            // Mark original configurations as inactive (but keep them for historical purposes)
            await markJumboXeroxAsInactive(printer.printerId, branchName);
            console.log(
              `Marked original jumboXerox configurations as inactive for printer ${printer.printerId} in ${branchName}`
            );
          } else {
            console.log(
              `No existing jumboXerox documents found for printer ${printer.printerId}`
            );

            // Create default JumboXerox configuration for the moved printer
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

            await addDoc(collection(db, "JumboXerox"), defaultJumboConfig);
            console.log(
              `Created default jumboXerox configuration for printer ${printer.printerId} in ${toLocation}`
            );
          }

          console.log(
            `Latest jumbo counter for ${printer.printerId}:`,
            jumboCounter
          );

          if (jumboCounter) {
            newPrinterData.lastFinalReadings = {
              ...newPrinterData.lastFinalReadings,
              jumboCounter: jumboCounter,
            };
            console.log(
              `Added jumbo counter to lastFinalReadings for ${printer.printerId}:`,
              jumboCounter
            );
          } else {
            console.log(
              `No jumbo counter data found for LFP printer ${printer.printerId}`
            );
          }
        }

        console.log(`Creating new printer document:`, newPrinterData);
        return addDoc(collection(db, "printers"), newPrinterData);
      });

      await Promise.all(movePromises);
      console.log("All new printer documents created successfully");

      await markPrintersAsInactive(selectedPrinters);
      console.log("Original printers marked as inactive");

      // Migrate printer reading history for each moved printer
      console.log("Starting printer reading history migration...");
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
        console.error(
          "Some reading history migrations failed:",
          failedMigrations
        );
        successMessage += `\n⚠️ ${failedMigrations.length} reading history migrations failed`;
      }

      showSuccess(successMessage);

      const movementPromises = selectedPrinters.map(async (printer) => {
        const currentUser = JSON.parse(localStorage.getItem("user"));
        return addDoc(collection(db, "inventoryMovements"), {
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
      });

      await Promise.all(movementPromises);

      handleReset();
    } catch (error) {
      console.error("Error in handleMove:", error);
      showError("Failed to move printers: " + error.message);
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
        console.log(
          `Prompting for printer ID ${i + 1}/${selectedPrinters.length}: ${
            printer.printerId
          }`
        );

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
        console.log(`Received printer ID for ${printer.printerId}: ${newId}`);
      }

      // Proceed with cloning using the provided printer IDs
      await performCloneOperation(printerIdMappings);
    } catch (error) {
      console.error("Error during clone operation:", error);
      showError("Clone operation failed: " + error.message);
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

    // Auto-generated ID should be valid; keep uniqueness validation as a safety check

    // Check uniqueness
    const validation = await validatePrinterIdUniqueness(newPrinterId);
    if (!validation.isValid) {
      setPrinterIdError(validation.message);
      return;
    }

    // Valid printer ID, close popup and resolve
    // Reserve this ID for the remainder of this clone session to avoid reuse
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
      window.printerIdResolve(null); // Resolve with null to indicate cancellation
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
          console.log(
            `Cloning printer: ${originalPrinter.printerId} as ${newPrinterId} (${originalPrinter.printerName})`
          );

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
            console.log(
              `Processing LFP printer clone - creating configuration for ${newPrinterId}`
            );

            const existingJumboXeroxDocs = await getJumboXeroxDocsByPrinterId(
              branchName,
              originalPrinter.printerId
            );

            if (existingJumboXeroxDocs.length > 0) {
              console.log(
                `Found ${existingJumboXeroxDocs.length} existing jumboXerox documents for printer ${originalPrinter.printerId}`
              );

              // Clone ONLY the existing JumboXerox configuration documents
              for (const doc of existingJumboXeroxDocs) {
                await transferJumboXeroxEntry(
                  doc.id,
                  toLocation,
                  "clone",
                  originalPrinter.printerName,
                  newPrinterId
                );
              }
              console.log(
                `Cloned ${existingJumboXeroxDocs.length} jumboXerox entries for new printer ${newPrinterId} in ${toLocation}`
              );
            } else {
              console.log(
                `No existing jumboXerox documents found for printer ${originalPrinter.printerId}`
              );
              showError(
                `No LFP configurations found for printer ${originalPrinter.printerId}. Cannot clone without existing configurations.`
              );
              return null;
            }

            console.log(
              `Cloned LFP printer ${originalPrinter.printerId} as ${newPrinterId} without previous readings`
            );
          }

          return addDoc(collection(db, "printers"), newPrinterData);
        }
      );

      const results = await Promise.all(addPromises);
      const successfulClones = results.filter((result) => result !== null);

      if (successfulClones.length > 0) {
        showSuccess(
          `Successfully cloned ${successfulClones.length} printers to ${toLocation}`
        );

        const clonePromises = printerIdMappings.map(
          async ({ originalPrinter, newPrinterId }) => {
            const currentUser = JSON.parse(localStorage.getItem("user"));
            return addDoc(collection(db, "inventoryMovements"), {
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
          }
        );

        await Promise.all(clonePromises);
      }

      handleReset();
    } catch (error) {
      showError("Failed to clone printers: " + error.message);
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

  if (isLoading) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Processing printers and migrating reading history...</p>
        <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
          Please wait while we move the printers and transfer their reading
          history to the new branch.
        </p>
      </div>
    );
  }

  return (
    <div className="stock-readings-container">
      <Popup {...popup} />

      {/* Printer ID Input Popup */}
      {showPrinterIdPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              minWidth: "400px",
              maxWidth: "500px",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                color: "#2c3e50",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              Enter Printer ID for Clone
              {totalPrintersToClone > 1 && (
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#6c757d",
                    marginLeft: "10px",
                  }}
                >
                  ({currentPrinterIndex} of {totalPrintersToClone})
                </span>
              )}
            </h3>

            {currentCloningPrinter && (
              <div
                style={{
                  marginBottom: "20px",
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    color: "#6c757d",
                  }}
                >
                  <strong>Original Printer:</strong>{" "}
                  {currentCloningPrinter.printerId}
                </p>
                <p style={{ margin: "0", fontSize: "14px", color: "#6c757d" }}>
                  <strong>Printer Name:</strong>{" "}
                  {currentCloningPrinter.printerName}
                </p>
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#2c3e50",
                }}
              >
                New Printer ID:
              </label>
              <input
                type="text"
                value={newPrinterId}
                readOnly
                disabled
                placeholder={
                  isGeneratingPrinterId
                    ? "Generating Printer ID..."
                    : "Auto-generated Printer ID"
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `2px solid ${printerIdError ? "#dc3545" : "#ced4da"}`,
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "#f8f9fa",
                  color: isGeneratingPrinterId ? "#6c757d" : "#212529",
                  outline: "none",
                  transition: "border-color 0.3s",
                  cursor: "not-allowed",
                }}
              />
              {printerIdError && (
                <p
                  style={{
                    color: "#dc3545",
                    fontSize: "12px",
                    margin: "5px 0 0 0",
                  }}
                >
                  {printerIdError}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handlePrinterIdCancel}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.3s",
                }}
                onMouseOver={(e) =>
                  (e.target.style.backgroundColor = "#5a6268")
                }
                onMouseOut={(e) => (e.target.style.backgroundColor = "#6c757d")}
              >
                Cancel
              </button>
              <button
                onClick={handlePrinterIdSubmit}
                disabled={!newPrinterId.trim() || isGeneratingPrinterId}
                style={{
                  padding: "10px 20px",
                  backgroundColor:
                    newPrinterId.trim() && !isGeneratingPrinterId
                      ? "#1e3a8a"
                      : "#9ca3af",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor:
                    newPrinterId.trim() && !isGeneratingPrinterId
                      ? "pointer"
                      : "not-allowed",
                  transition: "background-color 0.3s",
                }}
                onMouseOver={(e) => {
                  if (newPrinterId.trim() && !isGeneratingPrinterId) {
                    e.target.style.backgroundColor = "#1e40af";
                  }
                }}
                onMouseOut={(e) => {
                  if (newPrinterId.trim() && !isGeneratingPrinterId) {
                    e.target.style.backgroundColor = "#1e3a8a";
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="stock-page-header">
        <h2>Move & Clone Printer</h2>
        <p>Transfer or clone printers between branches</p>
      </div>

      {}
      {destinationHasLFP &&
        selectedPrinters.some((printer) => printer.printerType === "LFP") && (
          <div
            style={{
              backgroundColor: "#ffebee",
              border: "1px solid #f44336",
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
                backgroundColor: "#f44336",
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
              <strong style={{ color: "#c62828" }}>
                LFP Printer Restriction:
              </strong>
              <p
                style={{
                  margin: "5px 0 0 0",
                  color: "#c62828",
                  fontSize: "14px",
                }}
              >
                Cannot move/clone LFP printer. The destination branch "
                {toLocation}" already has an active LFP printer. Only one LFP
                printer is allowed per branch.
              </p>
            </div>
          </div>
        )}

      <div className="stock-card">
        <div className="stock-card-header">
          <div className="stock-card-title">
            <h3>Printer Transfer & Clone</h3>
          </div>
        </div>
        <div className="stock-card-content">
          <div className="stock-date-picker-container">
            <div className="stock-date-picker-wrapper">
              <label>Source Branch</label>
              <select
                value={branchName}
                onChange={handleBranchChange}
                className="stock-select-input"
                required
              >
                <option value="">Select Source Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="stock-date-picker-wrapper">
              <label>Destination Branch</label>
              <select
                value={toLocation}
                onChange={handleDestinationBranchChange}
                className="stock-select-input"
                required
              >
                <option value="">Select Destination Branch</option>
                {branches
                  .filter((branch) => branch.name !== branchName)
                  .map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleMove}
              className="add"
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
              MOVE PRINTERS
            </button>

            <button
              type="button"
              onClick={handleClone}
              className="update"
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
              CLONE PRINTERS
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="reset-button"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {branchName && printers.length > 0 && (
        <div className="stock-card">
          <div className="stock-card-header">
            <div className="stock-card-title">
              <h3>Select Printers -[{selectedPrinters.length} selected]</h3>
            </div>
          </div>
          <div className="stock-card-content">
            <div className="stock-checkbox-container">
              <div className="stock-checkbox-item">
                <label className="stock-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="stock-checkbox-input"
                  />
                  <span
                    className="stock-checkbox-custom"
                    style={{ marginRight: "10px" }}
                  ></span>
                  Select All {printers.length} Printers
                </label>
              </div>
            </div>

            <div className="stock-table-wrapper">
              <table
                className="stock-readings-table"
                style={{ tableLayout: "fixed", width: "100%" }}
              >
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Printer ID</th>
                    <th>Printer Name</th>
                    <th>Type</th>
                    <th>Services & Pricing</th>
                  </tr>
                </thead>
                <tbody>
                  {printers.map((printer, index) => (
                    <tr
                      key={index}
                      style={{ borderBottom: "1px solid #e9ecef" }}
                    >
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "top",
                          padding: "12px 8px",
                        }}
                      >
                        <label className="stock-checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedPrinters.some(
                              (selected) =>
                                selected.printerId === printer.printerId
                            )}
                            onChange={() => handlePrinterSelection(printer)}
                            className="stock-checkbox-input"
                          />
                          <span className="stock-checkbox-custom"></span>
                        </label>
                      </td>
                      <td
                        style={{
                          verticalAlign: "top",
                          padding: "12px 8px",
                          fontSize: "13px",
                        }}
                      >
                        {printer.printerId}
                      </td>
                      <td style={{ verticalAlign: "top", padding: "12px 8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500" }}>
                          {printer.printerName}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          verticalAlign: "top",
                          padding: "12px 8px",
                        }}
                      >
                        <span
                          style={{
                            backgroundColor:
                              printer.printerType === "LFP"
                                ? "#e3f2fd"
                                : printer.printerType === "SFP"
                                ? "#ffcdd2"
                                : "#f3e5f5",
                            color:
                              printer.printerType === "LFP"
                                ? "#1976d2"
                                : printer.printerType === "SFP"
                                ? "#d32f2f"
                                : "#7b1fa2",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: "500",
                            display: "inline-block",
                            textAlign: "center",
                            minWidth: "35px",
                          }}
                        >
                          {printer.printerType === "LFP"
                            ? "LFP"
                            : printer.printerType === "SFP"
                            ? "SFP"
                            : "MFP"}
                        </span>
                      </td>
                      <td style={{ verticalAlign: "top", padding: "12px 8px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {printer.prices && printer.prices.length > 0 && (
                            <div
                              style={{
                                marginBottom:
                                  printer.printerType === "LFP" ? "8px" : "0",
                              }}
                            >
                              {printer.prices.map((priceObj, priceIndex) => (
                                <div
                                  key={priceIndex}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "12px",
                                    minHeight: "20px",
                                    paddingBottom: "2px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "500",
                                      color: "#495057",
                                    }}
                                  >
                                    {priceObj.size}:
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: "600",
                                      color: "#28a745",
                                    }}
                                  >
                                    ₹{priceObj.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {printer.printerType === "LFP" &&
                            printer.jumboServices &&
                            printer.jumboServices.length > 0 && (
                              <div>
                                {printer.jumboServices.map(
                                  (jumboService, jumboIndex) => (
                                    <div
                                      key={jumboIndex}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontSize: "12px",
                                        minHeight: "20px",
                                        paddingBottom: "2px",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: "500",
                                          color: "#1976d2",
                                        }}
                                      >
                                        {jumboService.type} -{" "}
                                        {jumboService.size}:
                                      </span>
                                      <span
                                        style={{
                                          fontWeight: "600",
                                          color: "#1565c0",
                                        }}
                                      >
                                        ₹{jumboService.unitPrice}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          {(!printer.prices || printer.prices.length === 0) &&
                            (printer.printerType !== "LFP" ||
                              !printer.jumboServices ||
                              printer.jumboServices.length === 0) && (
                              <span
                                style={{
                                  color: "#6c757d",
                                  fontStyle: "italic",
                                  fontSize: "12px",
                                  padding: "4px 0",
                                }}
                              >
                                No services configured
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovePrinterManager;
