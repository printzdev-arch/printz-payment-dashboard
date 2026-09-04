import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../services/authservice";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";
import {
  FaUndo,
  FaExchangeAlt,
  FaCopy,
  FaEdit,
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaArrowRight,
} from "react-icons/fa";
import { MdOutlineFileDownloadDone } from "react-icons/md";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../styles/stocklist.css";
import { usePopup } from "../../hooks/usePopup";
import Popup from "../common/Popup";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) {
    return "₹0";
  }
  let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".");
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (integer.length > 4 && integer.includes(",,")) {
    integer = integer.replace(",,", ",");
  }

  return `₹${integer}${decimal ? "." + decimal : ""}`;
};

const MoveStock = () => {
  const [branchName, setBranchName] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [userId, setUserId] = useState("");
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [toLocation, setToLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [showQuantitySelection, setShowQuantitySelection] = useState(false);
  const [itemQuantities, setItemQuantities] = useState({});
  const { popup, showSuccess, showError } = usePopup();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "branches"));
        const branchesData = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          branchesData.push({ name: userData.name, id: doc.id });
        });

        branchesData.sort((a, b) => a.name.localeCompare(b.name));
        setBranches(branchesData);
      } catch (error) {
        showError("Error fetching branches: " + error.message);
      }
    };

    fetchBranches();
  }, [showError]);

  useEffect(() => {
    if (!branchName) {
      setItems([]);
      setSelectedItems([]);
      setCurrentPage(1);
      return;
    }

    const fetchItems = async () => {
      try {
        const q = query(
          collection(db, "stocks"),
          where("branchName", "==", branchName)
        );
        const querySnapshot = await getDocs(q);
        const itemsData = [];
        querySnapshot.forEach((doc) => {
          const itemData = doc.data();
          itemsData.push({ ...itemData, id: doc.id });
        });
        setItems(itemsData);
        setSelectedItems([]);
        setSelectAll(false);
        setShowQuantitySelection(false);
        setItemQuantities({});
        setCurrentPage(1);
      } catch (error) {
        showError("Error fetching items: " + error.message);
      }
    };

    fetchItems();
  }, [branchName, showError]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleBranchChange = (e) => {
    const selectedBranch = branches.find(
      (branch) => branch.name === e.target.value
    );
    setBranchName(e.target.value);
    setUserId(selectedBranch ? selectedBranch.id : "");
    setSelectedItems([]);
    setSelectAll(false);
    setShowQuantitySelection(false);
    setItemQuantities({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleDestinationBranchChange = (e) => {
    setToLocation(e.target.value);
  };

  const handleItemSelection = (item) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some((selected) => selected.id === item.id);
      if (isSelected) {
        const newQuantities = { ...itemQuantities };
        delete newQuantities[item.id];
        return prev.filter((selected) => selected.id !== item.id);
      } else {
        setItemQuantities((prev) => ({
          ...prev,
          [item.id]: 1, // Default to 1, user can change to any value
        }));
        return [...prev, item];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      setItemQuantities({});
    } else {
      setSelectedItems([...filteredItems]);
      const newQuantities = {};
      filteredItems.forEach((item) => {
        newQuantities[item.id] = 1; // Default to 1, user can change to any value
      });
      setItemQuantities(newQuantities);
    }
    setSelectAll(!selectAll);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    // Allow user to enter any quantity - validation will happen on move/clone
    if (newQuantity === "" || newQuantity == null) {
      setItemQuantities((prev) => ({
        ...prev,
        [itemId]: "",
      }));
      return;
    }

    const inputQty = Number.parseInt(newQuantity);

    // Only check if it's a valid number, don't limit the value
    if (isNaN(inputQty) || inputQty < 1) {
      return; // Don't allow invalid numbers or values less than 1
    }

    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: inputQty,
    }));
  };

  const proceedToQuantitySelection = () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item first");
      return;
    }
    setShowQuantitySelection(true);
  };

  const getLatestJumboCounter = async (printerId) => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "jumboXeroxReadings"),
          where("printerId", "==", printerId),
          orderBy("date", "desc"),
          limit(1)
        )
      );

      if (!querySnapshot.empty) {
        const latestReading = querySnapshot.docs[0].data();
        return latestReading.jumboCounter || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching latest jumbo counter:", error);
      return null;
    }
  };

  const handleMove = async () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item to move");
      return;
    }

    if (!toLocation) {
      showError("Please select a destination branch");
      return;
    }

    // Validate quantities for move operation
    const invalidItems = [];
    const zeroStockItems = [];

    selectedItems.forEach((item) => {
      const selectedQty = itemQuantities[item.id] || 0;
      const availableQty = item.qty || 0;

      if (selectedQty <= 0) {
        invalidItems.push(`${item.itemName}: Quantity must be greater than 0`);
      } else if (availableQty === 0) {
        zeroStockItems.push(item.itemName);
      } else if (selectedQty > availableQty) {
        invalidItems.push(
          `${item.itemName}: Cannot move ${selectedQty} items (only ${availableQty} available)`
        );
      }
    });

    if (zeroStockItems.length > 0) {
      showError(
        `Cannot move items with 0 stock: ${zeroStockItems.join(
          ", "
        )}. Use clone instead for items with no available quantity.`
      );
      return;
    }

    if (invalidItems.length > 0) {
      showError(`Invalid quantities:\n${invalidItems.join("\n")}`);
      return;
    }

    setLoading(true);

    try {
      const destinationBranch = branches.find(
        (branch) => branch.name === toLocation
      );

      const existingItemsCheck = await Promise.all(
        selectedItems.map(async (item) => {
          const matchField = item.stockId
            ? where("stockId", "==", item.stockId)
            : where("itemName", "==", item.itemName);

          const existingItemQuery = query(
            collection(db, "stocks"),
            where("branchName", "==", toLocation),
            matchField
          );

          const existingItemSnapshot = await getDocs(existingItemQuery);
          return {
            item,
            existingItem: !existingItemSnapshot.empty
              ? existingItemSnapshot.docs[0]
              : null,
          };
        })
      );

      const movePromises = existingItemsCheck.map(
        async ({ item, existingItem }) => {
          const moveQuantity = itemQuantities[item.id] || 0;

          if (existingItem) {
            const existingData = existingItem.data();
            const updatedQty = (existingData.qty || 0) + moveQuantity;

            await updateDoc(doc(db, "stocks", existingItem.id), {
              qty: updatedQty,

              itemName: item.itemName,
              amount: item.amount,
              category: item.category || "",
              description: item.description || "",
              ...(item.pageRanges && { pageRanges: item.pageRanges }),
            });
          } else {
            const newItemData = {
              userId: destinationBranch ? destinationBranch.id : userId,
              branchName: toLocation,
              itemName: item.itemName,
              amount: item.amount,
              qty: moveQuantity,
              category: item.category || "",
              description: item.description || "",
              stockId: item.stockId || null,
              ...(item.pageRanges && { pageRanges: item.pageRanges }),
            };

            await addDoc(collection(db, "stocks"), newItemData);
          }

          // Update or delete the source item
          const remainingQty = (item.qty || 0) - moveQuantity;

          if (remainingQty > 0) {
            await updateDoc(doc(db, "stocks", item.id), { qty: remainingQty });
          } else {
            await deleteDoc(doc(db, "stocks", item.id));
          }

          const currentUser = JSON.parse(localStorage.getItem("user"));
          return addDoc(collection(db, "inventoryMovements"), {
            type: "stock",
            action: "move",
            itemName: item.itemName,
            category: item.category || "",
            quantity: moveQuantity,
            amount: item.amount,
            fromBranch: branchName,
            toBranch: toLocation,
            movementDate: new Date(),
            performedBy: currentUser?.email || "Unknown",
            stockId: item.stockId || null,
            updatedExisting: existingItem ? true : false,
          });
        }
      );

      await Promise.all(movePromises);

      const totalQuantity = Object.values(itemQuantities).reduce(
        (sum, qty) => sum + qty,
        0
      );
      showSuccess(
        `Successfully moved ${totalQuantity} items (${selectedItems.length} types) to ${toLocation}`
      );

      handleReset();
    } catch (error) {
      showError("Failed to move items: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (selectedItems.length === 0) {
      showError("Please select at least one item to clone");
      return;
    }

    if (!toLocation) {
      showError("Please select a destination branch");
      return;
    }

    // Validate quantities for clone operation
    const invalidItems = [];

    selectedItems.forEach((item) => {
      const selectedQty = itemQuantities[item.id] || 0;
      const availableQty = item.qty || 0;

      if (selectedQty <= 0) {
        invalidItems.push(`${item.itemName}: Quantity must be greater than 0`);
      } else if (availableQty > 0 && selectedQty > availableQty) {
        // Only validate against available quantity if there is stock available
        invalidItems.push(
          `${item.itemName}: Cannot clone ${selectedQty} items (only ${availableQty} available)`
        );
      }
      // If availableQty is 0, allow any quantity for cloning
    });

    if (invalidItems.length > 0) {
      showError(`Invalid quantities:\n${invalidItems.join("\n")}`);
      return;
    }

    setLoading(true);

    try {
      const destinationBranch = branches.find(
        (branch) => branch.name === toLocation
      );

      const existingItemsCheck = await Promise.all(
        selectedItems.map(async (item) => {
          const matchField = item.stockId
            ? where("stockId", "==", item.stockId)
            : where("itemName", "==", item.itemName);

          const existingItemQuery = query(
            collection(db, "stocks"),
            where("branchName", "==", toLocation),
            matchField
          );

          const existingItemSnapshot = await getDocs(existingItemQuery);
          return {
            item,
            existingItem: !existingItemSnapshot.empty
              ? existingItemSnapshot.docs[0]
              : null,
          };
        })
      );

      const existingItems = existingItemsCheck.filter(
        ({ existingItem }) => existingItem
      );

      if (existingItems.length > 0) {
        const existingItemNames = existingItems
          .map(({ item }) => item.itemName)
          .join(", ");
        throw new Error(
          `Cannot clone: The following items already exist at destination branch: ${existingItemNames}. Use move instead to add quantities.`
        );
      }

      const clonePromises = selectedItems.map(async (item) => {
        const cloneQuantity = itemQuantities[item.id] || 0;
        const itemData = {
          userId: destinationBranch ? destinationBranch.id : userId,
          branchName: toLocation,
          itemName: item.itemName,
          amount: item.amount,
          qty: cloneQuantity,
          category: item.category || "",
          description: item.description || "",
          stockId: item.stockId || null,
          ...(item.pageRanges && { pageRanges: item.pageRanges }),
        };

        if (item.printerType === "large" && item.printerId) {
          const latestJumboCounter = await getLatestJumboCounter(
            item.printerId
          );

          if (latestJumboCounter) {
            itemData.lastFinalReadings = {
              jumboCounter: {
                start: latestJumboCounter.start || 0,
                end: latestJumboCounter.end || 0,
                sftPrinted: latestJumboCounter.sftPrinted || 0,
              },
            };
          }
        }

        await addDoc(collection(db, "stocks"), itemData);

        const currentUser = JSON.parse(localStorage.getItem("user"));
        return addDoc(collection(db, "inventoryMovements"), {
          type: "stock",
          action: "clone",
          itemName: item.itemName,
          category: item.category || "",
          quantity: cloneQuantity,
          amount: item.amount,
          fromBranch: branchName,
          toBranch: toLocation,
          movementDate: new Date(),
          performedBy: currentUser?.email || "Unknown",
          stockId: item.stockId || null,
        });
      });

      await Promise.all(clonePromises);

      const totalQuantity = Object.values(itemQuantities).reduce(
        (sum, qty) => sum + qty,
        0
      );
      showSuccess(
        `Successfully cloned ${totalQuantity} items (${selectedItems.length} types) to ${toLocation}`
      );

      handleReset();
    } catch (error) {
      showError("Failed to clone items: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedItems([]);
    setToLocation("");
    setBranchName("");
    setSelectAll(false);
    setShowQuantitySelection(false);
    setItemQuantities({});
    setSearchQuery("");
    setCurrentPage(1);
  };

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.stockId &&
          item.stockId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: "1400px", mx: "auto" }}>
      <ToastContainer />
      <Popup {...popup} />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#1e293b" }}
        >
          Stock Transfer & Clone
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Transfer or clone stock items between branches
        </Typography>
      </Box>

      {/* Branch Selection */}
      <Box sx={{ display: "flex", gap: 4, mb: 4, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <FaExchangeAlt />
            Source Branch
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Source Branch</InputLabel>
            <Select
              value={branchName}
              onChange={handleBranchChange}
              disabled={loading}
              label="Select Source Branch"
            >
              <MenuItem value="">
                <em>Select Source Branch</em>
              </MenuItem>
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.name}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <FaArrowRight />
            Destination Branch
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Select Destination Branch</InputLabel>
            <Select
              value={toLocation}
              onChange={handleDestinationBranchChange}
              disabled={loading}
              label="Select Destination Branch"
            >
              <MenuItem value="">
                <em>Select Destination Branch</em>
              </MenuItem>
              {branches
                .filter((branch) => branch.name !== branchName)
                .map((branch) => (
                  <MenuItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* No Stock Message */}
      {branchName && items.length === 0 && !showQuantitySelection && (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Stock Items Found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              The selected branch "{branchName}" doesn't have any stock items to
              move or clone.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please select a different branch or add stock items to this branch
              first.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Stock Selection */}
      {branchName && items.length > 0 && !showQuantitySelection && (
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6">
                Select Items ({selectedItems.length} selected)
              </Typography>
              {selectedItems.length > 0 && (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={proceedToQuantitySelection}
                    startIcon={<FaEdit />}
                  >
                    Set Quantities ({selectedItems.length} items)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleReset}
                    startIcon={<FaUndo />}
                  >
                    Reset Selections
                  </Button>
                </Box>
              )}
            </Box>

            {/* Search */}
            <Box sx={{ mb: 3, maxWidth: 400 }}>
              <TextField
                variant="outlined"
                placeholder="Search by item name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                  },
                }}
              />
            </Box>

            {/* Select All */}
            <Box sx={{ mb: 2 }}>
              <FormControl component="fieldset">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    color="primary"
                  />
                  <Typography variant="body1">
                    Select All Items ({filteredItems.length})
                  </Typography>
                </label>
              </FormControl>
            </Box>

            {/* Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectAll}
                        onChange={handleSelectAll}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>ITEM ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>ITEM NAME</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>CATEGORY</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>QUANTITY</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>PRICE (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.some(
                              (selected) => selected.id === item.id
                            )}
                            onChange={() => handleItemSelection(item)}
                            color="primary"
                          />
                        </TableCell>
                        <TableCell>
                          {(item.stockId || "N/A").toUpperCase()}
                        </TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.category || "N/A"}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.qty || 0}
                            color={
                              (item.qty || 0) === 0
                                ? "error"
                                : (item.qty || 0) < 5
                                ? "warning"
                                : "success"
                            }
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {item.pageRanges && item.pageRanges.length > 0
                            ? formatCurrency(item.pageRanges[0].price)
                            : formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{ textAlign: "center", py: 4 }}
                      >
                        <Typography variant="body1" color="text.secondary">
                          No items found for the selected branch or search
                          query.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {filteredItems.length > itemsPerPage && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 3,
                  gap: 1,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={previousPage}
                  disabled={currentPage === 1}
                  startIcon={<FaRegArrowAltCircleLeft />}
                >
                  Previous
                </Button>
                <Typography sx={{ alignSelf: "center", mx: 2 }}>
                  {currentPage} of {totalPages}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  endIcon={<FaRegArrowAltCircleRight />}
                >
                  Next
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quantity Selection */}
      {showQuantitySelection && selectedItems.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Set Quantities for Selected Items
            </Typography>

            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
                    <TableCell sx={{ fontWeight: "bold" }}>Item Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Available Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Move/Clone Qty
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.qty || 0}
                          color={
                            (item.qty || 0) === 0
                              ? "error"
                              : (item.qty || 0) < 5
                              ? "warning"
                              : "success"
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={itemQuantities[item.id] || ""}
                          onChange={(e) =>
                            handleQuantityChange(item.id, e.target.value)
                          }
                          disabled={loading}
                          placeholder="Enter quantity"
                          sx={{ width: 120 }}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell>₹{item.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                variant="outlined"
                onClick={() => setShowQuantitySelection(false)}
                disabled={loading}
                startIcon={<FaUndo />}
              >
                Back to Selection
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Destination Branch Selection Reminder */}
      {showQuantitySelection && !toLocation && (
        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Please select destination branch
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a destination branch above to proceed with move or clone
              operations
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {showQuantitySelection && toLocation && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
              Transfer Actions
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleMove}
                disabled={loading || selectedItems.length === 0 || !toLocation}
                startIcon={loading ? null : <MdOutlineFileDownloadDone />}
                sx={{ minWidth: 200 }}
              >
                {loading ? (
                  <>Moving...</>
                ) : (
                  <>
                    Move Items (
                    {Object.values(itemQuantities).reduce(
                      (sum, qty) => sum + (qty || 0),
                      0
                    )}{" "}
                    total)
                  </>
                )}
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleClone}
                disabled={loading || selectedItems.length === 0 || !toLocation}
                startIcon={loading ? null : <FaCopy />}
                sx={{ minWidth: 200 }}
              >
                {loading ? (
                  <>Cloning...</>
                ) : (
                  <>
                    Clone Items (
                    {Object.values(itemQuantities).reduce(
                      (sum, qty) => sum + (qty || 0),
                      0
                    )}{" "}
                    total)
                  </>
                )}
              </Button>

              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={loading}
                startIcon={<FaUndo />}
                sx={{ minWidth: 150 }}
              >
                Reset
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default MoveStock;
