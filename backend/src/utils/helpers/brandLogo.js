/**
 * The original PrintZ logo (src/assets/logo.png), loaded once, for emails, receipts and PDFs.
 * If the file is missing the documents are still produced, just without the logo.
 */
const fs = require("fs");
const path = require("path");

const LOGO_PATH = path.join(__dirname, "../../assets/logo.png");

let buffer = null;
try {
  buffer = fs.readFileSync(LOGO_PATH);
} catch (e) {
  buffer = null;
}

module.exports = {
  LOGO_PATH,
  logoBuffer: buffer,
  /** For printable HTML pages (an <img src> that needs no extra request). */
  logoDataUri: buffer ? `data:image/png;base64,${buffer.toString("base64")}` : "",
};
