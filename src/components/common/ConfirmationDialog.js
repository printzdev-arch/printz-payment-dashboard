import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";

/**
 * Reusable Confirmation Dialog Component
 *
 * Props:
 * - open: boolean - Controls dialog visibility
 * - onClose: function - Called when dialog is closed without confirmation
 * - onConfirm: function - Called when user clicks confirm button
 * - title: string - Main title of the dialog
 * - subtitle: string (optional) - Subtitle below the title
 * - description: string - Description text explaining the action
 * - icon: React element or string (emoji) - Icon to display (optional)
 * - confirmText: string - Text for confirm button (default: "Yes")
 * - cancelText: string - Text for cancel button (default: "Cancel")
 * - confirmColor: string - Background color for confirm button (default: "#e91e63" - pink)
 *
 * Usage:
 * <ConfirmationDialog
 *   open={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onConfirm={handleConfirm}
 *   title="Delete Item"
 *   description="Are you sure you want to delete this item?"
 *   icon={<FaTrash />}
 *   confirmText="Delete"
 *   confirmColor="#dc3545"
 * />
 */
const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  icon,
  confirmText = "Yes",
  cancelText = "Cancel",
  confirmColor = "#e91e63",
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="confirmation-dialog-title"
        style={{
          textAlign: "center",
          paddingBottom: subtitle ? "8px" : "16px",
        }}
      >
        {icon && (
          <Box
            style={{
              marginBottom: "16px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {typeof icon === "string" ? (
              <span style={{ fontSize: "48px" }}>{icon}</span>
            ) : (
              React.cloneElement(icon, { size: 48, color: "#dc3545" })
            )}
          </Box>
        )}
        <Typography variant="h6" component="div" style={{ fontWeight: "bold" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="subtitle1"
            color="textSecondary"
            style={{ marginTop: "4px" }}
          >
            {subtitle}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          id="confirmation-dialog-description"
          style={{
            textAlign: "center",
            fontSize: "16px",
            lineHeight: "1.5",
          }}
        >
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions style={{ justifyContent: "center", padding: "16px 24px" }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          style={{
            borderColor: "#ccc",
            color: "#333",
            marginRight: "8px",
            minWidth: "100px",
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          style={{
            backgroundColor: confirmColor,
            color: "white",
            minWidth: "100px",
          }}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
