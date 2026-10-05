import React, { useState, useEffect } from "react";
import api from "../../services/api";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  FileSpreadsheet,
  FileText,
  Building2,
  Calendar,
  Filter,
  TrendingUp,
  Receipt,
  Search,
  X,
  CreditCard,
  Wallet,
  Percent,
  CheckCircle2,
  AlertCircle,
  Calculator,
} from "lucide-react";
import "../../styles/printzTheme.css";
import "../../styles/addAssets.css";
import BranchSelect from "../common/BranchSelect.jsx";
import Popup from "../common/Popup.jsx";
import { usePopup } from "../../hooks/usePopup";

const ExportData = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [data, setData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingType, setExportingType] = useState(null); // 'csv' | 'xlsx' | 'pdf' | null
  const [totals, setTotals] = useState({});
  const [readingSearch, setReadingSearch] = useState("");

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = ["2023", "2024", "2025", "2026", "2027"];

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchData();
      fetchExpenseData();
    } else {
      setData([]);
      setExpenseData([]);
      setTotals({});
    }
  }, [selectedBranch, selectedMonth, selectedYear]);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/branches");
      const branchList = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const formatted = branchList.map((b) => ({
        id: b.id || b._id,
        name: b.name || b.branchName,
      }));
      setBranches(formatted.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching branches:", error);
      showError("Failed to load branch data. Please refresh and try again.");
    }
  };

  const fetchExpenseData = async () => {
    // Obsolete /expenses endpoint was removed from backend
    setExpenseData([]);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthNumber = months.indexOf(selectedMonth) + 1;
      const monthString = monthNumber.toString().padStart(2, "0");
      const startDate = `${selectedYear}-${monthString}-01`;
      const endDate = `${selectedYear}-${monthString}-31`;

      const res = await api.get("/total-amounts", {
        params: {
          branchName: selectedBranch || undefined,
        },
      });
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const fetchedData = [];

      records.forEach((docData) => {
        if (selectedBranch && docData.branchName !== selectedBranch) return;
        if (selectedMonth && selectedYear) {
          if (!docData.date || docData.date < startDate || docData.date > endDate) return;
        }
        const processedData = processDocumentData(docData);
        fetchedData.push(processedData);
      });

      fetchedData.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      setData(fetchedData);
      calculateTotals(fetchedData, expenseData);
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("Failed to load financial data. Please check your filters.");
    } finally {
      setLoading(false);
    }
  };

  const processDocumentData = (docData) => {
    const rows = docData.rows || [];
    const previousBalanceRows = docData.previousBalanceRows || [];

    const getValueByKey = (key) => {
      const row = rows.find((r) => r.key === key);
      return row ? row.amount : 0;
    };

    const totalBusiness = getValueByKey("totalBusiness");
    const discount = getValueByKey("discount");
    const upiCard =
      getValueByKey("upiCardPayments") + getValueByKey("bankTransfers");
    const cashAsPerAccounts = getValueByKey("cashAsPerAccounts");
    const cashInHand = getValueByKey("cashInHand");
    const paymentToBeCollected = getValueByKey("paymentToBeCollected");

    const previousBalance =
      previousBalanceRows.length > 0 ? previousBalanceRows[0] : {};

    return {
      branchName: docData.branchName || selectedBranch || "",
      date: docData.date || "",
      totalBusiness: totalBusiness || 0,
      discount: discount || 0,
      upiCard: upiCard || 0,
      cashAsPerAccounts: cashAsPerAccounts || 0,
      cashInHand: cashInHand || 0,
      balance: paymentToBeCollected || 0,
      clearBalance: previousBalance.availableBalance || 0,
      clearDate: previousBalance.date || "",
    };
  };

  const calculateTotals = (readings, expenses = expenseData) => {
    const newTotals = readings.reduce(
      (acc, item) => ({
        totalBusiness: (acc.totalBusiness || 0) + item.totalBusiness,
        discount: (acc.discount || 0) + item.discount,
        upiCard: (acc.upiCard || 0) + item.upiCard,
        cashAsPerAccounts:
          (acc.cashAsPerAccounts || 0) + item.cashAsPerAccounts,
        cashInHand: (acc.cashInHand || 0) + item.cashInHand,
        balance: (acc.balance || 0) + item.balance,
        clearBalance: (acc.clearBalance || 0) + item.clearBalance,
      }),
      {}
    );

    newTotals.balanceAmount =
      (newTotals.balance || 0) - (newTotals.clearBalance || 0);

    newTotals.totalExpenses = (expenses || []).reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0
    );

    setTotals(newTotals);
  };

  // Helper to get data for export (works whether pre-loaded or exporting all branches on-demand)
  const getExportDataset = async (type) => {
    setExportingType(type);
    try {
      if (data.length > 0) {
        return {
          exportReadings: data,
          exportExpenses: expenseData,
          exportTotals: totals,
          isAllBranches: !selectedBranch,
        };
      }

      let startDate = null;
      let endDate = null;
      let monthString = null;

      if (selectedMonth && selectedYear) {
        const monthNumber = months.indexOf(selectedMonth) + 1;
        monthString = monthNumber.toString().padStart(2, "0");
        startDate = `${selectedYear}-${monthString}-01`;
        endDate = `${selectedYear}-${monthString}-31`;
      }

      // 1. Fetch readings
      const resReadings = await api.get("/total-amounts", {
        params: { branchName: selectedBranch || undefined },
      });
      const records = resReadings.data?.data || (Array.isArray(resReadings.data) ? resReadings.data : []);
      let exportReadings = [];
      records.forEach((docData) => {
        if (selectedBranch && docData.branchName !== selectedBranch) return;
        if (startDate && endDate) {
          if (!docData.date || docData.date < startDate || docData.date > endDate) return;
        }
        exportReadings.push(processDocumentData(docData));
      });
      exportReadings.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      // 2. Fetch expenses
      const resExpenses = await api.get("/expenses", {
        params: { branchName: selectedBranch || undefined },
      });
      const expenseRecords = resExpenses.data?.data || (Array.isArray(resExpenses.data) ? resExpenses.data : []);
      let exportExpenses = [];
      expenseRecords.forEach((docData) => {
        if (selectedBranch && (docData.branchName || docData.branch) !== selectedBranch) return;
        if (monthString && docData.month && String(docData.month).padStart(2, "0") !== monthString) return;
        if (selectedYear && docData.year && String(docData.year) !== selectedYear) return;

        const bName = docData.branchName || docData.branch || selectedBranch || "All Branches";
        if (docData.expenses && Array.isArray(docData.expenses)) {
          docData.expenses.forEach((exp) => {
            exportExpenses.push({
              ...exp,
              branchName: exp.branchName || bName,
            });
          });
        } else if (docData.amount) {
          exportExpenses.push({
            ...docData,
            branchName: docData.branchName || bName,
          });
        }
      });

      const calcTotals = exportReadings.reduce(
        (acc, item) => ({
          totalBusiness: (acc.totalBusiness || 0) + item.totalBusiness,
          discount: (acc.discount || 0) + item.discount,
          upiCard: (acc.upiCard || 0) + item.upiCard,
          cashAsPerAccounts: (acc.cashAsPerAccounts || 0) + item.cashAsPerAccounts,
          cashInHand: (acc.cashInHand || 0) + item.cashInHand,
          balance: (acc.balance || 0) + item.balance,
          clearBalance: (acc.clearBalance || 0) + item.clearBalance,
        }),
        {}
      );
      calcTotals.balanceAmount = (calcTotals.balance || 0) - (calcTotals.clearBalance || 0);
      calcTotals.totalExpenses = exportExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

      return {
        exportReadings,
        exportExpenses,
        exportTotals: calcTotals,
        isAllBranches: !selectedBranch,
      };
    } catch (err) {
      console.error("Error fetching export dataset:", err);
      showError("Failed to fetch financial data for export.");
      return null;
    } finally {
      setExportingType(null);
    }
  };

  const exportToCSV = async () => {
    try {
      const dataset = await getExportDataset("csv");
      if (!dataset || dataset.exportReadings.length === 0) {
        showInfo("No financial readings found to export.");
        return;
      }

      const { exportReadings, exportExpenses, exportTotals, isAllBranches } = dataset;
      const csvRows = [];

      // Financial header row
      if (isAllBranches) {
        csvRows.push([
          "Branch",
          "Date",
          "Clear Date",
          "Total Business",
          "Discount",
          "UPI & Card",
          "Cash as per Accounts",
          "Cash in Hand",
          "Balance",
          "Clear Balance",
          "Balance Amount",
        ]);

        exportReadings.forEach((item) => {
          csvRows.push([
            item.branchName || "—",
            item.date,
            item.clearDate || "",
            item.totalBusiness,
            item.discount,
            item.upiCard,
            item.cashAsPerAccounts,
            item.cashInHand,
            item.balance,
            item.clearBalance,
            item.balance - item.clearBalance,
          ]);
        });

        // Totals row
        csvRows.push([
          "TOTAL",
          "",
          "",
          exportTotals.totalBusiness || 0,
          exportTotals.discount || 0,
          exportTotals.upiCard || 0,
          exportTotals.cashAsPerAccounts || 0,
          exportTotals.cashInHand || 0,
          exportTotals.balance || 0,
          exportTotals.clearBalance || 0,
          exportTotals.balanceAmount || 0,
        ]);
      } else {
        csvRows.push([
          "Date",
          "Clear Date",
          "Total Business",
          "Discount",
          "UPI & Card",
          "Cash as per Accounts",
          "Cash in Hand",
          "Balance",
          "Clear Balance",
          "Balance Amount",
        ]);

        exportReadings.forEach((item) => {
          csvRows.push([
            item.date,
            item.clearDate || "",
            item.totalBusiness,
            item.discount,
            item.upiCard,
            item.cashAsPerAccounts,
            item.cashInHand,
            item.balance,
            item.clearBalance,
            item.balance - item.clearBalance,
          ]);
        });

        // Totals row
        csvRows.push([
          "TOTAL",
          "",
          exportTotals.totalBusiness || 0,
          exportTotals.discount || 0,
          exportTotals.upiCard || 0,
          exportTotals.cashAsPerAccounts || 0,
          exportTotals.cashInHand || 0,
          exportTotals.balance || 0,
          exportTotals.clearBalance || 0,
          exportTotals.balanceAmount || 0,
        ]);
      }

      // Expenses section
      if (exportExpenses.length > 0) {
        csvRows.push([]);
        csvRows.push([isAllBranches ? "EXPENSES (ALL BRANCHES)" : "EXPENSES"]);
        csvRows.push(
          isAllBranches
            ? ["Branch", "Date", "Description", "Amount"]
            : ["Date", "Description", "Amount"]
        );
        exportExpenses.forEach((expense) => {
          if (isAllBranches) {
            csvRows.push([
              expense.branchName || "—",
              expense.date || "",
              expense.description || expense.name || "",
              expense.amount || 0,
            ]);
          } else {
            csvRows.push([
              expense.date || "",
              expense.description || expense.name || "",
              expense.amount || 0,
            ]);
          }
        });
        csvRows.push([]);
        csvRows.push(
          isAllBranches
            ? ["TOTAL EXPENSES", "", "", exportTotals.totalExpenses || 0]
            : ["TOTAL EXPENSES", "", exportTotals.totalExpenses || 0]
        );
      }

      const csv = Papa.unparse(csvRows, { header: false });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);

      const filename = selectedBranch
        ? `${selectedBranch}_${selectedMonth || "AllMonths"}_${selectedYear || "AllYears"}_report.csv`
        : `All_Branches_${selectedMonth || "AllMonths"}_${selectedYear || "AllYears"}_report.csv`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess(`CSV report (${selectedBranch || "All Branches"}) exported successfully.`);
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      showError("Failed to export CSV report.");
    }
  };

  const exportToXLSX = async () => {
    try {
      const dataset = await getExportDataset("xlsx");
      if (!dataset || dataset.exportReadings.length === 0) {
        showInfo("No financial readings found to export.");
        return;
      }

      const { exportReadings, exportExpenses, exportTotals, isAllBranches } = dataset;
      const wb = XLSX.utils.book_new();

      if (isAllBranches) {
        // Master Sheet: All Branches
        const allSheetData = exportReadings.map((item) => ({
          Branch: item.branchName || "—",
          Date: item.date,
          "Clear Date": item.clearDate || "",
          "Total Business": item.totalBusiness,
          Discount: item.discount,
          "UPI & Card": item.upiCard,
          "Cash as per Accounts": item.cashAsPerAccounts,
          "Cash in Hand": item.cashInHand,
          Balance: item.balance,
          "Clear Balance": item.clearBalance,
          "Balance Amount": item.balance - item.clearBalance,
        }));

        allSheetData.push({
          Branch: "TOTAL",
          Date: "",
          "Clear Date": "",
          "Total Business": exportTotals.totalBusiness || 0,
          Discount: exportTotals.discount || 0,
          "UPI & Card": exportTotals.upiCard || 0,
          "Cash as per Accounts": exportTotals.cashAsPerAccounts || 0,
          "Cash in Hand": exportTotals.cashInHand || 0,
          Balance: exportTotals.balance || 0,
          "Clear Balance": exportTotals.clearBalance || 0,
          "Balance Amount": exportTotals.balanceAmount || 0,
        });

        const wsAll = XLSX.utils.json_to_sheet(allSheetData);
        XLSX.utils.book_append_sheet(wb, wsAll, "All Branches");

        // Separate sheet for each branch
        const branchGroups = {};
        exportReadings.forEach((item) => {
          const bName = item.branchName || "Other";
          if (!branchGroups[bName]) branchGroups[bName] = [];
          branchGroups[bName].push(item);
        });

        Object.keys(branchGroups).forEach((bName) => {
          const bData = branchGroups[bName].map((item) => ({
            Date: item.date,
            "Clear Date": item.clearDate || "",
            "Total Business": item.totalBusiness,
            Discount: item.discount,
            "UPI & Card": item.upiCard,
            "Cash as per Accounts": item.cashAsPerAccounts,
            "Cash in Hand": item.cashInHand,
            Balance: item.balance,
            "Clear Balance": item.clearBalance,
            "Balance Amount": item.balance - item.clearBalance,
          }));

          const bTotals = branchGroups[bName].reduce(
            (acc, item) => ({
              totalBusiness: (acc.totalBusiness || 0) + item.totalBusiness,
              discount: (acc.discount || 0) + item.discount,
              upiCard: (acc.upiCard || 0) + item.upiCard,
              cashAsPerAccounts: (acc.cashAsPerAccounts || 0) + item.cashAsPerAccounts,
              cashInHand: (acc.cashInHand || 0) + item.cashInHand,
              balance: (acc.balance || 0) + item.balance,
              clearBalance: (acc.clearBalance || 0) + item.clearBalance,
            }),
            {}
          );

          bData.push({
            Date: "TOTAL",
            "Clear Date": "",
            "Total Business": bTotals.totalBusiness || 0,
            Discount: bTotals.discount || 0,
            "UPI & Card": bTotals.upiCard || 0,
            "Cash as per Accounts": bTotals.cashAsPerAccounts || 0,
            "Cash in Hand": bTotals.cashInHand || 0,
            Balance: bTotals.balance || 0,
            "Clear Balance": bTotals.clearBalance || 0,
            "Balance Amount": (bTotals.balance || 0) - (bTotals.clearBalance || 0),
          });

          const cleanSheetName = bName.substring(0, 31).replace(/[:\/\\?*\[\]]/g, "-");
          const wsBranch = XLSX.utils.json_to_sheet(bData);
          XLSX.utils.book_append_sheet(wb, wsBranch, cleanSheetName);
        });

        if (exportExpenses.length > 0) {
          const expenseSheetData = exportExpenses.map((item) => ({
            Branch: item.branchName || "—",
            Date: item.date || "",
            Description: item.description || item.name || "",
            "Amount (₹)": item.amount || 0,
          }));
          expenseSheetData.push({
            Branch: "TOTAL EXPENSES",
            Date: "",
            Description: "",
            "Amount (₹)": exportTotals.totalExpenses || 0,
          });
          const wsExpenses = XLSX.utils.json_to_sheet(expenseSheetData);
          XLSX.utils.book_append_sheet(wb, wsExpenses, "Monthly Expenses");
        }
      } else {
        const xlsxData = exportReadings.map((item) => ({
          Date: item.date,
          "Clear Date": item.clearDate || "",
          "Total Business": item.totalBusiness,
          Discount: item.discount,
          "UPI & Card": item.upiCard,
          "Cash as per Accounts": item.cashAsPerAccounts,
          "Cash in Hand": item.cashInHand,
          Balance: item.balance,
          "Clear Balance": item.clearBalance,
          "Balance Amount": item.balance - item.clearBalance,
        }));

        xlsxData.push({
          Date: "TOTAL",
          "Clear Date": "",
          "Total Business": exportTotals.totalBusiness || 0,
          Discount: exportTotals.discount || 0,
          "UPI & Card": exportTotals.upiCard || 0,
          "Cash as per Accounts": exportTotals.cashAsPerAccounts || 0,
          "Cash in Hand": exportTotals.cashInHand || 0,
          Balance: exportTotals.balance || 0,
          "Clear Balance": exportTotals.clearBalance || 0,
          "Balance Amount": exportTotals.balanceAmount || 0,
        });

        const ws = XLSX.utils.json_to_sheet(xlsxData);
        XLSX.utils.book_append_sheet(wb, ws, "Financial Report");

        if (exportExpenses.length > 0) {
          const expenseSheetData = exportExpenses.map((item) => ({
            Date: item.date || "",
            Description: item.description || item.name || "",
            "Amount (₹)": item.amount || 0,
          }));
          expenseSheetData.push({
            Date: "TOTAL EXPENSES",
            Description: "",
            "Amount (₹)": exportTotals.totalExpenses || 0,
          });
          const wsExpenses = XLSX.utils.json_to_sheet(expenseSheetData);
          XLSX.utils.book_append_sheet(wb, wsExpenses, "Monthly Expenses");
        }
      }

      const filename = selectedBranch
        ? `${selectedBranch}_${selectedMonth || "AllMonths"}_${selectedYear || "AllYears"}_report.xlsx`
        : `All_Branches_${selectedMonth || "AllMonths"}_${selectedYear || "AllYears"}_report.xlsx`;

      XLSX.writeFile(wb, filename);
      showSuccess(`Excel spreadsheet (${selectedBranch || "All Branches"}) exported successfully.`);
    } catch (error) {
      console.error("Error exporting to XLSX:", error);
      showError("Failed to export Excel report.");
    }
  };

  const exportToPDF = async () => {
    try {
      const dataset = await getExportDataset("pdf");
      if (!dataset || dataset.exportReadings.length === 0) {
        showInfo("No financial readings found to export.");
        return;
      }

      const { exportReadings, exportExpenses, exportTotals, isAllBranches } = dataset;
      const doc = new jsPDF("l", "pt");
      const title = isAllBranches
        ? `All Branches - Financial Report (${selectedMonth ? `${selectedMonth} ${selectedYear}` : "All Records"})`
        : `${selectedBranch} - Financial Report (${selectedMonth} ${selectedYear})`;

      doc.setFontSize(16);
      doc.text(title, 40, 40);

      let head;
      let tableData;

      if (isAllBranches) {
        head = [
          [
            "Branch",
            "Date",
            "Clear Date",
            "Total Business",
            "Discount",
            "UPI & Card",
            "Cash Accounts",
            "Cash in Hand",
            "Balance",
            "Clear Balance",
            "Balance Amount",
          ],
        ];

        tableData = exportReadings.map((item) => [
          item.branchName || "—",
          item.date,
          item.clearDate || "",
          `₹${item.totalBusiness.toLocaleString("en-IN")}`,
          `₹${item.discount.toLocaleString("en-IN")}`,
          `₹${item.upiCard.toLocaleString("en-IN")}`,
          `₹${item.cashAsPerAccounts.toLocaleString("en-IN")}`,
          `₹${item.cashInHand.toLocaleString("en-IN")}`,
          `₹${item.balance.toLocaleString("en-IN")}`,
          `₹${item.clearBalance.toLocaleString("en-IN")}`,
          `₹${(item.balance - item.clearBalance).toLocaleString("en-IN")}`,
        ]);

        tableData.push([
          "TOTAL",
          "",
          "",
          `₹${(exportTotals.totalBusiness || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.discount || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.upiCard || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.cashAsPerAccounts || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.cashInHand || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.balance || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.clearBalance || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.balanceAmount || 0).toLocaleString("en-IN")}`,
        ]);
      } else {
        head = [
          [
            "Date",
            "Clear Date",
            "Total Business",
            "Discount",
            "UPI & Card",
            "Cash Accounts",
            "Cash in Hand",
            "Balance",
            "Clear Balance",
            "Balance Amount",
          ],
        ];

        tableData = exportReadings.map((item) => [
          item.date,
          item.clearDate || "",
          `₹${item.totalBusiness.toLocaleString("en-IN")}`,
          `₹${item.discount.toLocaleString("en-IN")}`,
          `₹${item.upiCard.toLocaleString("en-IN")}`,
          `₹${item.cashAsPerAccounts.toLocaleString("en-IN")}`,
          `₹${item.cashInHand.toLocaleString("en-IN")}`,
          `₹${item.balance.toLocaleString("en-IN")}`,
          `₹${item.clearBalance.toLocaleString("en-IN")}`,
          `₹${(item.balance - item.clearBalance).toLocaleString("en-IN")}`,
        ]);

        tableData.push([
          "TOTAL",
          "",
          `₹${(exportTotals.totalBusiness || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.discount || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.upiCard || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.cashAsPerAccounts || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.cashInHand || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.balance || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.clearBalance || 0).toLocaleString("en-IN")}`,
          `₹${(exportTotals.balanceAmount || 0).toLocaleString("en-IN")}`,
        ]);
      }

      doc.autoTable({
        startY: 60,
        head,
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 7 },
      });

      if (exportExpenses.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text(
          isAllBranches
            ? `All Branches - Monthly Expenses (${selectedMonth ? `${selectedMonth} ${selectedYear}` : "All Records"})`
            : `${selectedBranch} - Monthly Expenses (${selectedMonth} ${selectedYear})`,
          40,
          40
        );

        const expenseTableData = exportExpenses.map((item) => (
          isAllBranches
            ? [
                item.branchName || "—",
                item.date || "",
                item.description || item.name || "",
                `₹${Number(item.amount || 0).toLocaleString("en-IN")}`,
              ]
            : [
                item.date || "",
                item.description || item.name || "",
                `₹${Number(item.amount || 0).toLocaleString("en-IN")}`,
              ]
        ));

        expenseTableData.push(
          isAllBranches
            ? [
                "TOTAL EXPENSES",
                "",
                "",
                `₹${(exportTotals.totalExpenses || 0).toLocaleString("en-IN")}`,
              ]
            : [
                "TOTAL EXPENSES",
                "",
                `₹${(exportTotals.totalExpenses || 0).toLocaleString("en-IN")}`,
              ]
        );

        doc.autoTable({
          startY: 60,
          head: [
            isAllBranches
              ? ["Branch", "Date", "Description", "Amount"]
              : ["Date", "Description", "Amount"],
          ],
          body: expenseTableData,
          theme: "grid",
          headStyles: { fillColor: [5, 150, 105] },
          styles: { fontSize: 8.5 },
        });
      }

      const filename = selectedBranch
        ? `${selectedBranch}_${selectedMonth || "AllMonths"}_${selectedYear || "AllYears"}_report.pdf`
        : `All_Branches_${selectedMonth || "AllMonths"}_${selectedYear || "AllYears"}_report.pdf`;

      doc.save(filename);
      showSuccess(`PDF report (${selectedBranch || "All Branches"}) generated and downloaded.`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      showError("Failed to generate PDF document.");
    }
  };

  return (
    <div className="add-assets-page-container">
      <Popup {...popup} />

      {/* Header Banner - Clean emerald design */}
      <div
        className="printz-header-banner-full"
        style={{
          width: "100%",
          background:
            "linear-gradient(90deg, #E8FAF2 0%, #F0FFF9 50%, #E8FAF2 100%)",
          border: "1px solid #dcfce7",
          borderRadius: "16px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 2px 10px rgba(4, 120, 87, 0.04)",
          boxSizing: "border-box",
          flexWrap: "wrap",
        }}
      >
        <div className="printz-header-title-area" style={{ flexShrink: 0 }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Export Financial{" "}
            <span className="highlight" style={{ color: "#059669" }}>
              Data
            </span>
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
            Generate, analyze, and export monthly branch financial readings to CSV, Excel, or PDF.
          </p>
        </div>

        {/* Action Export Buttons - Always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={exportToCSV}
            disabled={!!exportingType}
            className="printz-btn-primary"
            style={{
              padding: "8px 14px",
              fontSize: "12.5px",
              borderRadius: "8px",
              background: "#059669",
              opacity: exportingType === "csv" ? 0.8 : exportingType ? 0.6 : 1,
              cursor: exportingType ? "wait" : "pointer",
            }}
            title={selectedBranch ? `Export ${selectedBranch} as CSV` : "Export All Branches as CSV"}
          >
            <FileSpreadsheet size={14} />
            <span>{exportingType === "csv" ? "Exporting..." : selectedBranch ? "CSV" : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={exportToXLSX}
            disabled={!!exportingType}
            className="printz-btn-primary"
            style={{
              padding: "8px 14px",
              fontSize: "12.5px",
              borderRadius: "8px",
              background: "#0284c7",
              opacity: exportingType === "xlsx" ? 0.8 : exportingType ? 0.6 : 1,
              cursor: exportingType ? "wait" : "pointer",
            }}
            title={selectedBranch ? `Export ${selectedBranch} as Excel` : "Export All Branches as Excel"}
          >
            <FileSpreadsheet size={14} />
            <span>{exportingType === "xlsx" ? "Exporting..." : selectedBranch ? "Excel" : "Export Excel"}</span>
          </button>

          <button
            type="button"
            onClick={exportToPDF}
            disabled={!!exportingType}
            className="printz-btn-primary"
            style={{
              padding: "8px 14px",
              fontSize: "12.5px",
              borderRadius: "8px",
              background: "#dc2626",
              opacity: exportingType === "pdf" ? 0.8 : exportingType ? 0.6 : 1,
              cursor: exportingType ? "wait" : "pointer",
            }}
            title={selectedBranch ? `Export ${selectedBranch} as PDF` : "Export All Branches as PDF"}
          >
            <FileText size={14} />
            <span>{exportingType === "pdf" ? "Exporting..." : selectedBranch ? "PDF" : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* Filter Card: Branch, Month & Year */}
      <div className="add-assets-card">
        <div className="add-assets-card-header">
          <div className="add-assets-card-header-left">
            <div className="add-assets-card-icon">
              <Filter size={18} color="#059669" />
            </div>
            <div>
              <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                Select Reporting Period
              </h3>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {/* Branch */}
            <div className="add-assets-field">
              <label className="add-assets-label">Branch Location</label>
              <BranchSelect
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                branches={branches}
                placeholder="All Branches"
                allowAll={true}
                allOptionLabel="All Branches"
              />
            </div>

            {/* Month */}
            <div className="add-assets-field">
              <label className="add-assets-label">Month *</label>
              <div className="add-assets-input-wrap">
                <Calendar size={16} className="add-assets-input-icon" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="add-assets-select"
                >
                  <option value="">Select Month</option>
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year */}
            <div className="add-assets-field">
              <label className="add-assets-label">Year *</label>
              <div className="add-assets-input-wrap">
                <Calendar size={16} className="add-assets-input-icon" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="add-assets-select"
                >
                  <option value="">Select Year</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {loading ? (
          <div
            className="add-assets-card"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 20px",
              gap: "10px",
              color: "#64748b",
            }}
          >
            <div className="add-assets-spinner"></div>
            <p style={{ margin: 0, fontSize: "13px" }}>Loading financial readings...</p>
          </div>
        ) : !selectedMonth || !selectedYear ? (
          <div className="add-assets-card" style={{ padding: "20px" }}>
            <div className="add-assets-empty-state">
              <Filter size={38} color="#cbd5e1" />
              <h4>Select Month & Year</h4>
              <p>Choose your reporting period above to view and filter financial readings across all branches or a specific branch.</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="add-assets-card" style={{ padding: "20px" }}>
            <div className="add-assets-empty-state">
              <FileSpreadsheet size={38} color="#cbd5e1" />
              <h4>No readings found for {selectedMonth} {selectedYear}</h4>
              <p>There are no total amount reading records logged for {selectedBranch || "all branches"} in this period.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Financial Summary Cards */}
            <div className="export-kpis-grid">
              {[
                {
                  label: "Total Business",
                  value: totals.totalBusiness || 0,
                  icon: TrendingUp,
                  iconBg: "#ecfdf5",
                  iconColor: "#059669",
                  textColor: "#0f172a",
                },
                {
                  label: "Discount",
                  value: totals.discount || 0,
                  icon: Percent,
                  iconBg: "#f1f5f9",
                  iconColor: "#64748b",
                  textColor: "#475569",
                },
                {
                  label: "UPI & Card",
                  value: totals.upiCard || 0,
                  icon: CreditCard,
                  iconBg: "#f0f9ff",
                  iconColor: "#0284c7",
                  textColor: "#0369a1",
                },
                {
                  label: "Cash Accounts",
                  value: totals.cashAsPerAccounts || 0,
                  icon: Building2,
                  iconBg: "#eef2ff",
                  iconColor: "#6366f1",
                  textColor: "#4338ca",
                },
                {
                  label: "Cash in Hand",
                  value: totals.cashInHand || 0,
                  icon: Wallet,
                  iconBg: "#ecfeff",
                  iconColor: "#0891b2",
                  textColor: "#0e7490",
                },
                {
                  label: "Total Expenses",
                  value: totals.totalExpenses || 0,
                  icon: Receipt,
                  iconBg: "#fffbeb",
                  iconColor: "#d97706",
                  textColor: "#b45309",
                },
                {
                  label: "Balance",
                  value: totals.balance || 0,
                  icon: AlertCircle,
                  iconBg: (totals.balance || 0) > 0 ? "#fef2f2" : "#ecfdf5",
                  iconColor: (totals.balance || 0) > 0 ? "#dc2626" : "#059669",
                  textColor: (totals.balance || 0) > 0 ? "#dc2626" : "#059669",
                },
                {
                  label: "Clear Balance",
                  value: totals.clearBalance || 0,
                  icon: CheckCircle2,
                  iconBg: "#ecfdf5",
                  iconColor: "#059669",
                  textColor: "#047857",
                },
                {
                  label: "Balance Amount",
                  value: totals.balanceAmount || 0,
                  icon: Calculator,
                  iconBg: (totals.balanceAmount || 0) > 0 ? "#fff1f2" : "#ecfdf5",
                  iconColor: (totals.balanceAmount || 0) > 0 ? "#e11d48" : "#059669",
                  textColor: (totals.balanceAmount || 0) > 0 ? "#e11d48" : "#059669",
                },
              ].map((card) => {
                const IconComponent = card.icon;
                return (
                  <div key={card.label} className="export-kpi-card">
                    <div
                      className="export-kpi-icon-wrap"
                      style={{ background: card.iconBg, color: card.iconColor }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div className="export-kpi-body">
                      <div className="export-kpi-label">{card.label}</div>
                      <div
                        className="export-kpi-value"
                        style={{ color: card.textColor }}
                      >
                        ₹{Number(card.value).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Readings Table Card */}
            <div className="add-assets-card">
              <div className="add-assets-card-header">
                <div className="add-assets-card-header-left">
                  <div className="add-assets-card-icon">
                    <TrendingUp size={18} color="#059669" />
                  </div>
                  <div>
                    <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                      Financial Readings ({data.length} records{selectedBranch ? ` - ${selectedBranch}` : " - All Branches"})
                    </h3>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: "170px", maxWidth: "230px" }}>
                    <div className="add-assets-input-wrap" style={{ height: "36px", position: "relative" }}>
                      <Search size={14} color="#059669" className="add-assets-input-icon" />
                      <input
                        type="text"
                        placeholder="Search readings..."
                        value={readingSearch}
                        onChange={(e) => setReadingSearch(e.target.value)}
                        className="add-assets-input"
                        style={{ fontSize: "12.5px", paddingRight: readingSearch ? "28px" : "10px" }}
                      />
                      {readingSearch && (
                        <button
                          type="button"
                          onClick={() => setReadingSearch("")}
                          style={{
                            position: "absolute",
                            right: "6px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "#e2e8f0",
                            borderRadius: "50%",
                            width: "18px",
                            height: "18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#475569",
                            padding: 0,
                          }}
                          title="Clear search"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="add-assets-table-wrap export-financial-table-wrap">
                <table className="add-assets-table balance-directory-table export-financial-table">
                  <thead>
                    <tr>
                      {!selectedBranch && (
                        <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Branch</th>
                      )}
                      <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Date</th>
                      <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>Clear Date</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Total Business</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Discount</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>UPI & Card</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Cash (Accounts)</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Cash in Hand</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Balance</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Clear Balance</th>
                      <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Balance Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(readingSearch.trim()
                      ? data.filter((item) => {
                        const q = readingSearch.toLowerCase().trim();
                        return (
                          (item.branchName || "").toLowerCase().includes(q) ||
                          (item.date || "").toLowerCase().includes(q) ||
                          (item.clearDate || "").toLowerCase().includes(q) ||
                          (item.totalBusiness || "").toString().includes(q) ||
                          (item.balance || "").toString().includes(q) ||
                          (item.upiCard || "").toString().includes(q)
                        );
                      })
                      : data
                    ).map((item, index) => (
                      <tr key={index}>
                        {!selectedBranch && (
                          <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                            <span
                              className="add-assets-id-badge"
                              style={{
                                fontSize: "11px",
                                background: "#f8fafc",
                                padding: "2px 6px",
                              }}
                            >
                              {item.branchName || "—"}
                            </span>
                          </td>
                        )}
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span
                            className="add-assets-id-badge"
                            style={{
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              fontSize: "11.5px",
                              padding: "2px 6px",
                            }}
                          >
                            {item.date}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b", fontSize: "11.5px", whiteSpace: "nowrap" }}>
                          {item.clearDate ? (
                            <span className="add-assets-id-badge" style={{ fontSize: "11px", padding: "2px 5px" }}>
                              {item.clearDate}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 700,
                            fontSize: "12px",
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.totalBusiness.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 500,
                            fontSize: "12px",
                            color: "#64748b",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.discount.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 600,
                            fontSize: "12px",
                            color: "#0284c7",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.upiCard.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 500,
                            fontSize: "12px",
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.cashAsPerAccounts.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 500,
                            fontSize: "12px",
                            color: "#334155",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.cashInHand.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 700,
                            fontSize: "12px",
                            color: item.balance > 0 ? "#dc2626" : "#64748b",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.balance.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 700,
                            fontSize: "12px",
                            color: "#059669",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{item.clearBalance.toLocaleString("en-IN")}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                            fontWeight: 700,
                            fontSize: "12px",
                            color: (item.balance - item.clearBalance) > 0 ? "#dc2626" : "#059669",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ₹{(item.balance - item.clearBalance).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr
                      style={{
                        background: "#eaf7ee",
                        borderTop: "2px solid #a7f3d0",
                        borderBottom: "2px solid #a7f3d0",
                      }}
                    >
                      {!selectedBranch && <td style={{ textAlign: "center" }}></td>}
                      <td style={{ textAlign: "center", fontWeight: 800, color: "#047857", fontSize: "11.5px", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        TOTAL
                      </td>
                      <td style={{ textAlign: "center" }}></td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.totalBusiness || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.discount || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.upiCard || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.cashAsPerAccounts || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.cashInHand || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: (totals.balance || 0) > 0 ? "#dc2626" : "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.balance || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.clearBalance || 0).toLocaleString("en-IN")}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: (totals.balanceAmount || 0) > 0 ? "#dc2626" : "#047857", fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        ₹{(totals.balanceAmount || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly Expenses Table Card (if any) */}
            {expenseData.length > 0 && (
              <div className="add-assets-card">
                <div className="add-assets-card-header">
                  <div className="add-assets-card-header-left">
                    <div className="add-assets-card-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
                      <Receipt size={18} />
                    </div>
                    <div>
                      <h3 className="add-assets-card-title" style={{ fontSize: "18px", fontWeight: 700 }}>
                        Monthly Expenses ({expenseData.length} records)
                      </h3>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        background: "#ecfdf5",
                        color: "#047857",
                        border: "1px solid #a7f3d0",
                        padding: "4px 12px",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      Total Expenses: ₹{expenseData.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="add-assets-table-wrap">
                  <table className="add-assets-table balance-directory-table">
                    <thead>
                      <tr>
                        {!selectedBranch && (
                          <th style={{ width: "140px", textAlign: "center" }}>Branch</th>
                        )}
                        <th style={{ width: "140px", textAlign: "center" }}>Date</th>
                        <th style={{ minWidth: "220px", textAlign: "left" }}>Description</th>
                        <th style={{ width: "160px", textAlign: "right" }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseData.map((item, index) => (
                        <tr key={index}>
                          {!selectedBranch && (
                            <td style={{ textAlign: "center" }}>
                              <span className="add-assets-id-badge" style={{ fontSize: "11px", background: "#f8fafc" }}>
                                {item.branchName || "—"}
                              </span>
                            </td>
                          )}
                          <td style={{ textAlign: "center" }}>
                            <span className="add-assets-id-badge" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }}>
                              {item.date}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>
                            {item.description || item.name || "—"}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#059669",
                              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                              fontSize: "13px",
                            }}
                          >
                            ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {/* Total Expenses Row */}
                      <tr style={{ background: "#fffbeb", borderTop: "2px solid #fde68a" }}>
                        <td colSpan={!selectedBranch ? 3 : 2} style={{ fontWeight: 800, color: "#b45309", fontSize: "13px", textAlign: "right", paddingRight: "12px" }}>
                          Total Expenses
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#b45309", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "13.5px" }}>
                          ₹{expenseData.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportData;
