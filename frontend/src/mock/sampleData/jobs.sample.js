/**
 * PrintZ Sample Data - Job Orders & Requirement Specifications (Step 2)
 */

export const sampleJobs = [
  {
    "_id": "job_1791476197570_lld97",
    "id": "job_1791476197570_lld97",
    "jobId": "job_1791476197570_lld97",
    "jobNo": "JOB-2026-00053",
    "customerId": "cus_1791463063854_p70e5",
    "customerCode": "CUS-000190",
    "customerName": "Pranesh",
    "customerMobile": "9361474617",
    "customerCompany": "",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "visiting card",
    "priority": "NORMAL",
    "source": "QR",
    "status": "ESTIMATE_PENDING",
    "expectedDeliveryDate": "2026-10-23",
    "notes": "",
    "itemCount": 1,
    "totalQuantity": 1000,
    "items": [
      {
        "jobItemId": "item_1791476148312_1",
        "jobId": "job_1791476197570_lld97",
        "itemName": "Visiting Card",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "size": {
          "type": "PRESET",
          "presetName": "Visiting Card (3.5 × 2.0 in)",
          "width": 3.5,
          "height": 2,
          "unit": "INCH"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Art Card",
          "gsm": 300,
          "paperSize": "SRA3",
          "notes": ""
        },
        "finishing": [
          "CUTTING",
          "LAMINATION_MATTE"
        ],
        "designRequired": true,
        "designNotes": "",
        "notes": "",
        "status": "REQUIREMENT_CAPTURED"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T16:16:37.570Z",
    "updatedAt": "2026-10-08T16:16:37.570Z",
    "estimateId": "est_1791476253526_23n21",
    "estimateNo": "EST-2026-00010",
    "estimatedAmount": 2217.55
  },
  {
    "_id": "job_1791463209956_qhjj1",
    "id": "job_1791463209956_qhjj1",
    "jobId": "job_1791463209956_qhjj1",
    "jobNo": "JOB-2026-00052",
    "customerId": "cus_1791463063854_p70e5",
    "customerCode": "CUS-000190",
    "customerName": "Pranesh",
    "customerMobile": "9361474617",
    "customerCompany": "",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Billing Xerox Copies",
    "priority": "NORMAL",
    "source": "QR",
    "status": "REQUIREMENT_CAPTURED",
    "expectedDeliveryDate": "2026-10-15",
    "notes": "While deliver call me before 2 hrs.",
    "itemCount": 1,
    "totalQuantity": 50,
    "items": [
      {
        "jobItemId": "item_1791463090882_1",
        "jobId": "job_1791463209956_qhjj1",
        "itemName": "Letterhead",
        "productType": "Letterhead",
        "quantity": 50,
        "unit": "PCS",
        "size": {
          "type": "PRESET",
          "presetName": "A4 (210 × 297 mm)",
          "width": 210,
          "height": 297,
          "unit": "MM"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "BLACK_WHITE"
        },
        "material": {
          "paperType": "Art Paper / Gloss Paper",
          "gsm": 130,
          "paperSize": "A4",
          "notes": ""
        },
        "finishing": [
          "CUTTING"
        ],
        "designRequired": true,
        "designNotes": "",
        "notes": "",
        "status": "REQUIREMENT_CAPTURED"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T12:40:09.956Z",
    "updatedAt": "2026-10-08T12:40:09.956Z"
  },
  {
    "_id": "job_1791454942277_2jjuy",
    "id": "job_1791454942277_2jjuy",
    "jobId": "job_1791454942277_2jjuy",
    "jobNo": "JOB-2026-00051",
    "customerId": "cus_1791451854648_d5l4v",
    "customerCode": "CUS-000189",
    "customerName": "Guna",
    "customerMobile": "9876543211",
    "customerCompany": "MRF tyres",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "10X4 Flex",
    "priority": "HIGH",
    "source": "WALK_IN",
    "status": "READY_FOR_PRODUCTION",
    "expectedDeliveryDate": "2026-10-24",
    "notes": "While deliver call me before 2 hrs.",
    "itemCount": 1,
    "totalQuantity": 7,
    "items": [
      {
        "jobItemId": "item_1791454446070_1",
        "jobId": "job_1791454942277_2jjuy",
        "itemName": "Flex Banner (Frontlit / Star)",
        "productType": "Flex Banner (Frontlit / Star)",
        "quantity": 7,
        "unit": "SQFT",
        "size": {
          "type": "CUSTOM",
          "presetName": "Custom Dimension",
          "width": 10,
          "height": 4,
          "unit": "FEET"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Frontlit Star Flex Banner",
          "gsm": 340,
          "paperSize": "Roll",
          "notes": ""
        },
        "finishing": [
          "MOUNTING"
        ],
        "designRequired": true,
        "designNotes": "",
        "notes": "Keep 2 as separate , and 5 as separate",
        "status": "DESIGN_APPROVED"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T10:22:22.277Z",
    "updatedAt": "2026-10-08T16:03:53.003Z",
    "estimateId": "est_1791455574647_jlmxv",
    "estimateNo": "EST-2026-00007",
    "estimatedAmount": 9312.56,
    "timeline": [
      {
        "event": "ESTIMATE_ACCEPTED",
        "status": "ESTIMATE_ACCEPTED",
        "actor": "Customer (Online Approval)",
        "timestamp": "2026-10-08T10:52:32.460Z",
        "notes": "Commercial quotation EST-2026-00007-V2 confirmed for ₹9312.56"
      },
      {
        "event": "DESIGN_ASSIGNMENT_CREATED",
        "status": "DESIGN_PENDING",
        "actor": "System Workflow",
        "timestamp": "2026-10-08T10:52:32.460Z",
        "notes": "Design Assignment DES-2026-00006 created for Flex Banner (Frontlit / Star)"
      },
      {
        "event": "ESTIMATE_ACCEPTED",
        "status": "ESTIMATE_ACCEPTED",
        "actor": "Customer (Online Approval)",
        "timestamp": "2026-10-08T10:57:58.308Z",
        "notes": "Commercial quotation EST-2026-00007-V2 confirmed for ₹9312.56"
      },
      {
        "event": "DESIGN_PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-10-08T11:45:00.600Z",
        "notes": "Design Proof Sample V1 submitted for Flex Banner (Frontlit / Star)"
      },
      {
        "event": "DESIGN_PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-10-08T11:45:57.454Z",
        "notes": "Design Proof Sample V2 submitted for Flex Banner (Frontlit / Star)"
      },
      {
        "event": "PROOF_APPROVED",
        "status": "DESIGN_APPROVED",
        "actor": "Customer",
        "timestamp": "2026-10-08T11:59:34.921Z",
        "notes": "Design approved for Flex Banner (Frontlit / Star) (Proof V2)"
      },
      {
        "event": "READY_FOR_PRODUCTION",
        "status": "READY_FOR_PRODUCTION",
        "actor": "System Workflow",
        "timestamp": "2026-10-08T11:59:34.921Z",
        "notes": "All job item design proofs approved. Ready for Production stage."
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "READY_FOR_PRODUCTION",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T12:08:33.104Z",
        "notes": "Designer Priya R assigned to item: Flex Banner (Frontlit / Star)"
      },
      {
        "event": "PROOF_APPROVED",
        "status": "DESIGN_APPROVED",
        "actor": "Customer",
        "timestamp": "2026-10-08T12:09:11.666Z",
        "notes": "Design approved for Flex Banner (Frontlit / Star) (Proof V2)"
      },
      {
        "event": "READY_FOR_PRODUCTION",
        "status": "READY_FOR_PRODUCTION",
        "actor": "System Workflow",
        "timestamp": "2026-10-08T12:09:11.666Z",
        "notes": "All job item design proofs approved. Ready for Production stage."
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "READY_FOR_PRODUCTION",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T16:03:31.536Z",
        "notes": "Designer Anjali K assigned to item: Flex Banner (Frontlit / Star)"
      },
      {
        "event": "PROOF_APPROVED",
        "status": "DESIGN_APPROVED",
        "actor": "Customer",
        "timestamp": "2026-10-08T16:03:53.003Z",
        "notes": "Design approved for Flex Banner (Frontlit / Star) (Proof V2)"
      },
      {
        "event": "READY_FOR_PRODUCTION",
        "status": "READY_FOR_PRODUCTION",
        "actor": "System Workflow",
        "timestamp": "2026-10-08T16:03:53.003Z",
        "notes": "All job item design proofs approved. Ready for Production stage."
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "READY_FOR_PRODUCTION",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T16:18:59.043Z",
        "notes": "Designer Rahul M assigned to item: Flex Banner (Frontlit / Star)"
      }
    ]
  },
  {
    "_id": "job_2026_00045",
    "id": "job_2026_00045",
    "jobId": "job_2026_00045",
    "jobNo": "JOB-2026-00045",
    "customerId": "cus_000184",
    "customerCode": "CUS-000184",
    "customerName": "ABC Printers",
    "customerMobile": "9876543210",
    "customerCompany": "ABC Printers Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Visiting Card Printing & Corporate Stationery",
    "priority": "NORMAL",
    "source": "WALK_IN",
    "status": "READY_FOR_PRODUCTION",
    "expectedDeliveryDate": "2026-10-15",
    "notes": "Customer requested premium matte finish. Urgent delivery required before Friday.",
    "itemCount": 2,
    "totalQuantity": 1500,
    "items": [
      {
        "jobItemId": "item_00045_1",
        "jobId": "job_2026_00045",
        "itemName": "Visiting Card",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "size": {
          "type": "PRESET",
          "presetName": "Visiting Card (3.5 × 2.0 in)",
          "width": 3.5,
          "height": 2,
          "unit": "INCH"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Art Card",
          "gsm": 300,
          "paperSize": "SRA3",
          "notes": "Premium coated cardstock"
        },
        "finishing": [
          "CUTTING",
          "LAMINATION_MATTE"
        ],
        "designRequired": true,
        "designNotes": "New executive layout, 2 revisions included",
        "notes": "Pack in standard plastic boxes of 100",
        "status": "DESIGN_APPROVED"
      },
      {
        "jobItemId": "item_00045_2",
        "jobId": "job_2026_00045",
        "itemName": "Corporate Letterhead",
        "productType": "Letterhead",
        "quantity": 500,
        "unit": "SHEET",
        "size": {
          "type": "PRESET",
          "presetName": "A4 (210 × 297 mm)",
          "width": 210,
          "height": 297,
          "unit": "MM"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Executive Bond Paper",
          "gsm": 100,
          "paperSize": "A4",
          "notes": "Fine watermarked bond paper"
        },
        "finishing": [
          "CUTTING",
          "PACKING"
        ],
        "designRequired": false,
        "designNotes": "",
        "notes": "Customer will supply high-res vector logo in PDF",
        "status": "REQUIREMENT_CAPTURED"
      }
    ],
    "createdBy": "Arun Kumar (Branch Manager)",
    "createdAt": "2026-10-06T10:30:00.000Z",
    "updatedAt": "2026-10-08T16:20:20.132Z",
    "timeline": [
      {
        "event": "PROOF_APPROVED",
        "status": "DESIGN_APPROVED",
        "actor": "Customer",
        "timestamp": "2026-10-08T16:20:20.132Z",
        "notes": "Design approved for Visiting Card (Proof V2)"
      },
      {
        "event": "READY_FOR_PRODUCTION",
        "status": "READY_FOR_PRODUCTION",
        "actor": "System Workflow",
        "timestamp": "2026-10-08T16:20:20.132Z",
        "notes": "All job item design proofs approved. Ready for Production stage."
      }
    ]
  },
  {
    "_id": "job_2026_00046",
    "id": "job_2026_00046",
    "jobId": "job_2026_00046",
    "jobNo": "JOB-2026-00046",
    "customerId": "cus_000185",
    "customerCode": "CUS-000185",
    "customerName": "Nova Tech Solutions",
    "customerMobile": "9845012345",
    "customerCompany": "Nova Tech Enterprises Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Product Launch Tri-Fold Brochures & Roll-Up Standee",
    "priority": "HIGH",
    "source": "PHONE",
    "status": "REQUIREMENT_CAPTURED",
    "expectedDeliveryDate": "2026-10-12",
    "notes": "Deliver to exhibition stall at BIEC Ground before 9 AM",
    "itemCount": 2,
    "totalQuantity": 2002,
    "items": [
      {
        "jobItemId": "item_00046_1",
        "jobId": "job_2026_00046",
        "itemName": "Brochure (Bi-Fold / Tri-Fold)",
        "productType": "Brochure (Bi-Fold / Tri-Fold)",
        "quantity": 2000,
        "unit": "PCS",
        "size": {
          "type": "PRESET",
          "presetName": "A4 (210 × 297 mm)",
          "width": 210,
          "height": 297,
          "unit": "MM"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Art Paper / Gloss Paper",
          "gsm": 170,
          "paperSize": "A4",
          "notes": "Glossy finish brochure"
        },
        "finishing": [
          "CUTTING",
          "CREASING",
          "FOLDING"
        ],
        "designRequired": true,
        "designNotes": "3-panel tri-fold layout with product feature matrix",
        "notes": "Crease neatly along folds to avoid cracking",
        "status": "REQUIREMENT_CAPTURED"
      },
      {
        "jobItemId": "item_00046_2",
        "jobId": "job_2026_00046",
        "itemName": "Roll-up Standee",
        "productType": "Roll-up Standee",
        "quantity": 2,
        "unit": "SET",
        "size": {
          "type": "PRESET",
          "presetName": "Roll-up Standee (3 × 6 ft)",
          "width": 3,
          "height": 6,
          "unit": "FEET"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Vinyl Sticker (Gloss / Matte)",
          "gsm": 150,
          "paperSize": "3x6 ft",
          "notes": "Non-tearable media with aluminum stand"
        },
        "finishing": [
          "LAMINATION_MATTE",
          "MOUNTING"
        ],
        "designRequired": false,
        "designNotes": "",
        "notes": "Assemble into luxury aluminum roll-up cassette base",
        "status": "REQUIREMENT_CAPTURED"
      }
    ],
    "createdBy": "Arun Kumar (Branch Manager)",
    "createdAt": "2026-10-06T14:15:00.000Z",
    "updatedAt": "2026-10-06T14:15:00.000Z"
  },
  {
    "_id": "job_2026_00047",
    "id": "job_2026_00047",
    "jobId": "job_2026_00047",
    "jobNo": "JOB-2026-00047",
    "customerId": "cus_000186",
    "customerCode": "CUS-000186",
    "customerName": "Dr. Priya Sharma",
    "customerMobile": "9123456780",
    "customerCompany": "Smile Dental Clinic",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Prescription Pads & Appointment Reminder Slips",
    "priority": "NORMAL",
    "source": "QR",
    "status": "REQUIREMENT_CAPTURED",
    "expectedDeliveryDate": "2026-10-18",
    "notes": "Clinic opens on 20th Oct, standard delivery.",
    "itemCount": 2,
    "totalQuantity": 30,
    "items": [
      {
        "jobItemId": "item_00047_1",
        "jobId": "job_2026_00047",
        "itemName": "Bill Book / Voucher",
        "productType": "Bill Book / Voucher",
        "quantity": 20,
        "unit": "BOOK",
        "size": {
          "type": "PRESET",
          "presetName": "A5 (148 × 210 mm)",
          "width": 148,
          "height": 210,
          "unit": "MM"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "BLACK_WHITE"
        },
        "material": {
          "paperType": "Maplitho / Plain Paper",
          "gsm": 80,
          "paperSize": "A5",
          "notes": "100 sheets per pad with hardboard back"
        },
        "finishing": [
          "CUTTING",
          "PERFORATION",
          "STAPLE_BINDING"
        ],
        "designRequired": false,
        "designNotes": "",
        "notes": "Top glue padding with tear-off perforation",
        "status": "REQUIREMENT_CAPTURED"
      },
      {
        "jobItemId": "item_00047_2",
        "jobId": "job_2026_00047",
        "itemName": "Appointment Reminder Card",
        "productType": "Visiting Card",
        "quantity": 10,
        "unit": "BOX",
        "size": {
          "type": "PRESET",
          "presetName": "Visiting Card (3.5 × 2.0 in)",
          "width": 3.5,
          "height": 2,
          "unit": "INCH"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Art Card",
          "gsm": 300,
          "paperSize": "SRA3",
          "notes": "Back side writable for next visit date"
        },
        "finishing": [
          "CUTTING"
        ],
        "designRequired": false,
        "designNotes": "",
        "notes": "Back side uncoated matte so doctor can write with ballpoint pen",
        "status": "REQUIREMENT_CAPTURED"
      }
    ],
    "createdBy": "Customer (QR Registration)",
    "createdAt": "2026-10-07T09:00:00.000Z",
    "updatedAt": "2026-10-07T09:00:00.000Z"
  },
  {
    "_id": "job_bw_001",
    "id": "job_bw_001",
    "jobId": "job_bw_001",
    "jobNo": "JOB-2026-00061",
    "customerId": "cus_bw_001",
    "customerCode": "CUS-BW-001",
    "customerName": "Ramesh Babu",
    "customerMobile": "9845112233",
    "customerCompany": "Alpha Tech Solutions",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Metallic Business Cards (Gold Foil)",
    "title": "Metallic Business Cards (Gold Foil)",
    "priority": "HIGH",
    "source": "WALK_IN",
    "status": "REQUIREMENT_CAPTURED",
    "stage": "ESTIMATION",
    "currentStage": "ESTIMATION",
    "expectedDeliveryDate": "2026-10-25",
    "notes": "350 GSM Velvet matte with metallic gold foil stamping on company logo",
    "itemCount": 1,
    "totalQuantity": 1000,
    "estimateId": "est_bw_001",
    "estimateNo": "EST-2026-00015",
    "estimatedAmount": 2450.00,
    "items": [
      {
        "jobItemId": "item_bw_001_1",
        "jobId": "job_bw_001",
        "itemName": "Premium Gold Foil Business Cards",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "size": {
          "type": "PRESET",
          "presetName": "Visiting Card (3.5 × 2.0 in)",
          "width": 3.5,
          "height": 2,
          "unit": "INCH"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Art Card",
          "gsm": 350,
          "paperSize": "SRA3",
          "notes": "Velvet touch thermal lamination"
        },
        "finishing": [
          "CUTTING",
          "LAMINATION_MATTE",
          "FOIL_STAMPING"
        ],
        "designRequired": true,
        "designNotes": "Vector logo provided in SVG",
        "status": "REQUIREMENT_CAPTURED"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-10T08:30:00.000Z",
    "updatedAt": "2026-10-10T08:30:00.000Z"
  },
  {
    "_id": "job_bw_002",
    "id": "job_bw_002",
    "jobId": "job_bw_002",
    "jobNo": "JOB-2026-00062",
    "customerId": "cus_bw_002",
    "customerCode": "CUS-BW-002",
    "customerName": "Sneha Reddy",
    "customerMobile": "9845223344",
    "customerCompany": "Bloom Florists & Events",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Trifold Event Brochure & Price Catalog",
    "title": "Trifold Event Brochure & Price Catalog",
    "priority": "NORMAL",
    "source": "QR",
    "status": "DESIGN",
    "stage": "DESIGN_ASSIGNED",
    "currentStage": "DESIGN_ASSIGNED",
    "expectedDeliveryDate": "2026-10-24",
    "notes": "Pastel colour theme with high resolution botanical imagery",
    "itemCount": 1,
    "totalQuantity": 2500,
    "estimateId": "est_bw_002",
    "estimateNo": "EST-2026-00016",
    "estimatedAmount": 8900.00,
    "items": [
      {
        "jobItemId": "item_bw_002_1",
        "jobId": "job_bw_002",
        "itemName": "Trifold A4 Brochure",
        "productType": "Brochure",
        "quantity": 2500,
        "unit": "PCS",
        "size": {
          "type": "PRESET",
          "presetName": "A4 (210 × 297 mm)",
          "width": 210,
          "height": 297,
          "unit": "MM"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Gloss Art Paper",
          "gsm": 170,
          "paperSize": "A4",
          "notes": "Double sided gloss coated"
        },
        "finishing": [
          "CUTTING",
          "CREASING",
          "FOLDING"
        ],
        "designRequired": true,
        "designNotes": "3-panel accordion fold design",
        "status": "DESIGN_IN_PROGRESS"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-09T11:00:00.000Z",
    "updatedAt": "2026-10-10T09:15:00.000Z"
  },
  {
    "_id": "job_bw_003",
    "id": "job_bw_003",
    "jobId": "job_bw_003",
    "jobNo": "JOB-2026-00063",
    "customerId": "cus_bw_003",
    "customerCode": "CUS-BW-003",
    "customerName": "Vikram Singh",
    "customerMobile": "9845334455",
    "customerCompany": "Urban Cafe & Roastery",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Outdoor Frontlit Signage & Rollup Standees",
    "title": "Outdoor Frontlit Signage & Rollup Standees",
    "priority": "HIGH",
    "source": "WALK_IN",
    "status": "READY_FOR_PRODUCTION",
    "stage": "PRODUCTION_PLANNING",
    "currentStage": "PRODUCTION_PLANNING",
    "expectedDeliveryDate": "2026-10-22",
    "notes": "Weather-proof eco-solvent ink with brass eyelets and aluminum standee base",
    "itemCount": 2,
    "totalQuantity": 6,
    "estimateId": "est_bw_003",
    "estimateNo": "EST-2026-00017",
    "estimatedAmount": 4200.00,
    "items": [
      {
        "jobItemId": "item_bw_003_1",
        "jobId": "job_bw_003",
        "itemName": "Outdoor Star Flex Banner (8x4 ft)",
        "productType": "Banner",
        "quantity": 2,
        "unit": "PCS",
        "size": {
          "type": "CUSTOM",
          "width": 96,
          "height": 48,
          "unit": "INCH"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Star Flex 380 GSM",
          "gsm": 380,
          "paperSize": "Roll",
          "notes": "Heavy tear-resistant media"
        },
        "finishing": [
          "EYELETS",
          "EDGE_TAPING"
        ],
        "designRequired": true,
        "status": "APPROVED"
      },
      {
        "jobItemId": "item_bw_003_2",
        "jobId": "job_bw_003",
        "itemName": "Luxury Rollup Standee (6x2.5 ft)",
        "productType": "Standee",
        "quantity": 4,
        "unit": "PCS",
        "size": {
          "type": "CUSTOM",
          "width": 72,
          "height": 30,
          "unit": "INCH"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Non-Tearable Polyester Film",
          "gsm": 280,
          "paperSize": "Roll",
          "notes": "Satin matte finish anti-curl media"
        },
        "finishing": [
          "LAMINATION_MATTE",
          "STAND_ASSEMBLY"
        ],
        "designRequired": true,
        "status": "APPROVED"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T14:20:00.000Z",
    "updatedAt": "2026-10-10T11:00:00.000Z"
  },
  {
    "_id": "job_bw_004",
    "id": "job_bw_004",
    "jobId": "job_bw_004",
    "jobNo": "JOB-2026-00064",
    "customerId": "cus_bw_004",
    "customerCode": "CUS-BW-004",
    "customerName": "Dr. Kavitha Murthy",
    "customerMobile": "9845445566",
    "customerCompany": "Aura Dental & Maxillofacial Clinic",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Clinic Letterheads & Prescription Pads",
    "title": "Clinic Letterheads & Prescription Pads",
    "priority": "NORMAL",
    "source": "WALK_IN",
    "status": "IN_PRODUCTION",
    "stage": "QC",
    "currentStage": "QC",
    "expectedDeliveryDate": "2026-10-20",
    "notes": "Top padding glue, 100 numbered sheets per pad with kraft backboard",
    "itemCount": 2,
    "totalQuantity": 50,
    "estimateId": "est_bw_004",
    "estimateNo": "EST-2026-00018",
    "estimatedAmount": 6750.00,
    "productionOrderId": "po_bw_001",
    "items": [
      {
        "jobItemId": "item_bw_004_1",
        "jobId": "job_bw_004",
        "itemName": "Doctor Prescription Pads (A5)",
        "productType": "Bill Book / Voucher",
        "quantity": 30,
        "unit": "BOOK",
        "size": {
          "type": "PRESET",
          "presetName": "A5 (148 × 210 mm)",
          "width": 148,
          "height": 210,
          "unit": "MM"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Maplitho High Bright",
          "gsm": 90,
          "paperSize": "A5",
          "notes": "Smooth ballpoint writing surface"
        },
        "finishing": [
          "CUTTING",
          "GLUE_PADDING",
          "PERFORATION"
        ],
        "designRequired": false,
        "status": "IN_PRODUCTION"
      },
      {
        "jobItemId": "item_bw_004_2",
        "jobId": "job_bw_004",
        "itemName": "Executive Clinic Letterheads (A4)",
        "productType": "Letterhead",
        "quantity": 20,
        "unit": "REAMS",
        "size": {
          "type": "PRESET",
          "presetName": "A4 (210 × 297 mm)",
          "width": 210,
          "height": 297,
          "unit": "MM"
        },
        "printing": {
          "side": "SINGLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Royal Executive Bond",
          "gsm": 100,
          "paperSize": "A4",
          "notes": "Textured luxury bond paper"
        },
        "finishing": [
          "CUTTING",
          "BOX_PACKING"
        ],
        "designRequired": false,
        "status": "IN_PRODUCTION"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-07T10:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z"
  },
  {
    "_id": "job_bw_005",
    "id": "job_bw_005",
    "jobId": "job_bw_005",
    "jobNo": "JOB-2026-00065",
    "customerId": "cus_bw_005",
    "customerCode": "CUS-BW-005",
    "customerName": "Rajesh Nambiar",
    "customerMobile": "9845556677",
    "customerCompany": "Nambiar Enterprises Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "jobTitle": "Corporate Annual Reports (Hardcover Perfect Bound)",
    "title": "Corporate Annual Reports (Hardcover Perfect Bound)",
    "priority": "HIGH",
    "source": "WALK_IN",
    "status": "COMPLETED",
    "stage": "COMPLETED",
    "currentStage": "COMPLETED",
    "expectedDeliveryDate": "2026-10-18",
    "notes": "150 pages with gloss photo inserts, thermal perfect bind, soft-touch matte lamination",
    "itemCount": 1,
    "totalQuantity": 150,
    "estimateId": "est_bw_005",
    "estimateNo": "EST-2026-00019",
    "estimatedAmount": 18500.00,
    "productionOrderId": "po_bw_002",
    "invoiceNo": "INV-2026-00012",
    "invoiceAmount": 21830.00,
    "paymentStatus": "PAID",
    "items": [
      {
        "jobItemId": "item_bw_005_1",
        "jobId": "job_bw_005",
        "itemName": "Annual Financial Report Book",
        "productType": "Book / Catalog",
        "quantity": 150,
        "unit": "BOOK",
        "size": {
          "type": "PRESET",
          "presetName": "A4 (210 × 297 mm)",
          "width": 210,
          "height": 297,
          "unit": "MM"
        },
        "printing": {
          "side": "DOUBLE_SIDE",
          "colourMode": "COLOUR"
        },
        "material": {
          "paperType": "Matt Art Paper",
          "gsm": 130,
          "paperSize": "A4",
          "notes": "Cover on 350 GSM Board with thermal soft-touch film"
        },
        "finishing": [
          "CUTTING",
          "LAMINATION_MATTE",
          "PERFECT_BINDING",
          "SHRINK_WRAPPING"
        ],
        "designRequired": true,
        "status": "COMPLETED"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-05T09:30:00.000Z",
    "updatedAt": "2026-10-10T15:30:00.000Z"
  }
];
