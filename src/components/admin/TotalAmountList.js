// import { useState, useEffect } from "react"
// import { db } from "../../services/authservice"
// import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore"
// import { ToastContainer, toast } from "react-toastify"
// import { FaCalendarAlt, FaExclamationTriangle, FaFileDownload } from "react-icons/fa"
// import "react-toastify/dist/ReactToastify.css"
// import "../../styles/totalAmountDisplay.css"
// import DatePicker from "react-datepicker"
// import "react-datepicker/dist/react-datepicker.css"
// import jsPDF from "jspdf"
// import "jspdf-autotable"

// const formatCurrency = (amount) => {
//   amount = String(amount).replace(/[^0-9.-]+/g, "")

//   if (amount == null || isNaN(amount) || amount === "" || amount === "0") {
//     return "₹0"
//   }

//   let [integer, decimal] = Number.parseFloat(amount).toFixed(0).split(".")
//   integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

//   if (integer.length > 4 && integer.includes(",,")) {
//     integer = integer.replace(",,", ",")
//   }

//   return `₹${integer}${decimal ? "." + decimal : ""}`
// }

// const formatDateToYYYYMMDD = (date) => {
//   if (!date) return ""

//   if (typeof date === "string") {
//     return date
//   }

//   if (date instanceof Date) {
//     const year = date.getFullYear()
//     const month = String(date.getMonth() + 1).padStart(2, "0")
//     const day = String(date.getDate()).padStart(2, "0")
//     return `${year}-${month}-${day}`
//   }

//   return ""
// }

// const TotalAmountList = () => {
//   const [branches, setBranches] = useState([])
//   const [branchName, setBranchName] = useState("")
//   const [date, setDate] = useState("")
//   const [, setReadings] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [, setHasData] = useState(false)
//   const [printers, setPrinters] = useState([])
//   const [rows, setRows] = useState([])

  
//   useEffect(() => {
//     const fetchBranches = async () => {
//       try {
//         const usersCollection = collection(db, "branches")
//         const snapshot = await getDocs(usersCollection)
//         const branchNames = [...new Set(snapshot.docs.map((doc) => doc.data().name))].filter(Boolean)
//         setBranches(branchNames)
//       } catch (error) {
//         toast.error("Failed to fetch branch names: " + error.message)
//       }
//     }

//     fetchBranches()
//   }, [])

  
//   useEffect(() => {
//     if (!branchName) {
//       setPrinters([])
//       return
//     }

//     const fetchPrinters = async () => {
//       try {
//         const printersCollection = collection(db, "printers")
//         const q = query(printersCollection, where("branchName", "==", branchName))
//         const snapshot = await getDocs(q)
//         const printerList = snapshot.docs.map((doc) => ({
//           id: doc.id,
//           ...doc.data(),
//         }))
//         setPrinters(printerList)
//         console.log("Fetched printers:", printerList)
//       } catch (error) {
//         console.error("Error fetching printers:", error)
//         toast.error("Failed to fetch printers: " + error.message)
//       }
//     }

//     fetchPrinters()
//   }, [branchName])

  
//   const generateDynamicRows = () => {
//     const dynamicRows = []

    
//     printers.forEach((printer) => {
//       dynamicRows.push({
//         key: printer.id,
//         itemName: printer.name,
//         amount: 0,
//         isCalculated: true,
//         type: "printer",
//         printerId: printer.id,
//       })
//     })

    
//     dynamicRows.push({
//       key: "items",
//       itemName: "ITEMS",
//       amount: 0,
//       isCalculated: true,
//       type: "stock",
//     })

    
//     dynamicRows.push({
//       key: "jumboXerox",
//       itemName: "JUMBO XEROX",
//       amount: 0,
//       isCalculated: true,
//       type: "jumboXerox",
//     })

    
//     const otherRows = [
//       { key: "other1", itemName: "OTHER 1", amount: 0, isCalculated: false, type: "manual" },
//       { key: "other2", itemName: "OTHER 2", amount: 0, isCalculated: false, type: "manual" },
//       { key: "other3", itemName: "OTHER 3", amount: 0, isCalculated: false, type: "manual" },
//       { key: "other4", itemName: "OTHER 4", amount: 0, isCalculated: false, type: "manual" },
//       { key: "other5", itemName: "OTHER 5", amount: 0, isCalculated: false, type: "manual" },
//       { key: "deduction1", itemName: "DEDUCTION 1", amount: 0, isCalculated: false, type: "deduction" },
//       { key: "deduction2", itemName: "DEDUCTION 2", amount: 0, isCalculated: false, type: "deduction" },
//       { key: "deduction3", itemName: "DEDUCTION 3", amount: 0, isCalculated: false, type: "deduction" },
//     ]

//     dynamicRows.push(...otherRows)
//     return dynamicRows
//   }

  
//   useEffect(() => {
//     if (!branchName || !date || printers.length === 0) {
//       const dynamicRows = generateDynamicRows()
//       setRows(dynamicRows)
//       return
//     }

//     const loadAutoData = async () => {
//       try {
//         const dateString = formatDateToYYYYMMDD(date)
//         console.log("Auto-loading data for date:", dateString, "branch:", branchName)

//         const dynamicRows = generateDynamicRows()

        
//         for (const row of dynamicRows) {
//           if (row.type === "printer") {
//             try {
//               const printerReadingsQuery = query(
//                 collection(db, "printerReadings"),
//                 where("printerId", "==", row.printerId),
//                 where("date", "==", dateString),
//               )
//               const printerSnapshot = await getDocs(printerReadingsQuery)

//               if (!printerSnapshot.empty) {
//                 const printerData = printerSnapshot.docs[0].data()
//                 let total = 0

//                 if (printerData.readings) {
//                   printerData.readings.forEach((reading) => {
//                     const qty = Number.parseInt(reading.qty) || 0
//                     const price = Number.parseFloat(reading.price) || 0
//                     total += qty * price
//                   })
//                 }

//                 row.amount = total
//                 console.log(`Auto-loaded ${row.itemName}:`, total)
//               }
//             } catch (error) {
//               console.error(`Error loading data for printer ${row.itemName}:`, error)
//             }
//           }

          
//           if (row.type === "stock") {
//             try {
//               const stockQuery = query(
//                 collection(db, "stockReadings"),
//                 where("branchName", "==", branchName),
//                 where("date", "==", dateString),
//               )
//               const stockSnapshot = await getDocs(stockQuery)

//               if (!stockSnapshot.empty) {
//                 const stockData = stockSnapshot.docs[0].data()
//                 row.amount = stockData.totalAmount || 0
//                 console.log("Auto-loaded ITEMS:", stockData.totalAmount || 0)
//               }
//             } catch (error) {
//               console.error("Error loading stock data:", error)
//             }
//           }

          
//           if (row.type === "jumboXerox") {
//             try {
//               const jumboQuery = query(
//                 collection(db, "jumboXeroxReadings"),
//                 where("branchName", "==", branchName),
//                 where("date", "==", dateString),
//               )
//               const jumboSnapshot = await getDocs(jumboQuery)

//               if (!jumboSnapshot.empty) {
//                 const jumboData = jumboSnapshot.docs[0].data()
//                 let jumboTotal = 0

//                 if (jumboData.readings) {
//                   jumboData.readings.forEach((reading) => {
//                     const qty = Number.parseInt(reading.qty) || 0
//                     const unitPrice = Number.parseFloat(reading.unitPrice) || 0
//                     jumboTotal += qty * unitPrice
//                   })
//                 }

//                 row.amount = jumboTotal
//                 console.log("Auto-loaded JUMBO XEROX:", jumboTotal)
//               }
//             } catch (error) {
//               console.error("Error loading jumbo xerox data:", error)
//             }
//           }
//         }

//         setRows(dynamicRows)
//         console.log("All auto-loaded rows:", dynamicRows)
//       } catch (error) {
//         console.error("Error in auto-loading data:", error)
//         const dynamicRows = generateDynamicRows()
//         setRows(dynamicRows)
//       }
//     }

//     loadAutoData()
//   }, [branchName, date, printers])

  
//   useEffect(() => {
//     if (!date || !branchName) {
//       setReadings([])
//       setHasData(false)
//       return
//     }

//     setLoading(true)

//     const dateString = formatDateToYYYYMMDD(date)
//     console.log("Fetching total amount data for date:", dateString, "branch:", branchName)

//     const q = query(
//       collection(db, "totalAmountReadings"),
//       where("branchName", "==", branchName),
//       where("date", "==", dateString),
//     )

//     const unsubscribe = onSnapshot(
//       q,
//       (querySnapshot) => {
//         console.log("Query result:", querySnapshot.size, "documents")
//         if (!querySnapshot.empty) {
//           const readingsData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
//           console.log("Readings data:", readingsData)

          
//           const savedData = readingsData[0]
//           if (savedData.rows) {
//             const updatedRows = rows.map((row) => {
//               const savedRow = savedData.rows.find((r) => r.key === row.key)
//               if (savedRow && !row.isCalculated) {
//                 return { ...row, amount: savedRow.amount }
//               }
//               return row
//             })
//             setRows(updatedRows)
//           }

//           setReadings(readingsData)
//           setHasData(true)
//           toast.success("Total amount data loaded successfully")
//         } else {
//           setReadings([])
//           setHasData(false)
//           toast.info("No data found for the selected branch and date.")
//         }
//         setLoading(false)
//       },
//       (error) => {
//         console.error("Error fetching readings:", error)
//         toast.error("Failed to fetch readings: " + error.message)
//         setLoading(false)
//       },
//     )

//     return () => unsubscribe()
//   }, [date, branchName])

//   const handleDateChange = (selectedDate) => {
//     console.log("Date selected:", selectedDate)
//     setDate(selectedDate)
//   }

//   const calculateTotalAmount = () => {
//     return rows.reduce((total, row) => {
//       const amount = Number.parseFloat(String(row.amount).replace(/[^0-9.-]+/g, "")) || 0
//       if (row.type === "deduction") {
//         return total - amount
//       }
//       return total + amount
//     }, 0)
//   }

//   const generatePDF = () => {
//     if (!date || !branchName || rows.length === 0) {
//       toast.error("Please select a branch and date with available data first")
//       return
//     }

//     try {
//       const pdf = new jsPDF("p", "mm", "a4")
//       const pageWidth = pdf.internal.pageSize.width
//       let yPos = 15

//       pdf.setFontSize(18)
//       pdf.setFont("helvetica", "bold")
//       pdf.setTextColor(30, 58, 138)
//       pdf.text(branchName, pageWidth / 2, yPos, { align: "center" })
//       yPos += 8

//       pdf.setFontSize(12)
//       pdf.setFont("helvetica", "normal")
//       pdf.setTextColor(100, 116, 139)
//       const displayDate = date instanceof Date ? date.toLocaleDateString() : new Date(date).toLocaleDateString()
//       pdf.text(`Date: ${displayDate}`, pageWidth / 2, yPos, { align: "center" })
//       yPos += 15

//       pdf.setFontSize(14)
//       pdf.setFont("helvetica", "bold")
//       pdf.setTextColor(30, 58, 138)
//       pdf.text("TOTAL AMOUNT READINGS", pageWidth / 2, yPos, { align: "center" })
//       yPos += 15

//       const totalAmountData = rows
//         .filter(
//           (row) => row.amount !== 0 || row.type === "printer" || row.type === "stock" || row.type === "jumboXerox",
//         )
//         .map((row) => {
//           const amount = Number(row.amount) || 0
//           const displayAmount =
//             row.type === "deduction" ? `-Rs.${Math.abs(amount).toFixed(2)}` : `Rs.${amount.toFixed(2)}`
//           return [row.itemName, displayAmount]
//         })

//       const grandTotal = calculateTotalAmount()
//       totalAmountData.push(["GRAND TOTAL (AFTER DEDUCTIONS)", `Rs.${grandTotal.toFixed(2)}`])

//       pdf.autoTable({
//         head: [["Item Name", "Amount"]],
//         body: totalAmountData,
//         startY: yPos,
//         theme: "grid",
//         headStyles: {
//           fillColor: [30, 58, 138],
//           textColor: 255,
//           fontSize: 10,
//           fontStyle: "bold",
//           halign: "center",
//         },
//         styles: {
//           fontSize: 9,
//           cellPadding: 3,
//           textColor: [51, 51, 51],
//         },
//         columnStyles: {
//           0: { fontStyle: "bold" },
//           1: { halign: "right" },
//         },
//         didParseCell: (data) => {
//           if (data.row.index === totalAmountData.length - 1) {
//             data.cell.styles.fillColor = [30, 58, 138]
//             data.cell.styles.textColor = [255, 255, 255]
//             data.cell.styles.fontStyle = "bold"
//           }
//         },
//       })

//       const dateString = formatDateToYYYYMMDD(date)
//       const formattedDate = dateString.split("-").reverse().join("-")
//       pdf.save(`TotalAmount_${branchName}_${formattedDate}.pdf`)

//       toast.success("PDF generated successfully")
//     } catch (error) {
//       console.error("Error generating PDF:", error)
//       toast.error("Failed to generate PDF: " + error.message)
//     }
//   }

//   if (loading) {
//     return (
//       <div className="total-loading-container">
//         <div className="total-loading-spinner"></div>
//         <p>Loading total amount data...</p>
//       </div>
//     )
//   }

//   return (
//     <div className="total-amount-container">
//       <ToastContainer />
//       <div className="total-page-header">
//         <h2>Total Amount Revenue Data</h2>
//         <p>View total amount readings for all branches (Read Only).</p>
//       </div>

//       <div className="total-date-picker-container">
//         <div className="total-date-picker-wrapper">
//           <label htmlFor="branch-select">Branch Name</label>
//           <select
//             id="branch-select"
//             value={branchName}
//             onChange={(e) => setBranchName(e.target.value)}
//             className="total-amount-input"
//           >
//             <option value="">Select Branch</option>
//             {branches.map((branch, index) => (
//               <option key={index} value={branch}>
//                 {branch}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div className="total-date-picker-wrapper">
//           <label htmlFor="date-select">Date</label>
//           <div className="total-date-input-wrapper">
//             <FaCalendarAlt className="total-date-icon" />
//             <DatePicker
//               id="date-select"
//               selected={typeof date === "string" ? (date ? new Date(date) : null) : date}
//               onChange={handleDateChange}
//               dateFormat="yyyy-MM-dd"
//               required
//               className="total-amount-input"
//             />
//           </div>
//         </div>
//         {date && branchName && rows.length > 0 && (
//           <button onClick={generatePDF} className="printer-download-button">
//             <FaFileDownload /> Download PDF
//           </button>
//         )}
//       </div>

//       {date && branchName ? (
//         rows.length > 0 ? (
//           <div className="total-amount-card">
//             <div className="total-amount-header">
//               <div className="total-amount-title">
//                 <h3>
//                   Branch: {branchName}, Date:{" "}
//                   {date instanceof Date ? date.toLocaleDateString() : new Date(date).toLocaleDateString()} (View Only)
//                 </h3>
//               </div>
//             </div>
//             <div className="total-amount-content">
//               <table className="total-amounts-table">
//                 <thead>
//                   <tr>
//                     <th className="total-item-col">Items</th>
//                     <th className="total-amount-col">Total Amount(₹)</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {rows
//                     .filter(
//                       (row) =>
//                         row.amount !== 0 || row.type === "printer" || row.type === "stock" || row.type === "jumboXerox",
//                     )
//                     .map((row, rowIndex) => (
//                       <tr key={rowIndex}>
//                         <td className="total-item-name">{row.itemName}</td>
//                         <td className="total-parent-conatiner">
//                           <div className={`total-calculated-amount ${row.type === "deduction" ? "deduction" : ""}`}>
//                             {row.type === "deduction" && row.amount > 0 ? "-" : ""}
//                             {formatCurrency(Math.abs(row.amount))}
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//                 </tbody>
//                 <tfoot>
//                   <tr className="total-row">
//                     <td className="total-grand-total-label">Grand Total</td>
//                     <td className="total-grand-total">{formatCurrency(calculateTotalAmount())}</td>
//                   </tr>
//                 </tfoot>
//               </table>
//             </div>
//           </div>
//         ) : (
//           <div className="total-select-date-message">
//             <FaExclamationTriangle style={{ fontSize: "2rem", color: "#64748b", marginBottom: "1rem" }} />
//             <p>No data available for the selected branch and date.</p>
//           </div>
//         )
//       ) : (
//         <div className="total-select-date-message">
//           <p>Please select a branch and date to view total amount data</p>
//         </div>
//       )}
//     </div>
//   )
// }

// export default TotalAmountList


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