/**
 * Escape text before it is placed inside generated HTML (printed invoices and receipts), so a customer name
 * or remark that contains markup is shown as text and can never run as script in the browser.
 */
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

const escapeHtml = (value) => (value === undefined || value === null ? "" : String(value).replace(/[&<>"'`]/g, (c) => MAP[c]));

module.exports = { escapeHtml };
