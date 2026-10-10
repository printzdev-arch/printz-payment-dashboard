/**
 * PrintZ V3 - Job & Requirement Capture Constants
 * Master specifications and domain presets for enterprise print jobs.
 */

export const JOB_STATUS = {
  DRAFT: "DRAFT",
  REQUIREMENT_CAPTURED: "REQUIREMENT_CAPTURED",
  ESTIMATE_PENDING: "ESTIMATE_PENDING",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
};

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "#64748b", badgeVariant: "neutral" },
  { value: "NORMAL", label: "Normal", color: "#0284c7", badgeVariant: "info" },
  { value: "HIGH", label: "High", color: "#d97706", badgeVariant: "warning" },
  { value: "URGENT", label: "Urgent (Priority Rush)", color: "#dc2626", badgeVariant: "danger" }
];

export const SOURCE_OPTIONS = [
  { value: "WALK_IN", label: "Walk-in Store Customer" },
  { value: "QR", label: "QR Standee Self-Registration" },
  { value: "PHONE", label: "Phone / WhatsApp Enquiry" },
  { value: "ONLINE", label: "Online Portal / Email" },
  { value: "OTHER", label: "Other Channel" }
];

export const PRODUCT_CATEGORIES = [
  {
    id: "stationery",
    name: "Business Stationery",
    items: ["Visiting Card", "Letterhead", "Envelope", "ID Card & Lanyard", "Notepad", "Bill Book / Voucher"]
  },
  {
    id: "marketing",
    name: "Marketing & Promo",
    items: ["Brochure (Bi-Fold / Tri-Fold)", "Flyer / Leaflet", "Poster", "Catalog / Booklet", "Menu Card", "Danglers"]
  },
  {
    id: "large_format",
    name: "Signage & Large Format",
    items: ["Flex Banner (Frontlit / Star)", "Roll-up Standee", "Vinyl Sticker / Decal", "Sunboard Mounting", "Canopy Tent", "Backlit Board"]
  },
  {
    id: "custom",
    name: "Specialty & Custom",
    items: ["Wedding / Event Invitation", "Packaging Box / Sleeve", "Stickers & Labels", "Certificate", "Calendar", "Custom Job"]
  }
];

export const ALL_PRODUCTS = PRODUCT_CATEGORIES.flatMap((cat) => cat.items);

export const UNIT_OPTIONS = [
  { value: "PCS", label: "Pieces (Pcs)" },
  { value: "BOX", label: "Boxes (Box)" },
  { value: "SHEET", label: "Sheets" },
  { value: "SET", label: "Sets" },
  { value: "METER", label: "Running Meters" },
  { value: "SQFT", label: "Square Feet (Sq.Ft)" },
  { value: "BOOK", label: "Books" },
  { value: "ROLL", label: "Rolls" }
];

export const SIZE_PRESETS = [
  { label: "A4 (210 × 297 mm)", value: "A4", width: 210, height: 297, unit: "MM" },
  { label: "A5 (148 × 210 mm)", value: "A5", width: 148, height: 210, unit: "MM" },
  { label: "A6 (105 × 148 mm)", value: "A6", width: 105, height: 148, unit: "MM" },
  { label: "A3 (297 × 420 mm)", value: "A3", width: 297, height: 420, unit: "MM" },
  { label: "Visiting Card (3.5 × 2.0 in)", value: "VC_STD", width: 3.5, height: 2.0, unit: "INCH" },
  { label: "12 × 18 inch (Sheet)", value: "12X18", width: 12, height: 18, unit: "INCH" },
  { label: "13 × 19 inch (SRA3)", value: "SRA3", width: 13, height: 19, unit: "INCH" },
  { label: "Letter (8.5 × 11.0 in)", value: "LETTER", width: 8.5, height: 11.0, unit: "INCH" },
  { label: "Roll-up Standee (2 × 5 ft)", value: "STANDEE_2X5", width: 2, height: 5, unit: "FEET" },
  { label: "Roll-up Standee (3 × 6 ft)", value: "STANDEE_3X6", width: 3, height: 6, unit: "FEET" },
  { label: "Custom Dimension", value: "CUSTOM", width: "", height: "", unit: "INCH" }
];

export const SIZE_UNITS = [
  { value: "INCH", label: "Inches (in)" },
  { value: "MM", label: "Millimeters (mm)" },
  { value: "CM", label: "Centimeters (cm)" },
  { value: "FEET", label: "Feet (ft)" }
];

export const PRINTING_SIDE_OPTIONS = [
  { value: "SINGLE_SIDE", label: "Single Side (Front Only)" },
  { value: "DOUBLE_SIDE", label: "Double Side (Front & Back)" }
];

export const COLOUR_MODE_OPTIONS = [
  { value: "COLOUR", label: "Full Colour (CMYK)" },
  { value: "BLACK_WHITE", label: "Black & White (Monochrome)" },
  { value: "SPOT_COLOUR", label: "Spot Colour / Pantone" },
  { value: "METALLIC", label: "Metallic / White Ink" }
];

export const PAPER_MATERIALS = [
  { type: "Art Card", gsmList: [250, 300, 350, 400], desc: "Premium coated cardstock for visiting cards, covers, invites" },
  { type: "Art Paper / Gloss Paper", gsmList: [130, 170, 210, 250], desc: "Glossy paper for brochures, flyers, catalogs" },
  { type: "Executive Bond Paper", gsmList: [85, 100, 120], desc: "High-grade textured paper for corporate letterheads" },
  { type: "Maplitho / Plain Paper", gsmList: [70, 80, 90, 100], desc: "Standard uncoated paper for bill books, forms, flyers" },
  { type: "Kraft Paper", gsmList: [120, 200, 280, 350], desc: "Eco-friendly brown craft paper for rustic tags & bags" },
  { type: "Vinyl Sticker (Gloss / Matte)", gsmList: [120, 150], desc: "Self-adhesive gumming vinyl for waterproof decals" },
  { type: "Frontlit Star Flex Banner", gsmList: [280, 340, 440], desc: "Durable PVC flex for outdoor banners & hoardings" },
  { type: "Sunboard Sheet (3mm / 5mm)", gsmList: [3, 5], desc: "Rigid foam board mounting for signage & displays" },
  { type: "Metallic / Texture Sheet", gsmList: [280, 300], desc: "Gold, Silver, Pearl and textured luxury sheets" },
  { type: "Other Custom Material", gsmList: [100, 200, 300], desc: "Client-supplied or custom procured media" }
];

export const FINISHING_OPTIONS = [
  { id: "CUTTING", label: "Precision Cutting & Trimming", category: "Fabrication" },
  { id: "LAMINATION_MATTE", label: "Matte Lamination", category: "Coating" },
  { id: "LAMINATION_GLOSS", label: "Gloss Lamination", category: "Coating" },
  { id: "LAMINATION_VELVET", label: "Velvet / Soft-Touch Lamination", category: "Coating" },
  { id: "CREASING", label: "Creasing / Score Lines", category: "Binding" },
  { id: "FOLDING", label: "Half / Tri / Gate Folding", category: "Binding" },
  { id: "PERFORATION", label: "Tear-off Perforation", category: "Fabrication" },
  { id: "ROUND_CORNER", label: "Round Corner Die-Cut", category: "Fabrication" },
  { id: "SPIRAL_BINDING", label: "Spiral / Wiro Binding", category: "Binding" },
  { id: "STAPLE_BINDING", label: "Center Staple / Saddle Stitch", category: "Binding" },
  { id: "PERFECT_BINDING", label: "Perfect Book Binding", category: "Binding" },
  { id: "SPOT_UV", label: "Spot UV Gloss Coating", category: "Specialty" },
  { id: "FOILING_GOLD", label: "Gold Foil Stamping", category: "Specialty" },
  { id: "FOILING_SILVER", label: "Silver Foil Stamping", category: "Specialty" },
  { id: "EMBOSSING", label: "Embossing / Debossing", category: "Specialty" },
  { id: "EYELETS", label: "Metal Eyelets / Grommets", category: "Signage" },
  { id: "MOUNTING", label: "Sunboard / Foam Mounting", category: "Signage" },
  { id: "PACKING", label: "Shrink Wrap / Bundle Packing", category: "Packaging" }
];
