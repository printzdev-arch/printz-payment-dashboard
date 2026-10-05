import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

// Global jsPDF autoTable plugin registration for Vite ESM environment:
try {
  applyPlugin(jsPDF);
  if (typeof window !== 'undefined') {
    window.jsPDF = jsPDF;
    window.jspdf = { jsPDF };
  }
} catch (e) {
  console.warn('Could not register jsPDF autoTable globally:', e);
}

// Global Calendar Picker Behavior:
// Clicking anywhere in a date input field or its icon/wrapper opens the calendar picker!
if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (event) => {
      // 1. Direct click on input[type="date"]
      if (
        event.target &&
        event.target.tagName === 'INPUT' &&
        event.target.type === 'date'
      ) {
        try {
          if (typeof event.target.showPicker === 'function') {
            event.target.showPicker();
          }
        } catch (err) {
          // Silently catch if already open or prevented
        }
        return;
      }

      // 2. Click on an icon, wrapper, container, or label associated with a date input
      const container = event.target.closest(
        '.stock-input-wrapper, .revenue-input-wrapper, .printer-date-picker-wrapper, .jumbo-date-picker-wrapper, .total-date-picker-wrapper, .form-group, .date-input-wrapper, .stock-date-input-wrapper, .printer-date-input-wrapper, .jumbo-date-input-wrapper, .total-date-input-wrapper, .add-assets-input-wrap, .display-readings-input-wrapper, .revenue-date-wrapper, label'
      );
      if (container) {
        const dateInput = container.querySelector('input[type="date"]');
        if (dateInput) {
          try {
            if (typeof dateInput.showPicker === 'function') {
              dateInput.showPicker();
            } else {
              dateInput.focus();
            }
          } catch (err) {}
          return;
        }

        // 3. If it's a react-datepicker container, click the input to open its dropdown
        const rdpInput = container.querySelector(
          '.react-datepicker__input-container input, .revenue-date-input'
        );
        if (rdpInput && rdpInput !== event.target) {
          try {
            rdpInput.focus();
            rdpInput.click();
          } catch (err) {}
        }
      }
    },
    true // Capture phase: triggers before any stopPropagation
  );
}

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);