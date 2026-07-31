import { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../services/authservice";
import "../../styles/admindashboard.css";
import Popup from "../common/Popup";
import { usePopup } from "../../hooks/usePopup";

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const AdminDashboard = () => {
  const { popup, showSuccess, showError, showInfo } = usePopup();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateMode, setDateMode] = useState("single");

  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printerNames, setPrinterNames] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [stocktotalamount, setstocktotalamount] = useState(0);
  const itemsPerPage = 10;

  const [currentUser, setCurrentUser] = useState(null);
  const [managerInfo, setManagerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalCopies: 0,
    printerData: [],
    stockData: [],
    jumboXeroxData: {},
    revenueOverview: [],
    totalAmountRangeData: [],
    printerRangeData: [],
    jumboXeroxRangeData: [],
    stockRangeData: [],
  });

  const [allBranchesData, setAllBranchesData] = useState([]);

  const [totalAmountData, setTotalAmountData] = useState({
    totalAmount: 0,
    printerTotal: 0,
    stockTotal: 0,
    jumboXeroxTotal: 0,
    otherTotal: 0,
    deductionsTotal: 0,
    breakdown: [],
  });

  // Date change handlers with loading states
  const handleDateModeChange = (mode) => {
    setLoading(true);
    setDateMode(mode);
  };

  const handleSelectedDateChange = (date) => {
    setLoading(true);
    setSelectedDate(date);
  };

  const handleFromDateChange = (date) => {
    setLoading(true);
    setFromDate(date);
  };

  const handleToDateChange = (date) => {
    setLoading(true);
    setToDate(date);
  };

  const formatDateToYYYYMMDD = (dateString) => {
    if (
      typeof dateString === "string" &&
      dateString.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      return dateString;
    }

    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          setCurrentUser(userSnapshot.data());
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const usersCollection = collection(db, "branches");
        const snapshot = await getDocs(usersCollection);

        const branchNames = [
          ...new Set(
            snapshot.docs.map((doc) => doc.data().name).filter((name) => name)
          ),
        ];

        const sortedBranches = branchNames.sort((a, b) => {
          const nameA = a.trim().toLowerCase();
          const nameB = b.trim().toLowerCase();

          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        console.log("Fetched branches: ", sortedBranches);
        setBranches(sortedBranches);

        // Don't auto-select a branch - let user choose or see all branches
        // if (sortedBranches.length > 0 && !selectedBranch) {
        //    setSelectedBranch(sortedBranches[0]);
        // }
      } catch (error) {
        console.error("Failed to fetch branch names: ", error);
        showError(
          "Error Loading Dashboard",
          "Failed to load branch data. Please refresh the page and try again."
        );
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchPrinterNames = async () => {
      if (!selectedBranch) return;

      try {
        const printersCollection = collection(db, "printers");
        const printersSnapshot = await getDocs(printersCollection);
        const printerMapping = {};

        printersSnapshot.docs.forEach((doc) => {
          const printerData = doc.data();
          if (printerData.branchName === selectedBranch) {
            printerMapping[printerData.printerId] =
              printerData.printerName || `Printer ${printerData.printerId}`;
          }
        });

        setPrinterNames(printerMapping);
      } catch (error) {
        console.error("Error fetching printer names:", error);
        showError("Failed to load printer information. Please try again.");
      }
    };

    fetchPrinterNames();
  }, [selectedBranch, showError]);

  useEffect(() => {
    const fetchManagerInfo = async () => {
      if (!selectedBranch) return;

      try {
        const managerQuery = query(
          collection(db, "users"),
          where("branch", "==", selectedBranch),
          where("role", "==", "manager")
        );
        const managerSnapshot = await getDocs(managerQuery);
        const managerData = managerSnapshot.docs[0]?.data();
        if (managerData) {
          setManagerInfo({
            name: managerData.name || "N/A",
            email: managerData.email || "N/A",
            phone: managerData.phone || "N/A",
          });
        }
      } catch (error) {
        console.error("Error fetching manager info:", error);
        showError("Failed to load manager information. Please try again.");
      }
    };
    fetchManagerInfo();
  }, [selectedBranch, showError]);

  const fetchPrinterData = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const dateString = formatDateToYYYYMMDD(selectedDate);
      const printerQuery = query(
        collection(db, "printerReadings"),
        where("branchName", "==", selectedBranch),
        where("date", "==", dateString)
      );
      const printerSnapshot = await getDocs(printerQuery);

      const printerData = [];
      let totalCopies = 0;
      let totalAmount = 0;

      printerSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.readings) {
          Object.entries(data.readings).forEach(([printerId, readings]) => {
            let printerCopies = 0;
            let printerAmount = 0;

            Object.values(readings).forEach((reading) => {
              printerCopies += reading.noOfCopies || 0;
              printerAmount += reading.total || 0;
            });

            printerData.push({
              printerId,
              copies: printerCopies,
              amount: printerAmount,
            });

            totalCopies += printerCopies;
            totalAmount += printerAmount;
          });
        }
      });

      return { printerData, totalCopies, totalAmount };
    } catch (error) {
      console.error("Error fetching printer data:", error);
      showError("Failed to load printer data. Please try again.");
      return { printerData: [], totalCopies: 0, totalAmount: 0 };
    }
  }, [selectedBranch, selectedDate, showError]);

  const fetchStockData = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const dateString = formatDateToYYYYMMDD(selectedDate);
      const stockQuery = query(
        collection(db, "stockReadings"),
        where("branchName", "==", selectedBranch),
        where("date", "==", dateString)
      );
      const stockSnapshot = await getDocs(stockQuery);

      if (!stockSnapshot.empty) {
        const stockDoc = stockSnapshot.docs[0].data();
        setstocktotalamount(stockDoc.totalAmount || 0);
        return stockDoc.stocks || [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching stock data:", error);
      showError("Failed to load stock data. Please try again.");
      return [];
    }
  }, [selectedBranch, selectedDate, showError]);

  const fetchJumboXeroxData = useCallback(async () => {
    if (!selectedBranch) return {};

    try {
      const dateString = formatDateToYYYYMMDD(selectedDate);
      const jumboQuery = query(
        collection(db, "jumboXeroxReadings"),
        where("branchName", "==", selectedBranch),
        where("date", "==", dateString)
      );
      const jumboSnapshot = await getDocs(jumboQuery);

      if (!jumboSnapshot.empty) {
        const jumboDoc = jumboSnapshot.docs[0].data();
        return {
          totalQty: jumboDoc.totalQty || 0,
          totalAmount: jumboDoc.totalAmount || 0,
          rows: jumboDoc.rows || [],
          counter: jumboDoc.jumboCounter || {},
        };
      }
      return {};
    } catch (error) {
      console.error("Error fetching large format printing data:", error);
      return {};
    }
  }, [selectedBranch, selectedDate]);

  const fetchAllBranchesData = useCallback(async () => {
    if (branches.length === 0) return;

    setLoading(true);
    try {
      const branchesData = [];
      const dateString = formatDateToYYYYMMDD(selectedDate);

      for (const branch of branches) {
        const printerQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", branch),
          where("date", "==", dateString)
        );
        const printerSnapshot = await getDocs(printerQuery);

        let printerRevenue = 0;
        let printerCopies = 0;

        printerSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.readings) {
            Object.entries(data.readings).forEach(([printerId, readings]) => {
              Object.values(readings).forEach((reading) => {
                printerCopies += reading.noOfCopies || 0;
                printerRevenue += reading.total || 0;
              });
            });
          }
        });

        const stockQuery = query(
          collection(db, "stockReadings"),
          where("branchName", "==", branch),
          where("date", "==", dateString)
        );
        const stockSnapshot = await getDocs(stockQuery);

        let stockRevenue = 0;
        if (!stockSnapshot.empty) {
          const stockDoc = stockSnapshot.docs[0].data();
          stockRevenue = stockDoc.totalAmount || 0;
        }

        const jumboQuery = query(
          collection(db, "jumboXeroxReadings"),
          where("branchName", "==", branch),
          where("date", "==", dateString)
        );
        const jumboSnapshot = await getDocs(jumboQuery);

        let jumboRevenue = 0;
        let jumboCopies = 0;
        if (!jumboSnapshot.empty) {
          const jumboDoc = jumboSnapshot.docs[0].data();
          jumboRevenue = jumboDoc.totalAmount || 0;
          jumboCopies = jumboDoc.totalQty || 0;
        }

        // Get total revenue from totalAmountReadings collection
        const totalAmountQuery = query(
          collection(db, "totalAmountReadings"),
          where("branchName", "==", branch),
          where("date", "==", dateString)
        );
        const totalAmountSnapshot = await getDocs(totalAmountQuery);

        let totalRevenue = 0;
        let totalCopies = printerCopies + jumboCopies;
        if (!totalAmountSnapshot.empty) {
          const totalAmountDoc = totalAmountSnapshot.docs[0].data();
          totalRevenue = totalAmountDoc.totalAmount || 0;
        }

        let rangeData = {
          totalRevenue: 0,
          totalCopies: 0,
          printerRevenue: 0,
          printerCopies: 0,
          stockRevenue: 0,
          jumboRevenue: 0,
          jumboCopies: 0,
          days: 0,
          chartData: {
            totalRevenue: [],
            printerRevenue: [],
            stockRevenue: [],
            jumboRevenue: [],
            dates: [],
            formattedDates: []
          }
        };

        if (dateMode === "range") {
          const currentDate = new Date(fromDate);
          const endDate = new Date(toDate);
          let dayCount = 0;

          while (currentDate <= endDate) {
            const rangeDateString = formatDateToYYYYMMDD(currentDate);

            // Initialize daily values
            let dayPrinterRevenue = 0;
            let dayStockRevenue = 0;
            let dayJumboRevenue = 0;
            let dayTotalRevenue = 0;

            const rangePrinterQuery = query(
              collection(db, "printerReadings"),
              where("branchName", "==", branch),
              where("date", "==", rangeDateString)
            );
            const rangePrinterSnapshot = await getDocs(rangePrinterQuery);

            rangePrinterSnapshot.docs.forEach((doc) => {
              const data = doc.data();
              if (data.readings) {
                Object.entries(data.readings).forEach(
                  ([printerId, readings]) => {
                    Object.values(readings).forEach((reading) => {
                      rangeData.printerCopies += reading.noOfCopies || 0;
                      const amount = reading.total || 0;
                      rangeData.printerRevenue += amount;
                      dayPrinterRevenue += amount;
                    });
                  }
                );
              }
            });

            const rangeStockQuery = query(
              collection(db, "stockReadings"),
              where("branchName", "==", branch),
              where("date", "==", rangeDateString)
            );
            const rangeStockSnapshot = await getDocs(rangeStockQuery);

            if (!rangeStockSnapshot.empty) {
              const stockDoc = rangeStockSnapshot.docs[0].data();
              const amount = stockDoc.totalAmount || 0;
              rangeData.stockRevenue += amount;
              dayStockRevenue = amount;
            }

            const rangeJumboQuery = query(
              collection(db, "jumboXeroxReadings"),
              where("branchName", "==", branch),
              where("date", "==", rangeDateString)
            );
            const rangeJumboSnapshot = await getDocs(rangeJumboQuery);

            if (!rangeJumboSnapshot.empty) {
              const jumboDoc = rangeJumboSnapshot.docs[0].data();
              const amount = jumboDoc.totalAmount || 0;
              rangeData.jumboRevenue += amount;
              rangeData.jumboCopies += jumboDoc.totalQty || 0;
              dayJumboRevenue = amount;
            }

            // Get total revenue from totalAmountReadings for this date
            const rangeTotalAmountQuery = query(
              collection(db, "totalAmountReadings"),
              where("branchName", "==", branch),
              where("date", "==", rangeDateString)
            );
            const rangeTotalAmountSnapshot = await getDocs(rangeTotalAmountQuery);

            if (!rangeTotalAmountSnapshot.empty) {
              const totalAmountDoc = rangeTotalAmountSnapshot.docs[0].data();
              const amount = totalAmountDoc.totalAmount || 0;
              rangeData.totalRevenue += amount;
              dayTotalRevenue = amount;
            }

            // Add daily data to chart arrays
            rangeData.chartData.dates.push(rangeDateString);
            rangeData.chartData.formattedDates.push(
              currentDate.toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })
            );
            rangeData.chartData.totalRevenue.push(dayTotalRevenue);
            rangeData.chartData.printerRevenue.push(dayPrinterRevenue);
            rangeData.chartData.stockRevenue.push(dayStockRevenue);
            rangeData.chartData.jumboRevenue.push(dayJumboRevenue);

            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
          }

          // Calculate total copies from individual components
          rangeData.totalCopies =
            rangeData.printerCopies + rangeData.jumboCopies;
          rangeData.days = dayCount;
        }

        branchesData.push({
          branchName: branch,
          totalRevenue,
          totalCopies,
          printerRevenue,
          printerCopies,
          stockRevenue,
          jumboRevenue,
          jumboCopies,
          rangeData,
        });
      }

      setAllBranchesData(branchesData);
    } catch (error) {
      console.error("Error fetching all branches data:", error);
      showError("Failed to load all branches data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [branches, selectedDate, dateMode, fromDate, toDate, showError]);

  const fetchRevenueOverview = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const revenueData = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);

      while (currentDate <= endDate) {
        const dateString = formatDateToYYYYMMDD(currentDate);

        const totalAmountQuery = query(
          collection(db, "totalAmountReadings"),
          where("branchName", "==", selectedBranch),
          where("date", "==", dateString)
        );
        const totalAmountSnapshot = await getDocs(totalAmountQuery);

        let dayRevenue = 0;
        if (!totalAmountSnapshot.empty) {
          const totalAmountDoc = totalAmountSnapshot.docs[0].data();
          dayRevenue = totalAmountDoc.totalAmount || 0;
        }

        revenueData.push({
          date: dateString,
          revenue: dayRevenue,
          formattedDate: currentDate.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return revenueData;
    } catch (error) {
      console.error("Error fetching revenue overview:", error);
      return [];
    }
  }, [selectedBranch, fromDate, toDate]);

  const fetchTotalAmountRangeData = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const rangeData = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);

      while (currentDate <= endDate) {
        const dateString = formatDateToYYYYMMDD(currentDate);

        const totalAmountQuery = query(
          collection(db, "totalAmountReadings"),
          where("branchName", "==", selectedBranch),
          where("date", "==", dateString)
        );
        const totalAmountSnapshot = await getDocs(totalAmountQuery);

        const dayData = {
          date: dateString,
          formattedDate: currentDate.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          totalAmount: 0,
          printerTotal: 0,
          stockTotal: 0,
          jumboXeroxTotal: 0,
          otherTotal: 0,
          deductionsTotal: 0,
          breakdown: [],
        };

        if (!totalAmountSnapshot.empty) {
          const totalAmountDoc = totalAmountSnapshot.docs[0].data();
          dayData.totalAmount = totalAmountDoc.totalAmount || 0;

          if (totalAmountDoc.rows && Array.isArray(totalAmountDoc.rows)) {
            totalAmountDoc.rows.forEach((row) => {
              const amount = Number(row.amount) || 0;

              if (row.type === "printer") {
                dayData.printerTotal += amount;
              } else if (row.type === "stock") {
                dayData.stockTotal += amount;
              } else if (row.type === "jumboXerox") {
                dayData.jumboXeroxTotal += amount;
              } else if (row.type === "deduction") {
                dayData.deductionsTotal += amount;
              } else if (row.type === "manual") {
                dayData.otherTotal += amount;
              }
            });
          }
        }

        rangeData.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return rangeData;
    } catch (error) {
      console.error("Error fetching total amount range data:", error);
      return [];
    }
  }, [selectedBranch, fromDate, toDate]);

  const fetchPrinterRangeData = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const rangeData = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);

      while (currentDate <= endDate) {
        const dateString = formatDateToYYYYMMDD(currentDate);

        const printerQuery = query(
          collection(db, "printerReadings"),
          where("branchName", "==", selectedBranch),
          where("date", "==", dateString)
        );
        const printerSnapshot = await getDocs(printerQuery);

        const dayData = {
          date: dateString,
          formattedDate: currentDate.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          totalAmount: 0,
          totalCopies: 0,
          printerCount: 0,
          printerDetails: [],
        };

        printerSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.readings) {
            Object.entries(data.readings).forEach(([printerId, readings]) => {
              let printerCopies = 0;
              let printerAmount = 0;

              Object.values(readings).forEach((reading) => {
                printerCopies += reading.noOfCopies || 0;
                printerAmount += reading.total || 0;
              });

              if (printerAmount > 0 || printerCopies > 0) {
                dayData.printerDetails.push({
                  printerId,
                  copies: printerCopies,
                  amount: printerAmount,
                });
                dayData.totalAmount += printerAmount;
                dayData.totalCopies += printerCopies;
                dayData.printerCount++;
              }
            });
          }
        });

        rangeData.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return rangeData;
    } catch (error) {
      console.error("Error fetching printer range data:", error);
      return [];
    }
  }, [selectedBranch, fromDate, toDate]);

  const fetchJumboXeroxRangeData = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const rangeData = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);

      while (currentDate <= endDate) {
        const dateString = formatDateToYYYYMMDD(currentDate);

        const jumboQuery = query(
          collection(db, "jumboXeroxReadings"),
          where("branchName", "==", selectedBranch),
          where("date", "==", dateString)
        );
        const jumboSnapshot = await getDocs(jumboQuery);

        const dayData = {
          date: dateString,
          formattedDate: currentDate.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          totalAmount: 0,
          totalQty: 0,
          itemCount: 0,
          averagePrice: 0,
        };

        if (!jumboSnapshot.empty) {
          const jumboDoc = jumboSnapshot.docs[0].data();
          dayData.totalAmount = jumboDoc.totalAmount || 0;
          dayData.totalQty = jumboDoc.totalQty || 0;
          dayData.itemCount = jumboDoc.rows ? jumboDoc.rows.length : 0;
          dayData.averagePrice =
            dayData.totalQty > 0 ? dayData.totalAmount / dayData.totalQty : 0;
        }

        rangeData.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return rangeData;
    } catch (error) {
      console.error("Error fetching large format printing range data:", error);
      return [];
    }
  }, [selectedBranch, fromDate, toDate]);

  const fetchStockRangeData = useCallback(async () => {
    if (!selectedBranch) return [];

    try {
      const rangeData = [];
      const currentDate = new Date(fromDate);
      const endDate = new Date(toDate);

      while (currentDate <= endDate) {
        const dateString = formatDateToYYYYMMDD(currentDate);

        const stockQuery = query(
          collection(db, "stockReadings"),
          where("branchName", "==", selectedBranch),
          where("date", "==", dateString)
        );
        const stockSnapshot = await getDocs(stockQuery);

        const dayData = {
          date: dateString,
          formattedDate: currentDate.toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          }),
          totalAmount: 0,
          totalSold: 0,
          itemCount: 0,
          averagePrice: 0,
        };

        if (!stockSnapshot.empty) {
          const stockDoc = stockSnapshot.docs[0].data();
          dayData.totalAmount += stockDoc.totalAmount;
          if (stockDoc.stocks && Array.isArray(stockDoc.stocks)) {
            stockDoc.stocks.forEach((stock) => {
              const sold = stock.sold || 0;
              dayData.totalSold += sold;
              if (sold > 0) dayData.itemCount++;
            });
            dayData.averagePrice =
              dayData.totalSold > 0
                ? dayData.totalAmount / dayData.totalSold
                : 0;
          }
        }

        rangeData.push(dayData);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return rangeData;
    } catch (error) {
      console.error("Error fetching stock range data:", error);
      return [];
    }
  }, [selectedBranch, fromDate, toDate]);

  const fetchDashboardData = useCallback(async () => {
    if (!selectedBranch) return;

    setLoading(true);
    try {
      const [
        printerResult,
        stockData,
        jumboXeroxData,
        revenueOverview,
        totalAmountRangeData,
        printerRangeData,
        jumboXeroxRangeData,
        stockRangeData,
      ] = await Promise.all([
        fetchPrinterData(),
        fetchStockData(),
        fetchJumboXeroxData(),
        fetchRevenueOverview(),
        fetchTotalAmountRangeData(),
        fetchPrinterRangeData(),
        fetchJumboXeroxRangeData(),
        fetchStockRangeData(),
      ]);

      // Get total revenue from totalAmountReadings collection
      const dateString = formatDateToYYYYMMDD(selectedDate);
      const totalAmountQuery = query(
        collection(db, "totalAmountReadings"),
        where("branchName", "==", selectedBranch),
        where("date", "==", dateString)
      );
      const totalAmountSnapshot = await getDocs(totalAmountQuery);

      let totalRevenue = 0;
      if (!totalAmountSnapshot.empty) {
        const totalAmountDoc = totalAmountSnapshot.docs[0].data();
        totalRevenue = totalAmountDoc.totalAmount || 0;
      }

      setDashboardData({
        totalRevenue,
        totalCopies: printerResult.totalCopies + (jumboXeroxData.totalQty || 0),
        printerData: printerResult.printerData,
        stockData,
        jumboXeroxData,
        revenueOverview,
        totalAmountRangeData,
        printerRangeData,
        jumboXeroxRangeData,
        stockRangeData,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      showError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    selectedBranch,
    selectedDate,
    fetchPrinterData,
    fetchStockData,
    fetchJumboXeroxData,
    fetchRevenueOverview,
    fetchTotalAmountRangeData,
    fetchPrinterRangeData,
    fetchJumboXeroxRangeData,
    fetchStockRangeData,
    showError,
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchAllBranchesData();
  }, [fetchAllBranchesData]);

  const totalPages = Math.ceil(dashboardData.stockData.length / itemsPerPage);
  const paginatedStockData = dashboardData.stockData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const printerChartData = {
    labels: dashboardData.printerData.map(
      (p) => printerNames[p.printerId] || `Printer ${p.printerId}`
    ),
    datasets: [
      {
        label: "Revenue (₹)",
        data: dashboardData.printerData.map((p) => p.amount),
        backgroundColor: "rgba(30, 136, 229, 0.8)",
        borderColor: "rgba(30, 136, 229, 1)",
        borderWidth: 1,
      },
      {
        label: "Copies",
        data: dashboardData.printerData.map((p) => p.copies),
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1,
        yAxisID: "y1",
      },
    ],
  };

  const stockChartData = {
    labels: dashboardData.stockData
      .filter((s) => (s.sold || 0) > 0 && (s.amount || 0) > 0)
      .slice(0, 8)
      .map((s) => s.itemName),
    datasets: [
      {
        label: "Revenue Generated (₹)",
        data: dashboardData.stockData
          .filter((s) => (s.sold || 0) > 0 && (s.amount || 0) > 0)
          .slice(0, 8)
          .map((s) => (s.sold || 0) * (s.amount || 0)),
        backgroundColor: [
          "#1e88e5",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#06b6d4",
          "#84cc16",
          "#f97316",
        ],
      },
    ],
  };

  const jumboXeroxChartData = {
    labels:
      dashboardData.jumboXeroxData.rows?.map(
        (row) => `${row.type} ${row.size}`
      ) || [],
    datasets: [
      {
        label: "Quantity",
        data: dashboardData.jumboXeroxData.rows?.map((row) => row.qty) || [],
        backgroundColor: "rgba(30, 136, 229, 0.8)",
        borderColor: "rgba(30, 136, 229, 1)",
        borderWidth: 1,
      },
      {
        label: "Amount (₹)",
        data: dashboardData.jumboXeroxData.rows?.map((row) => row.amount) || [],
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 1,
        yAxisID: "y1",
      },
    ],
  };

  const revenueChartData = {
    labels: dashboardData.revenueOverview.map((r) => r.formattedDate),
    datasets: [
      {
        label: "Total Revenue",
        data: dashboardData.revenueOverview.map((r) => r.revenue),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: "#3b82f6",
        pointHoverBorderColor: "#ffffff",
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const printerRangeChartData = {
    labels:
      dashboardData.printerRangeData?.map((day) => day.formattedDate) || [],
    datasets: [
      {
        label: "Printer Revenue",
        data:
          dashboardData.printerRangeData?.map((day) => day.totalAmount) || [],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: "y",
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: "Total Copies",
        data:
          dashboardData.printerRangeData?.map((day) => day.totalCopies) || [],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.05)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: "y1",
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const jumboXeroxRangeChartData = {
    labels:
      dashboardData.jumboXeroxRangeData?.map((day) => day.formattedDate) || [],
    datasets: [
      {
        label: "Large Format Printing Revenue",
        data:
          dashboardData.jumboXeroxRangeData?.map((day) => day.totalAmount) ||
          [],
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: "y",
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: "Total Quantity",
        data:
          dashboardData.jumboXeroxRangeData?.map((day) => day.totalQty) || [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.05)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: "y1",
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const stockRangeChartData = {
    labels: dashboardData.stockRangeData?.map((day) => day.formattedDate) || [],
    datasets: [
      {
        label: "Stock Revenue",
        data: dashboardData.stockRangeData?.map((day) => day.totalAmount) || [],
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        yAxisID: "y",
        pointBackgroundColor: "#06b6d4",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
      {
        label: "Items Sold",
        data: dashboardData.stockRangeData?.map((day) => day.totalSold) || [],
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.05)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: "y1",
        pointBackgroundColor: "#f97316",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  };

  const areaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "500",
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#333",
        borderColor: "#ddd",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          callback: (value) => formatCurrency(value),
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
    },
  };

  const dualAxisChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "500",
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#333",
        borderColor: "#ddd",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === "y") {
                label += formatCurrency(context.parsed.y);
              } else {
                label += context.parsed.y.toLocaleString();
              }
            }
            return label;
          },
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          callback: (value) => formatCurrency(value),
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          callback: (value) => value.toLocaleString(),
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "500",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#333",
        borderColor: "#ddd",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              if (context.dataset.yAxisID === "y") {
                label += formatCurrency(context.parsed.y);
              } else {
                label += context.parsed.y.toLocaleString();
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
      y: {
        beginAtZero: true,
        position: "left",
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          callback: (value) => formatCurrency(value),
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        beginAtZero: true,
        ticks: {
          callback: (value) => value.toLocaleString(),
          font: {
            size: 11,
          },
          color: "#6b7280",
        },
      },
    },
    elements: {
      bar: {
        maxBarThickness: 40,
        borderRadius: 4,
      },
    },
  };

  const calculateAnalytics = () => {
    const totalRevenue =
      dashboardData.totalAmountRangeData?.reduce(
        (sum, day) => sum + day.totalAmount,
        0
      ) || 0;
    const printerRevenue =
      dashboardData.printerRangeData?.reduce(
        (sum, day) => sum + day.totalAmount,
        0
      ) || 0;
    const printerCopies =
      dashboardData.printerRangeData?.reduce(
        (sum, day) => sum + day.totalCopies,
        0
      ) || 0;
    const jumboRevenue =
      dashboardData.jumboXeroxRangeData?.reduce(
        (sum, day) => sum + day.totalAmount,
        0
      ) || 0;
    const jumboCopies =
      dashboardData.jumboXeroxRangeData?.reduce(
        (sum, day) => sum + day.totalQty,
        0
      ) || 0;
    const stockRevenue =
      dashboardData.stockRangeData?.reduce(
        (sum, day) => sum + day.totalAmount,
        0
      ) || 0;

    const days = Math.max(
      dashboardData.totalAmountRangeData?.length || 0,
      dashboardData.printerRangeData?.length || 0,
      dashboardData.jumboXeroxRangeData?.length || 0,
      dashboardData.stockRangeData?.length || 0
    );

    return {
      totalRevenue,
      avgDailyRevenue: days > 0 ? totalRevenue / days : 0,
      printerRevenue,
      avgDailyPrinterRevenue: days > 0 ? printerRevenue / days : 0,
      printerCopies,
      avgDailyPrinterCopies: days > 0 ? printerCopies / days : 0,
      jumboRevenue,
      avgDailyJumboRevenue: days > 0 ? jumboRevenue / days : 0,
      jumboCopies,
      avgDailyJumboCopies: days > 0 ? jumboCopies / days : 0,
      stockRevenue,
      avgDailyStockRevenue: days > 0 ? stockRevenue / days : 0,
      days,
    };
  };

  const analytics = calculateAnalytics();

  const generateBranchColors = (count) => {
    const colors = [
      "#FF5733",
      "#33FF57",
      "#3357FF",
      "#FF33A6",
      "#33FFF3",
      "#FFC300",
      "#8E44AD",
      "#E74C3C",
      "#27AE60",
      "#2980B9",
      "#F39C12",
      "#D35400",
      "#1ABC9C",
      "#7D3C98",
      "#2C3E50",
    ];

    return colors.slice(0, count);
  };

  const filteredBranchesData = allBranchesData.filter(branch =>
    !branch.branchName.toLowerCase().includes('inventory')
  );

  const branchRevenueData = {
    labels: filteredBranchesData.map((branch) => branch.branchName),
    datasets: [
      {
        data: filteredBranchesData.map((branch) =>
          dateMode === "range" && branch.rangeData.days > 0
            ? branch.rangeData.totalRevenue
            : branch.totalRevenue
        ),
        backgroundColor: generateBranchColors(filteredBranchesData.length),
        borderColor: generateBranchColors(filteredBranchesData.length).map(
          (color) => color
        ),
        borderWidth: 2,
      },
    ],
  };

  const branchCopiesData = {
    labels: filteredBranchesData.map((branch) => branch.branchName),
    datasets: [
      {
        data: filteredBranchesData.map((branch) =>
          dateMode === "range" && branch.rangeData.days > 0
            ? branch.rangeData.totalCopies
            : branch.totalCopies
        ),
        backgroundColor: generateBranchColors(filteredBranchesData.length),
        borderColor: generateBranchColors(filteredBranchesData.length).map(
          (color) => color
        ),
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "500",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#333",
        borderColor: "#ddd",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const dataset = context.dataset;
            const total = dataset.data.reduce((sum, value) => sum + value, 0);
            const value = context.parsed;
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            const label = context.label || "";

            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const pieChartRevenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "500",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#333",
        borderColor: "#ddd",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const dataset = context.dataset;
            const total = dataset.data.reduce((sum, value) => sum + value, 0);
            const value = context.parsed;
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            const label = context.label || "";

            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* Control section */}
      <div className="admin-controls-section">
        <div className="admin-control-group">
          {/* Branch selector */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="admin-branch-selector"
          >
            <option value="">Select a branch</option>
            {branches.map((branch, index) => (
              <option key={index} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-control-group">
          {/* Date mode buttons */}
          <div className="admin-date-mode-buttons">
            <button
              className={`admin-date-mode-btn ${
                dateMode === "single" ? "active" : ""
              }`}
              onClick={() => handleDateModeChange("single")}
            >
              Single Date
            </button>
            <button
              className={`admin-date-mode-btn ${
                dateMode === "range" ? "active" : ""
              }`}
              onClick={() => handleDateModeChange("range")}
            >
              Date Range
            </button>
          </div>
        </div>

        {dateMode === "single" ? (
          <div className="admin-control-group">
            {/* Single date input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleSelectedDateChange(e.target.value)}
              className="admin-date-input"
            />
          </div>
        ) : (
          <>
            <div className="admin-control-group">
              {/* From date input */}
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleFromDateChange(e.target.value)}
                className="admin-date-input"
              />
            </div>
            <div className="admin-control-group">
              {/* To date input */}
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleToDateChange(e.target.value)}
                className="admin-date-input"
              />
            </div>
          </>
        )}
      </div>

      {!selectedBranch ? (
        <>
          {/* Show all branches when no specific branch is selected */}
          <div className="admin-all-branches-section">
            {allBranchesData
              .filter(branchData => !branchData.branchName.toLowerCase().includes('inventory'))
              .sort((a, b) => a.branchName.localeCompare(b.branchName))
              .map((branchData, index) => (
              <div key={index} className="admin-branch-container">
                <div className="admin-branch-header">
                  <h2>{branchData.branchName}</h2>
                </div>
                <div className="admin-summary-section">
                  <div className="admin-summary-cards">
                    <div className="admin-summary-card admin-card-revenue">
                      <div className="admin-card-content">
                        <h3>Total Revenue</h3>
                        <p className="admin-card-value">
                          {formatCurrency(branchData.totalRevenue)}
                        </p>
                        <p className="admin-card-sub-value">
                          {branchData.totalCopies.toLocaleString()} copies
                        </p>
                      </div>
                    </div>

                    <div className="admin-summary-card admin-card-printer-revenue">
                      <div className="admin-card-content">
                        <h3>Printer Revenue</h3>
                        <p className="admin-card-value">
                          {formatCurrency(branchData.printerRevenue)}
                        </p>
                        <p className="admin-card-sub-value">
                          {branchData.printerCopies.toLocaleString()} copies
                        </p>
                      </div>
                    </div>

                    <div className="admin-summary-card admin-card-jumbo-revenue">
                      <div className="admin-card-content">
                        <h3>LFP Revenue</h3>
                        <p className="admin-card-value">
                          {formatCurrency(branchData.jumboRevenue)}
                        </p>
                        <p className="admin-card-sub-value">
                          {branchData.jumboCopies.toLocaleString()} copies
                        </p>
                      </div>
                    </div>

                    <div className="admin-summary-card admin-card-stock-revenue">
                      <div className="admin-card-content">
                        <h3>Stock Revenue</h3>
                        <p className="admin-card-value">
                          {formatCurrency(branchData.stockRevenue)}
                        </p>
                      </div>
                    </div>

                    {/* Show time range data if in range mode */}
                    {dateMode === "range" && branchData.rangeData.days > 0 && (
                      <>
                        <div className="admin-analytics-card admin-analytics-total-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Total Revenue - [{branchData.rangeData.days} days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.totalRevenue
                              )}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.rangeData.totalCopies.toLocaleString()}{" "}
                              copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-analytics-card admin-analytics-printer-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Printer Revenue - [{branchData.rangeData.days}{" "}
                              days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.printerRevenue
                              )}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.rangeData.printerCopies.toLocaleString()}{" "}
                              copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-analytics-card admin-analytics-jumbo-revenue">
                          <div className="admin-card-content">
                            <h3>
                              LFP Revenue - [{branchData.rangeData.days} days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.jumboRevenue
                              )}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.rangeData.jumboCopies.toLocaleString()}{" "}
                              copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-analytics-card admin-analytics-stock-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Stock Revenue - [{branchData.rangeData.days} days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.stockRevenue
                              )}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show pie charts for all branches */}
          {filteredBranchesData.length > 0 && (
            <div className="admin-pie-charts-section">
              <div className="admin-charts-container">
                <div className="admin-chart-wrapper">
                  <div className="admin-chart-header">
                    <h3>
                      Total Revenue Distribution - All Branches
                      {dateMode === "range"
                        ? ` [${fromDate} to ${toDate}]`
                        : ` [${selectedDate}]`}
                    </h3>
                  </div>
                  <div
                    className="admin-chart-content"
                    style={{ height: "400px" }}
                  >
                    <Pie
                      data={branchRevenueData}
                      options={pieChartRevenueOptions}
                    />
                  </div>
                </div>

                <div className="admin-chart-wrapper">
                  <div className="admin-chart-header">
                    <h3>
                      Total Copies Distribution - All Branches
                      {dateMode === "range"
                        ? ` [${fromDate} to ${toDate}]`
                        : ` [${selectedDate}]`}
                    </h3>
                  </div>
                  <div
                    className="admin-chart-content"
                    style={{ height: "400px" }}
                  >
                    <Pie data={branchCopiesData} options={pieChartOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show top 10 branches table */}
          {filteredBranchesData.length > 0 && (
            <div className="admin-tables-section">
              <div className="admin-chart-wrapper">
                <div className="admin-chart-header">
                  <h3>
                    Top 10 Branches by Revenue
                    {dateMode === "range"
                      ? ` [${fromDate} to ${toDate}]`
                      : ` [${selectedDate}]`}
                  </h3>
                </div>
                <div className="admin-table-container">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Branch Name</th>
                        <th>Total Revenue</th>
                        <th>Printer Revenue</th>
                        <th>Stock Revenue</th>
                        <th>LFP Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBranchesData
                        .sort((a, b) => {
                          const revenueA =
                            dateMode === "range" && a.rangeData.days > 0
                              ? a.rangeData.totalRevenue
                              : a.totalRevenue;
                          const revenueB =
                            dateMode === "range" && b.rangeData.days > 0
                              ? b.rangeData.totalRevenue
                              : b.totalRevenue;
                          return revenueB - revenueA;
                        })
                        .slice(0, 10)
                        .map((branch, index) => {
                          const revenue =
                            dateMode === "range" && branch.rangeData.days > 0
                              ? branch.rangeData.totalRevenue
                              : branch.totalRevenue;
                          const printerRevenue =
                            dateMode === "range" && branch.rangeData.days > 0
                              ? branch.rangeData.printerRevenue
                              : branch.printerRevenue;
                          const stockRevenue =
                            dateMode === "range" && branch.rangeData.days > 0
                              ? branch.rangeData.stockRevenue
                              : branch.stockRevenue;
                          const jumboRevenue =
                            dateMode === "range" && branch.rangeData.days > 0
                              ? branch.rangeData.jumboRevenue
                              : branch.jumboRevenue;

                          return (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{branch.branchName}</td>
                              <td>{formatCurrency(revenue)}</td>
                              <td>{formatCurrency(printerRevenue)}</td>
                              <td>{formatCurrency(stockRevenue)}</td>
                              <td>{formatCurrency(jumboRevenue)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="admin-charts-container">
            <div className="admin-chart-wrapper">
              <div className="admin-chart-header">
                <h3>Total Revenue - Time Range</h3>
              </div>
              <div className="admin-chart-content">
                <Line data={revenueChartData} options={areaChartOptions} />
              </div>
            </div>
            <div className="admin-chart-wrapper">
              <div className="admin-chart-header">
                <h3>Printer Revenue - Time Range</h3>
              </div>
              <div className="admin-chart-content">
                <Line
                  data={printerRangeChartData}
                  options={dualAxisChartOptions}
                />
              </div>
            </div>
          </div>

          <div className="admin-charts-container">
            <div className="admin-chart-wrapper">
              <div className="admin-chart-header">
                <h3>Large Format Printing Revenue - Time Range</h3>
              </div>
              <div className="admin-chart-content">
                <Line
                  data={jumboXeroxRangeChartData}
                  options={dualAxisChartOptions}
                />
              </div>
            </div>
            <div className="admin-chart-wrapper">
              <div className="admin-chart-header">
                <h3>Stock Revenue - Time Range</h3>
              </div>
              <div className="admin-chart-content">
                <Line
                  data={stockRangeChartData}
                  options={dualAxisChartOptions}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Show specific branch data when a branch is selected */}
          {allBranchesData
            .filter(branchData => branchData.branchName === selectedBranch)
            .map((branchData, index) => (
            <div key={index} className="admin-selected-branch-section">
              <div className="admin-branch-container">
                <div className="admin-branch-header">
                  <h2>{branchData.branchName} - Revenue Details</h2>
                </div>
                <div className="admin-summary-section">
                  <div className="admin-summary-cards">
                    {/* The four cards you want to remove are here */}
                    {/* They are replaced by the time range cards when in 'range' mode */}
                    {/* But in single date mode, they are a single line */}
                    {/* Let's remove the single date mode cards */}
                    {dateMode === "single" && (
                       <>
                        <div className="admin-summary-card admin-card-revenue">
                          <div className="admin-card-content">
                            <h3>Total Revenue</h3>
                            <p className="admin-card-value">
                              {formatCurrency(branchData.totalRevenue)}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.totalCopies.toLocaleString()} copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-summary-card admin-card-printer-revenue">
                          <div className="admin-card-content">
                            <h3>Printer Revenue</h3>
                            <p className="admin-card-value">
                              {formatCurrency(branchData.printerRevenue)}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.printerCopies.toLocaleString()} copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-summary-card admin-card-jumbo-revenue">
                          <div className="admin-card-content">
                            <h3>LFP Revenue</h3>
                            <p className="admin-card-value">
                              {formatCurrency(branchData.jumboRevenue)}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.jumboCopies.toLocaleString()} copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-summary-card admin-card-stock-revenue">
                          <div className="admin-card-content">
                            <h3>Stock Revenue</h3>
                            <p className="admin-card-value">
                              {formatCurrency(branchData.stockRevenue)}
                            </p>
                          </div>
                        </div>
                       </>
                    )}


                    {/* Show time range data if in range mode */}
                    {dateMode === "range" && branchData.rangeData.days > 0 && (
                      <>
                        <div className="admin-analytics-card admin-analytics-total-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Total Revenue - Time Range [{branchData.rangeData.days} days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.totalRevenue
                              )}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.rangeData.totalCopies.toLocaleString()}{" "}
                              copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-analytics-card admin-analytics-printer-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Printer Revenue - Time Range [{branchData.rangeData.days}{" "}
                              days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.printerRevenue
                              )}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.rangeData.printerCopies.toLocaleString()}{" "}
                              copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-analytics-card admin-analytics-jumbo-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Large Format Printing Revenue - Time Range [{branchData.rangeData.days} days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.jumboRevenue
                              )}
                            </p>
                            <p className="admin-card-sub-value">
                              {branchData.rangeData.jumboCopies.toLocaleString()}{" "}
                              copies
                            </p>
                          </div>
                        </div>

                        <div className="admin-analytics-card admin-analytics-stock-revenue">
                          <div className="admin-card-content">
                            <h3>
                              Stock Revenue - Time Range [{branchData.rangeData.days} days]
                            </h3>
                            <p className="admin-card-value">
                              {formatCurrency(
                                branchData.rangeData.stockRevenue
                              )}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Individual Charts for Selected Branch */}
                {dateMode === "range" && (
                  <div className="admin-charts-section">
                    <div className="admin-charts-container">
                      <div className="admin-chart-wrapper">
                        <div className="admin-chart-header">
                          <h3>Total Revenue - Time Range</h3>
                        </div>
                        <div className="admin-chart-content">
                          <Line
                            data={revenueChartData}
                            options={areaChartOptions}
                          />
                        </div>
                      </div>

                      <div className="admin-chart-wrapper">
                        <div className="admin-chart-header">
                          <h3>Printer Revenue - Time Range</h3>
                        </div>
                        <div className="admin-chart-content">
                          <Line
                            data={printerRangeChartData}
                            options={dualAxisChartOptions}
                          />
                        </div>
                      </div>

                      <div className="admin-chart-wrapper">
                        <div className="admin-chart-header">
                          <h3>Large Format Printing Revenue - Time Range</h3>
                        </div>
                        <div className="admin-chart-content">
                          <Line
                            data={jumboXeroxRangeChartData}
                            options={dualAxisChartOptions}
                          />
                        </div>
                      </div>

                      <div className="admin-chart-wrapper">
                        <div className="admin-chart-header">
                          <h3>Stock Revenue - Time Range</h3>
                        </div>
                        <div className="admin-chart-content">
                          <Line
                            data={stockRangeChartData}
                            options={dualAxisChartOptions}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      <Popup {...popup} />
    </div>
  );
};

export default AdminDashboard;
