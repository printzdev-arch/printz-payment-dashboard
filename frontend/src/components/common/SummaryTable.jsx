import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";

// Props:
// - rows: Array<{ branchName: string, totalRevenue: number, stockRevenue: number, printerRevenue: number, otherRevenue: number }>
// - currency?: boolean (defaults to true)
const SummaryTable = ({ rows, currency = true }) => {
  const fmt = (n) =>
    currency ? `₹${Number(n || 0).toLocaleString("en-IN")}` : String(n);

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: 2,
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        border: "1px solid #f1f5f9",
      }}
    >
      <Table
        size="small"
        stickyHeader
        aria-label="Branch revenue summary"
        sx={{
          tableLayout: "auto",
          width: "100%",
          "& .MuiTableCell-root": {
            py: 0.5,
            px: { xs: 0.4, sm: 0.6 },
            fontSize: "11.5px",
            fontFamily: "'Poppins', sans-serif",
          },
          "& .MuiTableCell-head": {
            fontWeight: 700,
            fontSize: "11px",
            color: "#475569",
            backgroundColor: "#f8fafc",
            py: 0.6,
            px: { xs: 0.4, sm: 0.6 },
          },
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              align="center"
              sx={{ fontWeight: 700, color: "#475569", width: "36px", px: "2px !important" }}
            >
              #
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#475569" }}>
              Branch Name
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 700, color: "#475569" }}
            >
              Total Rev.
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 700, color: "#475569" }}
            >
              Stock Rev.
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 700, color: "#475569" }}
            >
              Printer Rev.
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 700, color: "#475569" }}
            >
              Other Rev.
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={r.branchName} hover>
              <TableCell align="center" sx={{ color: "#94a3b8", fontWeight: 500, px: "2px !important" }}>
                {idx + 1}
              </TableCell>
              <TableCell sx={{ color: "#475569", fontWeight: 500, wordBreak: "break-word" }}>
                {r.branchName}
              </TableCell>
              <TableCell align="right" sx={{ color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap" }}>
                {fmt(r.totalRevenue)}
              </TableCell>
              <TableCell align="right" sx={{ color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                {fmt(r.stockRevenue)}
              </TableCell>
              <TableCell align="right" sx={{ color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                {fmt(r.printerRevenue)}
              </TableCell>
              <TableCell align="right" sx={{ color: "#334155", fontWeight: 500, whiteSpace: "nowrap" }}>
                {fmt(r.otherRevenue)}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ py: 2, fontFamily: "'Poppins', sans-serif", fontSize: "12px" }}
                >
                  No Data available for the period
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SummaryTable;
