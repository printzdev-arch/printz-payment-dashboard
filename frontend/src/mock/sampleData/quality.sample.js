/**
 * PrintZ Sample Data - Quality Control & Rework / Reprint (Step 10)
 */

export const defaultQcChecklistTemplate = [
  {
    "id": "chk_01",
    "item": "Color accuracy & density",
    "description": "Match against customer approved proof v2 with delta-E tolerance < 2.0",
    "defaultResult": "PASS",
    "category": "PRINTING"
  },
  {
    "id": "chk_02",
    "item": "Registration & alignment",
    "description": "Front-to-back register alignment within ±0.2 mm",
    "defaultResult": "PASS",
    "category": "PRINTING"
  },
  {
    "id": "chk_03",
    "item": "Dimensions & cutting precision",
    "description": "Cut dimensions accurate to spec (3.5\" x 2.0\") with zero bleed shear",
    "defaultResult": "PASS",
    "category": "CUTTING"
  },
  {
    "id": "chk_04",
    "item": "Lamination adhesion & surface finish",
    "description": "Velvet matte thermal coating free of air bubbles, haze, or edge lifting",
    "defaultResult": "PASS",
    "category": "FINISHING"
  },
  {
    "id": "chk_05",
    "item": "Special embellishment (Foil / Spot UV)",
    "description": "Gold hot-foil stamping crispness, sharp edge definition, no flaking",
    "defaultResult": "PASS",
    "category": "FINISHING"
  },
  {
    "id": "chk_06",
    "item": "Surface defect inspection",
    "description": "No ink spray, streaks, roller marks, scratches, or paper creases",
    "defaultResult": "PASS",
    "category": "GENERAL"
  },
  {
    "id": "chk_07",
    "item": "Total count & packaging verification",
    "description": "Exact 1,000 good cards accounted into boxes of 100 with job traveler",
    "defaultResult": "PASS",
    "category": "PACKING"
  }
];

export const sampleDefectCatalogue = [
  {
    "code": "COLOR_MISMATCH",
    "name": "Color Mismatch / Delta Shift",
    "category": "PRINTING",
    "defaultSeverity": "MEDIUM",
    "description": "Color tone differs noticeably from approved digital sample proof"
  },
  {
    "code": "REGISTRATION_OFF",
    "name": "Registration Misalignment",
    "category": "PRINTING",
    "defaultSeverity": "HIGH",
    "description": "CMYK plates or front-to-back alignment shifted beyond ±0.5 mm"
  },
  {
    "code": "CUT_SIZE_ERROR",
    "name": "Cutting / Trimming Deviation",
    "category": "CUTTING",
    "defaultSeverity": "HIGH",
    "description": "Finished cards trimmed shorter/longer or crooked edge lines"
  },
  {
    "code": "LAMINATION_BUBBLE",
    "name": "Lamination Peeling / Bubbles",
    "category": "FINISHING",
    "defaultSeverity": "MEDIUM",
    "description": "Trapped air or poor thermal bond causing film delamination"
  },
  {
    "code": "FOIL_PEELING",
    "name": "Foil Defect / Flaking",
    "category": "FINISHING",
    "defaultSeverity": "HIGH",
    "description": "Gold foil stamp incomplete, pitted, or rubbing off easily"
  },
  {
    "code": "INK_STREAK",
    "name": "Ink Streaks / Roller Marks",
    "category": "PRINTING",
    "defaultSeverity": "MEDIUM",
    "description": "Horizontal or vertical banding from print head/cylinder artifact"
  },
  {
    "code": "SURFACE_SCRATCH",
    "name": "Surface Scratches / Handling Damage",
    "category": "GENERAL",
    "defaultSeverity": "LOW",
    "description": "Scratches on coating incurred during post-press handling"
  }
];

export const sampleQualityChecks = [
  {
    "id": "qc_1791550359201_boury",
    "qcNo": "QC-KO-2610-4203",
    "productionOrderId": "po_2026_000002",
    "productionNo": "PR-KO-2610-0020",
    "jobOrderId": "job_2026_00045",
    "jobNo": "JO-KO-2610-0045",
    "jobItemId": "item_00045_1",
    "customerName": "ABC Printers",
    "customerCode": "CUS-000184",
    "productName": "Visiting Card",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Kothanur",
    "checkType": "FINAL",
    "cycleNo": 0,
    "quantityChecked": 1012,
    "acceptedQty": 1012,
    "rejectedQty": 0,
    "result": "PASS",
    "correctiveAction": "NONE",
    "checklist": [
      {
        "id": "chk_01",
        "item": "Color accuracy & density",
        "result": "PASS",
        "notes": ""
      },
      {
        "id": "chk_02",
        "item": "Registration & alignment",
        "result": "PASS",
        "notes": ""
      },
      {
        "id": "chk_03",
        "item": "Dimensions & cutting precision",
        "result": "PASS",
        "notes": ""
      },
      {
        "id": "chk_04",
        "item": "Lamination adhesion & surface finish",
        "result": "PASS",
        "notes": ""
      },
      {
        "id": "chk_05",
        "item": "Special embellishment (Foil / Spot UV)",
        "result": "PASS",
        "notes": ""
      },
      {
        "id": "chk_06",
        "item": "Surface defect inspection",
        "result": "PASS",
        "notes": ""
      },
      {
        "id": "chk_07",
        "item": "Total count & packaging verification",
        "result": "PASS",
        "notes": ""
      }
    ],
    "defects": [],
    "issueDetails": "",
    "comments": "",
    "checkedBy": "Arun Kumar (Banaswadi)",
    "checkedById": "64f2a1b2c3d4e5f6a7b80003",
    "checkedAt": "2026-10-09T12:52:39.201Z",
    "createdAt": "2026-10-09T12:52:39.201Z"
  },
  {
    "id": "qc_001",
    "qcNo": "QC-KO-2610-0008",
    "productionOrderId": "po_001",
    "productionNo": "PR-KO-2610-0018",
    "jobOrderId": "job_001",
    "jobNo": "JO-KO-2610-0044",
    "jobItemId": "item_001",
    "customerName": "Global Logistics Ltd",
    "customerCode": "CUST-0091",
    "productName": "Corporate Brochures A4",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Kothanur",
    "checkType": "FINAL",
    "cycleNo": 0,
    "quantityChecked": 500,
    "acceptedQty": 500,
    "rejectedQty": 0,
    "result": "PASS",
    "correctiveAction": "NONE",
    "checklist": [
      {
        "item": "Color accuracy",
        "result": "PASS",
        "notes": "Matched proof perfectly"
      },
      {
        "item": "Folding alignment",
        "result": "PASS",
        "notes": "Tri-fold crisp"
      },
      {
        "item": "Paper thickness",
        "result": "PASS",
        "notes": "250 GSM verified"
      }
    ],
    "defects": [],
    "comments": "High quality output, clean edges, approved for packing hand-off.",
    "checkedBy": "Lakshmi P",
    "checkedById": "64f2a1b2c3d4e5f6a7b80035",
    "checkedAt": "2026-09-18T14:30:00.000Z",
    "createdAt": "2026-09-18T14:30:00.000Z"
  },
  {
    "id": "qc_bw_001",
    "qcNo": "QC-BW-2610-0011",
    "productionOrderId": "po_bw_001",
    "productionNo": "PR-BW-2610-0031",
    "jobOrderId": "job_bw_004",
    "jobNo": "JOB-2026-00064",
    "jobItemId": "item_bw_004_1",
    "customerName": "Dr. Kavitha Murthy",
    "customerCode": "CUS-BW-004",
    "productName": "Doctor Prescription Pads (A5)",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "checkType": "FINAL",
    "cycleNo": 0,
    "quantityChecked": 30,
    "acceptedQty": 30,
    "rejectedQty": 0,
    "result": "PASS",
    "correctiveAction": "NONE",
    "checklist": [
      { "item": "Color accuracy & density", "result": "PASS", "notes": "Solid crisp typography" },
      { "item": "Dimensions & cutting precision", "result": "PASS", "notes": "A5 148x210mm exact" },
      { "item": "Padding & binding strength", "result": "PASS", "notes": "Top glue firm, sheets tear cleanly" }
    ],
    "defects": [],
    "comments": "Inspected all 30 pads. Padding and perforation verified. Approved for dispatch.",
    "checkedBy": "Arun Kumar (Banaswadi)",
    "checkedById": "64f2a1b2c3d4e5f6a7b80003",
    "checkedAt": "2026-10-10T14:30:00.000Z",
    "createdAt": "2026-10-10T14:30:00.000Z"
  },
  {
    "id": "qc_bw_002",
    "qcNo": "QC-BW-2610-0012",
    "productionOrderId": "po_bw_002",
    "productionNo": "PR-BW-2610-0032",
    "jobOrderId": "job_bw_005",
    "jobNo": "JOB-2026-00065",
    "jobItemId": "item_bw_005_1",
    "customerName": "Rajesh Nambiar",
    "customerCode": "CUS-BW-005",
    "productName": "Annual Financial Report Book",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "checkType": "FINAL",
    "cycleNo": 0,
    "quantityChecked": 150,
    "acceptedQty": 150,
    "rejectedQty": 0,
    "result": "PASS",
    "correctiveAction": "NONE",
    "checklist": [
      { "item": "Binding integrity", "result": "PASS", "notes": "Perfect bind spine square & firm" },
      { "item": "Cover soft-touch finish", "result": "PASS", "notes": "Velvet feel flawless, no scuffs" },
      { "item": "Page sequence & collation", "result": "PASS", "notes": "All 150 pages verified" }
    ],
    "defects": [],
    "comments": "Executive quality. Shrink wrapped in bundles of 25. Ready for billing & delivery.",
    "checkedBy": "Arun Kumar (Banaswadi)",
    "checkedById": "64f2a1b2c3d4e5f6a7b80003",
    "checkedAt": "2026-10-08T16:00:00.000Z",
    "createdAt": "2026-10-08T16:00:00.000Z"
  }
];

export const sampleReprintRequests = [
  {
    "id": "rep_bw_001",
    "reprintNo": "RP-BW-2610-0002",
    "productionOrderId": "po_bw_001",
    "productionNo": "PR-BW-2610-0031",
    "jobOrderId": "job_bw_004",
    "jobNo": "JOB-2026-00064",
    "jobItemId": "item_bw_004_1",
    "customerName": "Dr. Kavitha Murthy",
    "productName": "Doctor Prescription Pads (A5)",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "quantity": 3,
    "originalCycleNo": 0,
    "reworkCycleNo": "R1",
    "sourceStage": "CUTTING",
    "restartFromOperationCode": "PRINTING",
    "restartFromOperationName": "Reprint 3 Pads",
    "reason": "Slight ink roller smudging on 3 pads during stack separation",
    "defects": [
      {
        "code": "INK_STREAK",
        "severity": "MEDIUM",
        "quantity": 3,
        "description": "Ink streak on bottom margin"
      }
    ],
    "status": "COMPLETED",
    "type": "REPRINT",
    "requestedBy": "Operator B (Banaswadi)",
    "requestedById": "64f2a1b2c3d4e5f6a7b80005",
    "requestedAt": "2026-10-10T11:00:00.000Z",
    "approvedBy": "Arun Kumar (Branch Manager)",
    "approvedById": "64f2a1b2c3d4e5f6a7b80003",
    "approvedAt": "2026-10-10T11:15:00.000Z",
    "createdAt": "2026-10-10T11:00:00.000Z"
  },
  {
    "id": "rep_001",
    "reprintNo": "RP-KO-2610-0001",
    "productionOrderId": "po_002",
    "productionNo": "PR-KO-2610-0017",
    "jobOrderId": "job_002",
    "jobNo": "JO-KO-2610-0043",
    "jobItemId": "item_002",
    "customerName": "Zenith Retailers",
    "productName": "Product Hang Tags",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Kothanur",
    "quantity": 150,
    "originalCycleNo": 0,
    "reworkCycleNo": "R1",
    "sourceStage": "CUTTING",
    "restartFromOperationCode": "OP_CUT",
    "restartFromOperationName": "Die Cutting & Hole Punching",
    "reason": "Die-cut misalignment on last 150 cards; hole punched 3mm off center",
    "defects": [
      {
        "code": "CUT_SIZE_ERROR",
        "severity": "HIGH",
        "quantity": 150,
        "description": "Hole punched outside safe margin"
      }
    ],
    "status": "APPROVED",
    "type": "REWORK",
    "requestedBy": "Lakshmi P (QC Inspector)",
    "requestedById": "64f2a1b2c3d4e5f6a7b80035",
    "requestedAt": "2026-09-17T11:20:00.000Z",
    "approvedBy": "Arun Kumar (Branch Manager)",
    "approvedById": "64f2a1b2c3d4e5f6a7b80003",
    "approvedAt": "2026-09-17T12:00:00.000Z",
    "createdAt": "2026-09-17T11:20:00.000Z"
  }
];
