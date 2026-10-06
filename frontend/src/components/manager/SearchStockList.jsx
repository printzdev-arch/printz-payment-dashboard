import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaCalendarAlt,
  FaSave,
  FaEdit,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Pagination from "../common/Pagination";
import CalendarSelect from "../common/CalendarSelect.jsx";
import "../../styles/stocklist.css";

const StockList = () => {
  const INITIAL_STOCKS = [
    {
      id: "1",
      itemName: "JK BOND PAPER 100 GSM / 85 GSM",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 2,
    },
    {
      id: "2",
      itemName: "ID LAMINATION (65 X95 & 70X100)",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 15,
    },
    {
      id: "3",
      itemName: "ID LAMINATION (100 X 140)",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 20,
    },
    {
      id: "4",
      itemName: "A4 LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 35,
    },
    {
      id: "5",
      itemName: "AADHAR LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 25,
    },
    {
      id: "6",
      itemName: "Full Scape LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 45,
    },
    {
      id: "7",
      itemName: "A3 LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 70,
    },
    {
      id: "8",
      itemName: "A2 LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 175,
    },
    {
      id: "9",
      itemName: "A1 LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 350,
    },
    {
      id: "10",
      itemName: "A0 LAMINATION",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 700,
    },
    {
      id: "11",
      itemName: "A4 SPIRAL BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      pageRanges: [
        { range: "0 - 50 SHEETS", sold: "", price: 40 },
        { range: "51 - 120 SHEETS", sold: "", price: 60 },
        { range: "121 - 180 SHEETS", sold: "", price: 80 },
        { range: "181 - 220 SHEETS", sold: "", price: 120 },
        { range: "221 - 300 SHEETS", sold: "", price: 160 },
        { range: "301 - 400 SHEETS", sold: "", price: 200 },
      ],
    },
    {
      id: "12",
      itemName: "A3 SPIRAL BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      amount: 60,
      pageRanges: [
        { range: "0 - 50 SHEETS", sold: "", price: 80 },
        { range: "51 - 120 SHEETS", sold: "", price: 120 },
        { range: "121 - 180 SHEETS", sold: "", price: 150 },
        { range: "181 - 220 SHEETS", sold: "", price: 200 },
        { range: "221 - 300 SHEETS", sold: "", price: 250 },
        { range: "301 - 400 SHEETS", sold: "", price: 400 },
      ],
    },
    {
      id: "13",
      itemName: "A2 SPIRAL BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 200,
    },
    {
      id: "14",
      itemName: "A1 SPIRAL BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 400,
    },
    {
      id: "15",
      itemName: "A4 300 GSM GLOSSY SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 8,
    },
    {
      id: "16",
      itemName: "A3 | 13X19 300 GSM GLOSSY SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 16,
    },
    {
      id: "17",
      itemName: "SMALL WHITE / BROWN ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 2,
    },
    {
      id: "18",
      itemName: "A5 WHITE ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 7,
    },
    {
      id: "19",
      itemName: "A4 BROWN ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 10,
    },
    {
      id: "20",
      itemName: "FS 14 X 10 CLOTH ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 15,
    },
    {
      id: "21",
      itemName: "A3 16 X 12 CLOTH ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 20,
    },
    {
      id: "22",
      itemName: "A4 12 X 10 CLOTH ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 12,
    },
    {
      id: "23",
      itemName: "SMALL CLOTH ENVELOPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 8,
    },
    {
      id: "24",
      itemName: "A4 COVER FILE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 50,
    },
    {
      id: "25",
      itemName: "SHEET PROTECTOR",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 10,
    },
    {
      id: "26",
      itemName: "FS SHEET PROTECTOR",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 15,
    },
    {
      id: "27",
      itemName: "REGULAR STICK FILE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 15,
    },
    {
      id: "28",
      itemName: "PREMIUM STICK FILE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 20,
    },
    {
      id: "29",
      itemName: "BOOK FILE / SPRING FILE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 30,
    },
    {
      id: "30",
      itemName: "BUTTON FILE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 90,
    },
    {
      id: "31",
      itemName: "CERTIFICATE FILE ZIP TYPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 400,
    },
    {
      id: "32",
      itemName: "EXPANDING WALLET FILE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 350,
    },
    {
      id: "33",
      itemName: "A4 STICKER SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 8,
    },
    {
      id: "34",
      itemName: "A3 STICKER SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 16,
    },
    {
      id: "35",
      itemName: "OHP SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 5,
    },
    {
      id: "39",
      itemName: "LEGAL PAPER 75 GSM",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 2,
    },
    {
      id: "40",
      itemName: "GREEN SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 3,
    },
    {
      id: "41",
      itemName: "HARD BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 250,
    },
    {
      id: "42",
      itemName: "BLUE JACKET BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 350,
    },
    {
      id: "43",
      itemName: "REXINE BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 450,
    },
    {
      id: "44",
      itemName: "PERFECT BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 150,
    },
    {
      id: "45",
      itemName: "COMB / WIRO BINDING",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 80,
    },
    {
      id: "46",
      itemName: "PLAIN CARD",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 100,
    },
    {
      id: "47",
      itemName: "AADHAR ID CARD",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 100,
    },
    {
      id: "48",
      itemName: "RC CARD",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 100,
    },
    {
      id: "49",
      itemName: "DL CARD",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 25,
    },
    {
      id: "50",
      itemName: "EPSON 6 X 4 PHOTO PRINT",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 30,
    },
    {
      id: "51",
      itemName: "EPSON 5 X 7 PHOTO PRINT",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 40,
    },
    {
      id: "52",
      itemName: "EPSON 6 X 8 PHOTO PRINT",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 40,
    },
    {
      id: "53",
      itemName: "EPSON A4 PHOTO PRINT",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 80,
    },
    {
      id: "54",
      itemName: "12X18 A3 PHOTO PRINT",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 200,
    },
    {
      id: "55",
      itemName: "6 X 4 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 200,
    },
    {
      id: "56",
      itemName: "5 X 7 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 220,
    },
    {
      id: "57",
      itemName: "6 X 8 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 250,
    },
    {
      id: "58",
      itemName: "8 X 10 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 280,
    },
    {
      id: "59",
      itemName: "8 X 12 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 280,
    },
    {
      id: "60",
      itemName: "A4 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 280,
    },
    {
      id: "61",
      itemName: "A3 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 790,
    },
    {
      id: "62",
      itemName: "12X18 GLASS FRAME",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 790,
    },
    {
      id: "63",
      itemName: "A4 TRACING SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 10,
    },
    {
      id: "64",
      itemName: "A3 TRACING SHEET",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 20,
    },
    {
      id: "65",
      itemName: "ID CARD HOLDER PLASTIC PORTRAIT",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 10,
    },
    {
      id: "66",
      itemName: "ID CARD HOLDER PLASTIC LANDSCAPE",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 10,
    },
    {
      id: "67",
      itemName: "METAL ID CARD HOLDER",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 80,
    },
    {
      id: "68",
      itemName: "PLAIN LANYARD",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 60,
    },
    {
      id: "69",
      itemName: "METAL ID CARD HOLDER WITH LANYARD",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 150,
    },
    {
      id: "70",
      itemName: "PREINK STAMP A SEAL",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 490,
    },
    {
      id: "71",
      itemName: "PREINK STAMP R SEAL",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 450,
    },
    {
      id: "72",
      itemName: "PREINK STAMP F SEAL",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 450,
    },
    {
      id: "73",
      itemName: "PRE INK STAMP X SEAL",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 550,
    },
    {
      id: "74",
      itemName: "PRE INK STAMP S SEAL",
      openingStock: "",
      addedStock: "",
      closingStock: "",
      sold: "",
      amount: 490,
    },
  ];

  const [stocks, setStocks] = useState(
    JSON.parse(JSON.stringify(INITIAL_STOCKS))
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [date, setDate] = useState("");
  const [branchName, setBranchName] = useState("");
  const [userId, setUserId] = useState(null);
  const [docId, setDocId] = useState("");
  const [isExistingDoc, setIsExistingDoc] = useState(false);
  const [editingValues, setEditingValues] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // New state for edit mode
  const [dataAvailable, setDataAvailable] = useState(false);
  const [stocksPerPage, setStocksPerPage] = useState(10);

  useEffect(() => {
    const fetchUserData = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          setUserId(userObj._id || userObj.id || userObj.uid);
          const branch = userObj.branch || userObj.branchName || localStorage.getItem("userBranchName") || "";
          setBranchName(branch);
        } catch (e) {
          console.error("Error parsing user from localStorage:", e);
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!date || !branchName) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const formattedPrevDate = prevDate.toISOString().split("T")[0];

        const prevDayClosingStocks = {};
        try {
          const prevRes = await api.get("/stocks/readings", {
            params: { branchName, date: formattedPrevDate },
          });
          const prevData = prevRes.data?.data?.[0];
          if (prevData?.stocks) {
            prevData.stocks.forEach((stock) => {
              prevDayClosingStocks[stock.itemName] = stock.closingStock;
            });
          }
        } catch (e) {
          console.warn("Could not fetch prev day readings:", e);
        }

        const currentRes = await api.get("/stocks/readings", {
          params: { branchName, date },
        });
        const existingData = currentRes.data?.data?.[0];

        if (existingData) {
          setDocId(existingData._id || existingData.id);
          setIsExistingDoc(true);
          setDataAvailable(true);

          setStocks((prevStocks) =>
            prevStocks.map((stock) => {
              const existingStock = existingData.stocks?.find(
                (s) => s.itemName === stock.itemName
              );

              const openingStock =
                existingStock?.openingStock !== undefined
                  ? existingStock.openingStock
                  : prevDayClosingStocks[stock.itemName] ?? "";

              const savedPageRanges = existingStock?.pageRanges || [];

              return {
                ...stock,
                openingStock: openingStock,
                addedStock: existingStock?.addedStock ?? "",
                sold: existingStock?.sold ?? "",
                closingStock: existingStock?.closingStock ?? "",
                savedFields: {
                  openingStock: existingStock?.openingStock !== undefined,
                  addedStock: existingStock?.addedStock !== undefined,
                  sold: existingStock?.sold !== undefined,
                  pageRanges: savedPageRanges.map(
                    (range) => range.sold !== undefined
                  ),
                },
                pageRanges: stock.pageRanges?.map((range, index) => ({
                  ...range,
                  sold: savedPageRanges[index]?.sold ?? "",
                })),
              };
            })
          );
        } else {
          setDocId("");
          setIsExistingDoc(false);
          setDataAvailable(false);
          setStocks((prevStocks) =>
            prevStocks.map((stock) => ({
              ...stock,
              openingStock: prevDayClosingStocks[stock.itemName] ?? "",
              addedStock: "",
              sold: "",
              closingStock: "",
              pageRanges: stock.pageRanges?.map((range) => ({
                ...range,
                sold: "",
              })),
            }))
          );
        }

        setEditingValues({});
        setHasChanges(false);
        setIsEditing(false);
      } catch (error) {
        toast.error("Error fetching data: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [date, branchName]);

  const indexOfLastStock = currentPage * stocksPerPage;
  const indexOfFirstStock = indexOfLastStock - stocksPerPage;
  const currentStocks = stocks.slice(indexOfFirstStock, indexOfLastStock);

  const nextPage = () => {
    if (currentPage < Math.ceil(stocks.length / stocksPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleInputChange = (id, field, value) => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      setEditingValues((prev) => ({
        ...prev,
        [`${id}_${field}`]: value,
      }));
      setHasChanges(true);

      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.id !== id) return stock;

          const newValue = value === "" ? "" : Number(value);
          const opening =
            field === "openingStock"
              ? newValue
              : editingValues[`${id}_openingStock`] !== undefined
              ? editingValues[`${id}_openingStock`]
              : stock.openingStock;
          const added =
            field === "addedStock"
              ? newValue
              : editingValues[`${id}_addedStock`] !== undefined
              ? editingValues[`${id}_addedStock`]
              : stock.addedStock;
          const sold =
            field === "sold"
              ? newValue
              : editingValues[`${id}_sold`] !== undefined
              ? editingValues[`${id}_sold`]
              : stock.sold;

          const openingNum = opening === "" ? "" : Number(opening);
          const addedNum = added === "" ? "" : Number(added);
          const soldNum = sold === "" ? "" : Number(sold);

          let closingStock = "";
          if (openingNum !== "" && addedNum !== "" && soldNum !== "") {
            closingStock = openingNum + addedNum - soldNum;
          }

          return {
            ...stock,
            [field]: newValue,
            closingStock: closingStock !== "" ? closingStock : "",
          };
        })
      );
    }
  };

  const handlePageRangeChange = (id, rangeIndex, value) => {
    if (!date) {
      toast.warning("Please select a date first");
      return;
    }

    if (value === "" || (!isNaN(value) && Number(value) >= 0)) {
      setStocks((prevStocks) =>
        prevStocks.map((stock) => {
          if (stock.id === id && stock.pageRanges) {
            const updatedPageRanges = [...stock.pageRanges];
            updatedPageRanges[rangeIndex] = {
              ...updatedPageRanges[rangeIndex],
              sold: value === "" ? "" : Number(value),
            };

            const totalSold = updatedPageRanges.reduce(
              (sum, range) => sum + (Number(range.sold) || 0),
              0
            );

            const closingStock =
              (Number(stock.openingStock) || 0) +
              (Number(stock.addedStock) || 0) -
              totalSold;

            return {
              ...stock,
              pageRanges: updatedPageRanges,
              sold: totalSold,
              closingStock: closingStock,
            };
          }
          return stock;
        })
      );
      setHasChanges(true);
    }
  };

  const calculateTotalAmount = () => {
    return stocks.reduce((total, stock) => {
      if (stock.pageRanges) {
        const rangesTotal = stock.pageRanges.reduce(
          (sum, range) => sum + (Number(range.sold) || 0) * range.price,
          0
        );
        return total + rangesTotal;
      } else {
        const sold =
          editingValues[`${stock.id}_sold`] !== undefined
            ? editingValues[`${stock.id}_sold`]
            : stock.sold;
        return (
          total + (sold === "" ? 0 : Number(sold)) * (Number(stock.amount) || 0)
        );
      }
    }, 0);
  };

  const isFieldLocked = (stock, field) => {
    if (!isExistingDoc) return false;
    return (
      stock.savedFields?.[field] &&
      editingValues[`${stock.id}_${field}`] === undefined
    );
  };

  const isPageRangeLocked = (stock, rangeIndex) => {
    if (!isExistingDoc) return false;
    return (
      stock.savedFields?.pageRanges?.[rangeIndex] &&
      stock.pageRanges?.[rangeIndex]?.sold !== "" &&
      editingValues[`${stock.id}_range_${rangeIndex}_sold`] === undefined
    );
  };

  const handleSaveReading = async () => {
    if (!date) {
      toast.error("Please select a date first");
      return;
    }

    const hasNegativeClosing = stocks.some((stock) => {
      const closing = Number(stock.closingStock);
      return !isNaN(closing) && closing < 0;
    });

    if (hasNegativeClosing) {
      toast.error("Cannot save: Some items have negative closing stock.");
      return;
    }

    setIsLoading(true);
    try {
      const updatedStocks = stocks.map((stock) => {
        const closingStock =
          stock.openingStock !== "" &&
          stock.addedStock !== "" &&
          stock.sold !== ""
            ? Number(stock.openingStock) +
              Number(stock.addedStock) -
              Number(stock.sold)
            : "";

        const stockData = {
          itemName: stock.itemName,
          amount: Number(stock.amount),
          ...(stock.openingStock !== "" && {
            openingStock: Number(stock.openingStock),
          }),
          ...(stock.addedStock !== "" && {
            addedStock: Number(stock.addedStock),
          }),
          ...(stock.sold !== "" && { sold: Number(stock.sold) }),
          ...(closingStock !== "" && { closingStock: Number(closingStock) }),
        };

        if (stock.pageRanges) {
          stockData.pageRanges = stock.pageRanges.map((range) => ({
            range: range.range,
            ...(range.sold !== "" && { sold: Number(range.sold) }),
            price: range.price,
          }));
        }

        return stockData;
      });

      const stockReadingData = {
        ...(docId && { id: docId }),
        date,
        branchName,
        userId,
        stocks: updatedStocks,
        totalAmount: calculateTotalAmount(),
        lastUpdated: new Date().toISOString(),
      };

      const saveRes = await api.post("/stocks/readings", stockReadingData);
      if (saveRes.data?.data?._id || saveRes.data?.data?.id) {
        setDocId(saveRes.data.data._id || saveRes.data.data.id);
      }
      setIsExistingDoc(true);
      toast.success("Stock readings saved successfully");
    } catch (error) {
      toast.error("Failed to save stock reading: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayValue = (stock, field) => {
    const editKey = `${stock.id}_${field}`;
    return editingValues[editKey] !== undefined
      ? editingValues[editKey]
      : stock[field];
  };

  const totalAmount = calculateTotalAmount();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading && !stocks.length) {
    return (
      <div className="stock-loading-container">
        <div className="stock-loading-spinner"></div>
        <p>Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="stock-readings-container">
      <ToastContainer />
      <div className="stock-page-header">
        <h2>Stock Readings for {branchName}</h2>
        <p>View and edit stock readings for selected date.</p>
      </div>

      <div className="stock-date-picker-container">
        <div className="stock-date-picker-wrapper">
          <label htmlFor="stock-reading-date">Select Date</label>
          <CalendarSelect
            id="stock-reading-date"
            value={date}
            onChange={(d, formatted, e) => setDate(e?.target?.value || formatted || "")}
            dateFormat="yyyy-MM-dd"
            placeholder="Select date"
            required
            triggerStyle={{ height: "42px" }}
          />
        </div>
      </div>

      {date ? (
        <div className="stock-list">
          {isLoading ? (
            <div className="stock-loading-container">
              <div className="stock-loading-spinner"></div>
              <p>Loading stock data...</p>
            </div>
          ) : dataAvailable ? (
            <div className="stock-card">
              <div className="stock-card-header">
                <div className="stock-card-title">
                  <h3>Stock Items for {new Date(date).toLocaleDateString()}</h3>
                </div>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="stock-edit-button"
                  >
                    <FaEdit /> Edit Readings
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveReading}
                    className="stock-save-button"
                    disabled={isLoading || !hasChanges}
                  >
                    <FaSave /> Save Changes
                  </button>
                )}
              </div>

              <div className="stock-card-content">
                <div className="stock-table-wrapper">
                  <table className="stock-readings-table">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>ITEMS</th>
                        <th>OPENING STOCK</th>
                        <th>ADDED STOCK</th>
                        <th>CLOSING STOCK</th>
                        <th colSpan="2">SOLD</th>
                        <th>UNIT PRICE(₹)</th>
                        <th>AMOUNT(₹)</th>
                      </tr>
                      <tr>
                        <th colSpan="5"></th>
                        <th>Pages</th>
                        <th>Qty</th>
                        <th></th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentStocks.map((stock, index) => (
                        <React.Fragment key={stock.id}>
                          <tr>
                            <td
                              rowSpan={
                                stock.pageRanges
                                  ? stock.pageRanges.length + 1
                                  : 1
                              }
                            >
                              {indexOfFirstStock + index + 1}
                            </td>
                            <td
                              rowSpan={
                                stock.pageRanges
                                  ? stock.pageRanges.length + 1
                                  : 1
                              }
                            >
                              {stock.itemName}
                            </td>
                            <td
                              rowSpan={
                                stock.pageRanges
                                  ? stock.pageRanges.length + 1
                                  : 1
                              }
                            >
                              <input
                                type="number"
                                min="0"
                                value={getDisplayValue(stock, "openingStock")}
                                onChange={(e) =>
                                  handleInputChange(
                                    stock.id,
                                    "openingStock",
                                    e.target.value
                                  )
                                }
                                readOnly={
                                  !isEditing ||
                                  isFieldLocked(stock, "openingStock")
                                }
                                className="stock-reading-input"
                              />
                            </td>
                            <td
                              rowSpan={
                                stock.pageRanges
                                  ? stock.pageRanges.length + 1
                                  : 1
                              }
                            >
                              <input
                                type="number"
                                min="0"
                                value={getDisplayValue(stock, "addedStock")}
                                onChange={(e) =>
                                  handleInputChange(
                                    stock.id,
                                    "addedStock",
                                    e.target.value
                                  )
                                }
                                readOnly={isFieldLocked(stock, "addedStock")}
                                className="stock-reading-input"
                              />
                            </td>
                            <td
                              rowSpan={
                                stock.pageRanges
                                  ? stock.pageRanges.length + 1
                                  : 1
                              }
                            >
                              <input
                                type="number"
                                value={getDisplayValue(stock, "closingStock")}
                                readOnly
                                className={`stock-reading-input ${
                                  Number(
                                    getDisplayValue(stock, "closingStock")
                                  ) < 0
                                    ? "stock-negative-reading"
                                    : ""
                                }`}
                              />
                            </td>
                            {(!stock.pageRanges || stock.pageRanges.length === 0) ? (
                              <>
                                <td></td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    value={getDisplayValue(stock, "sold")}
                                    onChange={(e) =>
                                      handleInputChange(
                                        stock.id,
                                        "sold",
                                        e.target.value
                                      )
                                    }
                                    readOnly={isFieldLocked(stock, "sold")}
                                    className="stock-reading-input"
                                  />
                                </td>
                                <td>₹{stock.amount}</td>
                                <td>
                                  ₹
                                  {(Number(getDisplayValue(stock, "sold")) ||
                                    0) * (Number(stock.amount) || 0)}
                                </td>
                              </>
                            ) : (
                              <td colSpan="4" style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", fontSize: "12px" }}>
                                See range tiers below
                              </td>
                            )}
                          </tr>
                          {stock.pageRanges && stock.pageRanges.length > 0 &&
                            stock.pageRanges.map((range, rangeIndex) => (
                              <tr key={`${stock.id}-${rangeIndex}`}>
                                <td>{range.range}</td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    value={range.sold}
                                    onChange={(e) =>
                                      handlePageRangeChange(
                                        stock.id,
                                        rangeIndex,
                                        e.target.value
                                      )
                                    }
                                    readOnly={isPageRangeLocked(
                                      stock,
                                      rangeIndex
                                    )}
                                    className="stock-reading-input"
                                  />
                                </td>
                                <td>₹{range.price}</td>
                                <td>
                                  ₹{(Number(range.sold) || 0) * range.price}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      ))}
                      <tr className="stock-total-row">
                        <td colSpan="8">Grand Total:</td>
                        <td className="stock-grand-total">
                          {formatCurrency(totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalItems={stocks.length}
                  itemsPerPage={stocksPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setStocksPerPage}
                  pageSizeOptions={[10, 20, 50, 100]}
                  itemLabel="items"
                />
              </div>
            </div>
          ) : (
            <div className="stock-no-data-message">
              <p>No data available for the selected date.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="stock-select-date-message">
          <p>Please select a date to view stock readings</p>
        </div>
      )}
    </div>
  );
};

export default StockList;
