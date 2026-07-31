import { useState, useEffect, useCallback, useMemo } from "react";
import { db, auth } from "../../services/authservice";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaCalendarAlt,
  FaSave,
  FaRedo,
  FaExclamationTriangle,
  FaEdit,
} from "react-icons/fa";
import "../../styles/totalAmountDisplay.css";

const TotalAmountList = () => {
  const initialRows = useMemo(
    () => [
      { itemName: "TOTAL CANON 8986", amount: 0, key: "canon8986_1" },
      { itemName: "TOTAL CANON 8986", amount: 0, key: "canon8986_2" },
      { itemName: "TOTAL CANON V700", amount: 0, key: "canonV700" },
      { itemName: "JUMBO XEROX", amount: 0, key: "jumboXerox" },
      { itemName: "ITEMS", amount: 0, key: "items" },
      { itemName: "DNP PHOTO PRINTING", amount: 0, key: "dnpPhotoPrinting" },
      { itemName: "DIGITAL BUSINESS", amount: 0, key: "digitalBusiness" },
      { itemName: "GIFT BUSINESS", amount: 0, key: "giftBusiness" },
      {
        itemName: "TOTAL BUSINESS",
        amount: 0,
        key: "totalBusiness",
        isCalculated: true,
      },
      { itemName: "DISCOUNT", amount: 0, key: "discount" },
      { itemName: "PAYTM & QR MACHINE", amount: 0, key: "paytmQr" },
      { itemName: "EXPENSE", amount: 0, key: "expense" },
      {
        itemName: "CASH AS PER ACCOUNTS",
        amount: 0,
        key: "cashAsPerAccounts",
        isCalculated: true,
      },
      { itemName: "CASH IN HAND", amount: 0, key: "cashInHand" },
    ],
    []
  );

  const [rows, setRows] = useState(initialRows);
  const [date, setDate] = useState("");
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [docId, setDocId] = useState(null);

  const calculateBusinessTotals = useCallback((currentRows) => {
    const businessComponents = [
      "canon8986_1",
      "canon8986_2",
      "canonV700",
      "jumboXerox",
      "items",
      "dnpPhotoPrinting",
      "digitalBusiness",
      "giftBusiness",
    ];

    const totalBusiness = businessComponents.reduce((sum, key) => {
      const componentRow = currentRows.find((r) => r.key === key);
      return sum + (componentRow?.amount || 0);
    }, 0);

    const deductions = ["discount", "paytmQr", "expense"].reduce((sum, key) => {
      const deductionRow = currentRows.find((r) => r.key === key);
      return sum + (deductionRow?.amount || 0);
    }, 0);

    const cashAsPerAccounts = totalBusiness - deductions;

    return currentRows.map((row) => {
      if (row.key === "totalBusiness") {
        return { ...row, amount: totalBusiness };
      } else if (row.key === "cashAsPerAccounts") {
        return { ...row, amount: Math.max(0, cashAsPerAccounts) };
      }
      return row;
    });
  }, []);

  const calculateGrandTotal = useCallback((currentRows) => {
    const totalBusinessRow = currentRows.find((r) => r.key === "totalBusiness");
    const discountRow = currentRows.find((r) => r.key === "discount");
    const expenseRow = currentRows.find((r) => r.key === "expense");

    const totalBusiness = totalBusinessRow?.amount || 0;
    const discount = discountRow?.amount || 0;
    const expense = expenseRow?.amount || 0;

    return Math.max(0, totalBusiness - discount - expense);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid);
          const userDoc = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userDoc);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setBranchName(userData.branch);
          } else {
            setError("User data not found");
            toast.error("User data not found");
          }
        } else {
          setError("User not authenticated");
          toast.error("User not authenticated");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(`Failed to fetch user data`);
        toast.error(`Failed to fetch user data`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!date || !userId || !branchName) return;

    const q = query(
      collection(db, "totalAmountReadings"),
      where("userId", "==", userId),
      where("branchName", "==", branchName),
      where("date", "==", date)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0];
        setDocId(docData.id);
        setHasExistingData(true);
        setIsEditing(false);

        const updatedRows = initialRows.map((row) => {
          const savedRow = docData.data().rows.find((r) => r.key === row.key);
          if (row.isCalculated) return row;
          return savedRow ? { ...row, amount: savedRow.amount } : row;
        });

        const calculatedRows = calculateBusinessTotals(updatedRows);
        setRows(calculatedRows);
      } else {
        setHasExistingData(false);
        setIsEditing(false);
        setRows(calculateBusinessTotals(initialRows));
      }
    });

    return () => unsubscribe();
  }, [date, userId, branchName, calculateBusinessTotals, initialRows]);

  useEffect(() => {
    const calculatedRows = calculateBusinessTotals(rows);
    if (JSON.stringify(calculatedRows) !== JSON.stringify(rows)) {
      setRows(calculatedRows);
    }
    setTotalAmount(calculateGrandTotal(calculatedRows));
  }, [rows, calculateBusinessTotals, calculateGrandTotal]);

  const handleInputChange = (key, value) => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    const rowToUpdate = rows.find((row) => row.key === key);
    if (rowToUpdate?.isCalculated) return;

    const cleanedValue = parseFloat(value) || 0;

    const updatedRows = rows.map((row) =>
      row.key === key ? { ...row, amount: cleanedValue } : row
    );

    setRows(updatedRows);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!date) {
      toast.error("Please select a date first");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error("User is not authenticated");
      return;
    }

    try {
      setIsLoading(true);

      if (hasExistingData && docId) {
        const docRef = doc(db, "totalAmountReadings", docId);
        await updateDoc(docRef, {
          rows: rows.map((row) => ({
            itemName: row.itemName,
            amount: row.amount,
            key: row.key,
            isCalculated: row.isCalculated || false,
          })),
          totalAmount,
          timestamp: new Date(),
        });
        toast.success("Amounts updated successfully");
        setIsEditing(false);
      } else {
        await addDoc(collection(db, "totalAmountReadings"), {
          userId,
          branchName,
          date,
          rows: rows.map((row) => ({
            itemName: row.itemName,
            amount: row.amount,
            key: row.key,
            isCalculated: row.isCalculated || false,
          })),
          totalAmount,
          timestamp: new Date(),
        });
        toast.success("Amounts saved successfully");
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving amounts:", error);
      toast.error(`Failed to save amounts: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRows(initialRows);
    toast.success("All amounts have been reset");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading && !branchName) {
    return (
      <div className="total-loading-container">
        <div className="total-loading-spinner"></div>
        <p>Loading branch data...</p>
      </div>
    );
  }

  if (error && !branchName) {
    return (
      <div className="total-error-container">
        <FaExclamationTriangle className="total-error-icon" />
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="total-retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="total-amount-container">
      <ToastContainer />
      <div className="total-page-header">
        <h2>Total Amount Readings for {branchName}</h2>
        <p>View and edit printer readings for selected date.</p>
      </div>

      <div className="total-date-picker-container">
        <div className="total-date-picker-wrapper">
          <label htmlFor="amount-date">Select Date</label>
          <div className="total-date-input-wrapper">
            <FaCalendarAlt className="total-date-icon" />
            <input
              id="amount-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
      </div>

      {date ? (
        hasExistingData ? (
          <div className="total-amount-card">
            <div className="total-amount-header">
              <div className="total-amount-title">
                <h3>Total Amount Readings for {date}</h3>
                <div className="total-existing-data-warning">
                  <FaExclamationTriangle />{" "}
                  {isEditing ? "Editing mode" : "Viewing mode"}
                </div>
              </div>
              <div className="total-action-buttons">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleEditToggle}
                    className="total-edit-button"
                    disabled={isLoading}
                  >
                    <FaEdit /> Edit
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="total-save-button"
                      disabled={isLoading}
                    >
                      <FaSave /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      className="total-cancel-button"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="total-reset-button"
                  disabled={isLoading || !isEditing}
                >
                  <FaRedo /> Reset
                </button>
              </div>
            </div>

            <div className="total-amount-content">
              <table className="total-amounts-table">
                <thead>
                  <tr>
                    <th className="total-item-col">Items</th>
                    <th className="total-amount-col">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index}>
                      <td className="total-item-name">{row.itemName}</td>
                      <td className="total-parent-conatiner">
                        {row.isCalculated ? (
                          <div className="total-calculated-amount">
                            {formatCurrency(row.amount)}
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(e) =>
                              handleInputChange(row.key, e.target.value)
                            }
                            className="total-amount-input"
                            disabled={!isEditing || isLoading}
                            min="0"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td className="total-grand-total-label">
                      Grand Total (After Deductions)
                    </td>
                    <td className="total-grand-total">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="total-no-data-message">
            <p>No data available for the selected date.</p>
          </div>
        )
      ) : (
        <div className="total-select-date-message">
          <p>Please select a date to view or edit total amount readings</p>
        </div>
      )}
    </div>
  );
};

export default TotalAmountList;
