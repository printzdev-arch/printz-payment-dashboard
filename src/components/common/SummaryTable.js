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
      elevation={1}
      sx={{
        borderRadius: 2,
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        maxHeight: { xs: 320, md: 520 },
      }}
    >
      <Table
        size="small"
        stickyHeader
        aria-label="Branch revenue summary"
        sx={{ tableLayout: "auto", width: "100%", minWidth: 600 }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, color: "#4b5563", width: 72 }}>
              S.No
            </TableCell>
            <TableCell sx={{ fontWeight: 600, color: "#4b5563" }}>
              Branch Name
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 600, color: "#4b5563", whiteSpace: "nowrap" }}
            >
              Total Revenue
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 600, color: "#4b5563", whiteSpace: "nowrap" }}
            >
              Stock Revenue
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 600, color: "#4b5563", whiteSpace: "nowrap" }}
            >
              Printer Revenue
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 600, color: "#4b5563", whiteSpace: "nowrap" }}
            >
              Other Revenue
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={r.branchName} hover>
              <TableCell sx={{ color: "#6b7280" }}>{idx + 1}</TableCell>
              <TableCell sx={{ color: "#6b7280" }}>{r.branchName}</TableCell>
              <TableCell align="right" sx={{ color: "#374151" }}>
                {fmt(r.totalRevenue)}
              </TableCell>
              <TableCell align="right" sx={{ color: "#374151" }}>
                {fmt(r.stockRevenue)}
              </TableCell>
              <TableCell align="right" sx={{ color: "#374151" }}>
                {fmt(r.printerRevenue)}
              </TableCell>
              <TableCell align="right" sx={{ color: "#374151" }}>
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
                  sx={{ py: 2 }}
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
