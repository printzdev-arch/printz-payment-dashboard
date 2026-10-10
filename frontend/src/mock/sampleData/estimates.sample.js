/**
 * PrintZ Sample Data - Estimates & Quotations (Step 3)
 */

export const sampleEstimates = [
  {
    "_id": "est_1791476274730_5bgpw",
    "id": "est_1791476274730_5bgpw",
    "estimateId": "est_1791476274730_5bgpw",
    "estimateNo": "EST-2026-00010-V2",
    "version": "V2",
    "versionNumber": 2,
    "jobId": "job_1791476197570_lld97",
    "jobNo": "JOB-2026-00053",
    "jobTitle": "visiting card",
    "customerId": "cus_1791463063854_p70e5",
    "customerCode": "CUS-000190",
    "customerName": "Pranesh",
    "customerMobile": "9361474617",
    "customerCompany": "",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "READY",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_1791476148312_1",
        "itemName": "Visiting Card",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "lines": [
          {
            "lineId": "line_1791476228850_1",
            "description": "Art Card 300 GSM SRA3 Stock (incl. wastage)",
            "category": "MATERIAL",
            "quantity": 44,
            "unit": "SHEETS",
            "rate": 3.45,
            "amount": 151.8,
            "notes": "Substrate raw material"
          },
          {
            "lineId": "line_1791476228850_2",
            "description": "Digital Printing (Double Side Colour)",
            "category": "PRINTING",
            "quantity": 1000,
            "unit": "CARDS",
            "rate": 1.2,
            "amount": 1200,
            "notes": "High fidelity digital print"
          },
          {
            "lineId": "line_1791476228850_3",
            "description": "Matte Thermal Lamination (Both Sides)",
            "category": "FINISHING",
            "quantity": 44,
            "unit": "SHEETS",
            "rate": 5.17,
            "amount": 227.48,
            "notes": "Surface protection"
          },
          {
            "lineId": "line_1791476228850_4",
            "description": "Precision Hydraulic Cutting & Boxing",
            "category": "FINISHING",
            "quantity": 10,
            "unit": "BOXES",
            "rate": 15,
            "amount": 150,
            "notes": "Finishing & standard packaging"
          },
          {
            "lineId": "line_1791476228850_design",
            "description": "Graphic Design & Artwork (Custom Layout)",
            "category": "LABOUR",
            "quantity": 1,
            "unit": "JOB",
            "rate": 150,
            "amount": 150,
            "notes": "In-house creative team"
          }
        ]
      }
    ],
    "subtotal": 1879.28,
    "discount": {
      "type": "PERCENTAGE",
      "value": 0,
      "amount": 0
    },
    "deliveryCharge": 0,
    "taxableAmount": 1879.28,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 169.14,
      "sgstAmount": 169.13,
      "igstRate": 0,
      "igstAmount": 0,
      "taxAmount": 338.27
    },
    "grandTotal": 2217.55,
    "validUntil": "2026-10-15",
    "termsAndConditions": "1. Payment Terms: 50% advance upon quotation confirmation, remaining 50% upon delivery/dispatch.\n2. Validity: This estimate is valid for 7 calendar days from the date of issue.\n3. Turnaround Time: Production SLA begins only upon receipt of final approved print-ready artwork proof.\n4. Color Fidelity: Minor shade variations within standard industry delta-E tolerances may occur across digital and offset runs.\n5. Goods once manufactured as per approved proof cannot be returned or cancelled.",
    "customerNotes": "",
    "internalNotes": "",
    "sentAt": null,
    "sentBy": null,
    "timeline": [
      {
        "event": "REVISION_CREATED",
        "status": "DRAFT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T16:17:54.730Z",
        "notes": "Revision V2 created from V1"
      },
      {
        "event": "MARKED_READY",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T16:18:00.904Z",
        "notes": "Pricing verified and marked ready for customer dispatch"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T16:17:54.730Z",
    "updatedAt": "2026-10-08T16:18:00.904Z",
    "previousVersionId": "est_1791476253526_23n21"
  },
  {
    "_id": "est_1791476253526_23n21",
    "id": "est_1791476253526_23n21",
    "estimateId": "est_1791476253526_23n21",
    "estimateNo": "EST-2026-00010",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_1791476197570_lld97",
    "jobNo": "JOB-2026-00053",
    "jobTitle": "visiting card",
    "customerId": "cus_1791463063854_p70e5",
    "customerCode": "CUS-000190",
    "customerName": "Pranesh",
    "customerMobile": "9361474617",
    "customerCompany": "",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "SENT",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_1791476148312_1",
        "itemName": "Visiting Card",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "lines": [
          {
            "lineId": "line_1791476228850_1",
            "description": "Art Card 300 GSM SRA3 Stock (incl. wastage)",
            "category": "MATERIAL",
            "quantity": 44,
            "unit": "SHEETS",
            "rate": 3.45,
            "amount": 151.8,
            "notes": "Substrate raw material"
          },
          {
            "lineId": "line_1791476228850_2",
            "description": "Digital Printing (Double Side Colour)",
            "category": "PRINTING",
            "quantity": 1000,
            "unit": "CARDS",
            "rate": 1.2,
            "amount": 1200,
            "notes": "High fidelity digital print"
          },
          {
            "lineId": "line_1791476228850_3",
            "description": "Matte Thermal Lamination (Both Sides)",
            "category": "FINISHING",
            "quantity": 44,
            "unit": "SHEETS",
            "rate": 5.17,
            "amount": 227.48,
            "notes": "Surface protection"
          },
          {
            "lineId": "line_1791476228850_4",
            "description": "Precision Hydraulic Cutting & Boxing",
            "category": "FINISHING",
            "quantity": 10,
            "unit": "BOXES",
            "rate": 15,
            "amount": 150,
            "notes": "Finishing & standard packaging"
          },
          {
            "lineId": "line_1791476228850_design",
            "description": "Graphic Design & Artwork (Custom Layout)",
            "category": "LABOUR",
            "quantity": 1,
            "unit": "JOB",
            "rate": 150,
            "amount": 150,
            "notes": "In-house creative team"
          }
        ]
      }
    ],
    "subtotal": 1879.28,
    "discount": {
      "type": "PERCENTAGE",
      "value": 0,
      "amount": 0
    },
    "deliveryCharge": 0,
    "taxableAmount": 1879.28,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 169.14,
      "sgstAmount": 169.13,
      "igstRate": 0,
      "igstAmount": 0,
      "taxAmount": 338.27
    },
    "grandTotal": 2217.55,
    "validUntil": "2026-10-15",
    "termsAndConditions": "1. Payment Terms: 50% advance upon quotation confirmation, remaining 50% upon delivery/dispatch.\n2. Validity: This estimate is valid for 7 calendar days from the date of issue.\n3. Turnaround Time: Production SLA begins only upon receipt of final approved print-ready artwork proof.\n4. Color Fidelity: Minor shade variations within standard industry delta-E tolerances may occur across digital and offset runs.\n5. Goods once manufactured as per approved proof cannot be returned or cancelled.",
    "customerNotes": "",
    "internalNotes": "",
    "sentAt": "2026-10-08T16:17:33.630Z",
    "sentBy": "Branch Manager",
    "timeline": [
      {
        "event": "CREATED",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T16:17:33.526Z",
        "notes": "Estimate created from Job JOB-2026-00053"
      },
      {
        "event": "SENT",
        "status": "SENT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T16:17:33.630Z",
        "notes": "Quotation dispatched to customer via WHATSAPP (9361474617)"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T16:17:33.526Z",
    "updatedAt": "2026-10-08T16:17:33.630Z"
  },
  {
    "_id": "est_1791457055388_7y7m9",
    "id": "est_1791457055388_7y7m9",
    "estimateId": "est_1791457055388_7y7m9",
    "estimateNo": "EST-2026-00007-V2",
    "version": "V2",
    "versionNumber": 2,
    "jobId": "job_1791454942277_2jjuy",
    "jobNo": "JOB-2026-00051",
    "jobTitle": "10X4 Flex",
    "customerId": "cus_1791451854648_d5l4v",
    "customerCode": "CUS-000189",
    "customerName": "Guna",
    "customerMobile": "9876543211",
    "customerCompany": "MRF tyres",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "ACCEPTED",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_1791454446070_1",
        "itemName": "Flex Banner (Frontlit / Star)",
        "productType": "Flex Banner (Frontlit / Star)",
        "quantity": 7,
        "unit": "SQFT",
        "lines": [
          {
            "lineId": "line_1791455326461_1",
            "description": "Frontlit Media 340 GSM (280 Sq.Ft)",
            "category": "MATERIAL",
            "quantity": 280,
            "unit": "SQFT",
            "rate": 15,
            "amount": 4200,
            "notes": "Outdoor banner substrate"
          },
          {
            "lineId": "line_1791455326461_2",
            "description": "Eco-Solvent Large Format Print",
            "category": "PRINTING",
            "quantity": 280,
            "unit": "SQFT",
            "rate": 12,
            "amount": 3360,
            "notes": "UV & waterproof print"
          },
          {
            "lineId": "line_1791455326461_3",
            "description": "Brass Eyelets & Edge Taping",
            "category": "FINISHING",
            "quantity": 56,
            "unit": "PCS",
            "rate": 5,
            "amount": 280,
            "notes": "Mounting grommets"
          },
          {
            "lineId": "line_1791455326461_design",
            "description": "Graphic Design & Artwork (Custom Layout)",
            "category": "LABOUR",
            "quantity": 1,
            "unit": "JOB",
            "rate": 150,
            "amount": 150,
            "notes": "In-house creative team"
          }
        ]
      }
    ],
    "subtotal": 7990,
    "discount": {
      "type": "PERCENTAGE",
      "value": 20,
      "amount": 1598
    },
    "deliveryCharge": 1500,
    "taxableAmount": 7892,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 710.28,
      "sgstAmount": 710.28,
      "igstRate": 0,
      "igstAmount": 0,
      "taxAmount": 1420.56
    },
    "grandTotal": 9312.56,
    "validUntil": "2026-10-15",
    "termsAndConditions": "1. Payment Terms: 50% advance upon quotation confirmation, remaining 50% upon delivery/dispatch.\n2. Validity: This estimate is valid for 7 calendar days from the date of issue.\n3. Turnaround Time: Production SLA begins only upon receipt of final approved print-ready artwork proof.\n4. Color Fidelity: Minor shade variations within standard industry delta-E tolerances may occur across digital and offset runs.\n5. Goods once manufactured as per approved proof cannot be returned or cancelled.",
    "customerNotes": "",
    "internalNotes": "",
    "sentAt": "2026-10-08T10:57:44.040Z",
    "sentBy": "Branch Manager",
    "timeline": [
      {
        "event": "REVISION_CREATED",
        "status": "DRAFT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:57:35.388Z",
        "notes": "Revision V2 created from V1"
      },
      {
        "event": "MARKED_READY",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:57:38.587Z",
        "notes": "Pricing verified and marked ready for customer dispatch"
      },
      {
        "event": "SENT",
        "status": "SENT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:57:44.040Z",
        "notes": "Quotation dispatched to customer via WHATSAPP (9876543211)"
      },
      {
        "event": "ESTIMATE_ACCEPTED",
        "status": "ACCEPTED",
        "actor": "Customer (Online Approval)",
        "timestamp": "2026-10-08T10:57:58.308Z",
        "notes": "Customer confirmed and accepted commercial quotation."
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T10:57:35.388Z",
    "updatedAt": "2026-10-08T10:57:58.308Z",
    "previousVersionId": "est_1791455574647_jlmxv",
    "approvedAt": "2026-10-08T10:57:58.308Z",
    "approvedBy": "Customer (Online Portal)",
    "approvalMethod": "CUSTOMER_PORTAL"
  },
  {
    "_id": "est_1791455596503_7pa9z",
    "id": "est_1791455596503_7pa9z",
    "estimateId": "est_1791455596503_7pa9z",
    "estimateNo": "EST-2026-00007-V2",
    "version": "V2",
    "versionNumber": 2,
    "jobId": "job_1791454942277_2jjuy",
    "jobNo": "JOB-2026-00051",
    "jobTitle": "10X4 Flex",
    "customerId": "cus_1791451854648_d5l4v",
    "customerCode": "CUS-000189",
    "customerName": "Guna",
    "customerMobile": "9876543211",
    "customerCompany": "MRF tyres",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "ACCEPTED",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_1791454446070_1",
        "itemName": "Flex Banner (Frontlit / Star)",
        "productType": "Flex Banner (Frontlit / Star)",
        "quantity": 7,
        "unit": "SQFT",
        "lines": [
          {
            "lineId": "line_1791455326461_1",
            "description": "Frontlit Media 340 GSM (280 Sq.Ft)",
            "category": "MATERIAL",
            "quantity": 280,
            "unit": "SQFT",
            "rate": 15,
            "amount": 4200,
            "notes": "Outdoor banner substrate"
          },
          {
            "lineId": "line_1791455326461_2",
            "description": "Eco-Solvent Large Format Print",
            "category": "PRINTING",
            "quantity": 280,
            "unit": "SQFT",
            "rate": 12,
            "amount": 3360,
            "notes": "UV & waterproof print"
          },
          {
            "lineId": "line_1791455326461_3",
            "description": "Brass Eyelets & Edge Taping",
            "category": "FINISHING",
            "quantity": 56,
            "unit": "PCS",
            "rate": 5,
            "amount": 280,
            "notes": "Mounting grommets"
          },
          {
            "lineId": "line_1791455326461_design",
            "description": "Graphic Design & Artwork (Custom Layout)",
            "category": "LABOUR",
            "quantity": 1,
            "unit": "JOB",
            "rate": 150,
            "amount": 150,
            "notes": "In-house creative team"
          }
        ]
      }
    ],
    "subtotal": 7990,
    "discount": {
      "type": "PERCENTAGE",
      "value": 20,
      "amount": 1598
    },
    "deliveryCharge": 1500,
    "taxableAmount": 7892,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 710.28,
      "sgstAmount": 710.28,
      "igstRate": 0,
      "igstAmount": 0,
      "taxAmount": 1420.56
    },
    "grandTotal": 9312.56,
    "validUntil": "2026-10-15",
    "termsAndConditions": "1. Payment Terms: 50% advance upon quotation confirmation, remaining 50% upon delivery/dispatch.\n2. Validity: This estimate is valid for 7 calendar days from the date of issue.\n3. Turnaround Time: Production SLA begins only upon receipt of final approved print-ready artwork proof.\n4. Color Fidelity: Minor shade variations within standard industry delta-E tolerances may occur across digital and offset runs.\n5. Goods once manufactured as per approved proof cannot be returned or cancelled.",
    "customerNotes": "",
    "internalNotes": "",
    "sentAt": null,
    "sentBy": null,
    "timeline": [
      {
        "event": "REVISION_CREATED",
        "status": "DRAFT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:33:16.503Z",
        "notes": "Revision V2 created from V1"
      },
      {
        "event": "MARKED_READY",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:33:22.838Z",
        "notes": "Pricing verified and marked ready for customer dispatch"
      },
      {
        "event": "ESTIMATE_ACCEPTED",
        "status": "ACCEPTED",
        "actor": "Customer (Online Approval)",
        "timestamp": "2026-10-08T10:52:32.460Z",
        "notes": "Customer confirmed and accepted commercial quotation."
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T10:33:16.503Z",
    "updatedAt": "2026-10-08T10:52:32.460Z",
    "previousVersionId": "est_1791455574647_jlmxv",
    "approvedAt": "2026-10-08T10:52:32.460Z",
    "approvedBy": "Customer (Online Portal)",
    "approvalMethod": "CUSTOMER_PORTAL"
  },
  {
    "_id": "est_1791455574647_jlmxv",
    "id": "est_1791455574647_jlmxv",
    "estimateId": "est_1791455574647_jlmxv",
    "estimateNo": "EST-2026-00007",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_1791454942277_2jjuy",
    "jobNo": "JOB-2026-00051",
    "jobTitle": "10X4 Flex",
    "customerId": "cus_1791451854648_d5l4v",
    "customerCode": "CUS-000189",
    "customerName": "Guna",
    "customerMobile": "9876543211",
    "customerCompany": "MRF tyres",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "SENT",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_1791454446070_1",
        "itemName": "Flex Banner (Frontlit / Star)",
        "productType": "Flex Banner (Frontlit / Star)",
        "quantity": 7,
        "unit": "SQFT",
        "lines": [
          {
            "lineId": "line_1791455326461_1",
            "description": "Frontlit Media 340 GSM (280 Sq.Ft)",
            "category": "MATERIAL",
            "quantity": 280,
            "unit": "SQFT",
            "rate": 15,
            "amount": 4200,
            "notes": "Outdoor banner substrate"
          },
          {
            "lineId": "line_1791455326461_2",
            "description": "Eco-Solvent Large Format Print",
            "category": "PRINTING",
            "quantity": 280,
            "unit": "SQFT",
            "rate": 12,
            "amount": 3360,
            "notes": "UV & waterproof print"
          },
          {
            "lineId": "line_1791455326461_3",
            "description": "Brass Eyelets & Edge Taping",
            "category": "FINISHING",
            "quantity": 56,
            "unit": "PCS",
            "rate": 5,
            "amount": 280,
            "notes": "Mounting grommets"
          },
          {
            "lineId": "line_1791455326461_design",
            "description": "Graphic Design & Artwork (Custom Layout)",
            "category": "LABOUR",
            "quantity": 1,
            "unit": "JOB",
            "rate": 150,
            "amount": 150,
            "notes": "In-house creative team"
          }
        ]
      }
    ],
    "subtotal": 7990,
    "discount": {
      "type": "PERCENTAGE",
      "value": 20,
      "amount": 1598
    },
    "deliveryCharge": 1500,
    "taxableAmount": 7892,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 710.28,
      "sgstAmount": 710.28,
      "igstRate": 0,
      "igstAmount": 0,
      "taxAmount": 1420.56
    },
    "grandTotal": 9312.56,
    "validUntil": "2026-10-15",
    "termsAndConditions": "1. Payment Terms: 50% advance upon quotation confirmation, remaining 50% upon delivery/dispatch.\n2. Validity: This estimate is valid for 7 calendar days from the date of issue.\n3. Turnaround Time: Production SLA begins only upon receipt of final approved print-ready artwork proof.\n4. Color Fidelity: Minor shade variations within standard industry delta-E tolerances may occur across digital and offset runs.\n5. Goods once manufactured as per approved proof cannot be returned or cancelled.",
    "customerNotes": "",
    "internalNotes": "",
    "sentAt": "2026-10-08T10:32:54.756Z",
    "sentBy": "Branch Manager",
    "timeline": [
      {
        "event": "CREATED",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:32:54.647Z",
        "notes": "Estimate created from Job JOB-2026-00051"
      },
      {
        "event": "SENT",
        "status": "SENT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T10:32:54.756Z",
        "notes": "Quotation dispatched to customer via WHATSAPP (9876543211)"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T10:32:54.647Z",
    "updatedAt": "2026-10-08T10:32:54.756Z"
  },
  {
    "_id": "est_2026_00001",
    "id": "est_2026_00001",
    "estimateId": "est_2026_00001",
    "estimateNo": "EST-2026-00001",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_2026_00045",
    "jobNo": "JOB-2026-00045",
    "jobTitle": "Visiting Card Printing & Corporate Stationery",
    "customerId": "cus_000184",
    "customerCode": "CUS-000184",
    "customerName": "ABC Printers",
    "customerMobile": "9876543210",
    "customerCompany": "ABC Printers Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "SENT",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_00045_1",
        "itemName": "Visiting Card",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "lines": [
          {
            "lineId": "line_01",
            "description": "Art Card 300 GSM SRA3 Stock (with 4% wastage)",
            "category": "MATERIAL",
            "quantity": 87,
            "unit": "SHEETS",
            "rate": 3.45,
            "amount": 300,
            "notes": "Raw substrate"
          },
          {
            "lineId": "line_02",
            "description": "Digital Colour Printing (Double Side)",
            "category": "PRINTING",
            "quantity": 1000,
            "unit": "CARDS",
            "rate": 1.2,
            "amount": 1200,
            "notes": "High resolution digital offset"
          },
          {
            "lineId": "line_03",
            "description": "Matte Lamination (Both Sides)",
            "category": "FINISHING",
            "quantity": 87,
            "unit": "SHEETS",
            "rate": 5.17,
            "amount": 450,
            "notes": "Thermal matte film"
          },
          {
            "lineId": "line_04",
            "description": "Graphic Design Charge (New Layout & 2 Revisions)",
            "category": "LABOUR",
            "quantity": 1,
            "unit": "JOB",
            "rate": 150,
            "amount": 150,
            "notes": "Artwork preparation"
          }
        ]
      }
    ],
    "subtotal": 2100,
    "discount": {
      "type": "PERCENTAGE",
      "value": 0,
      "amount": 0
    },
    "deliveryCharge": 0,
    "taxableAmount": 2100,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 189,
      "sgstAmount": 189,
      "taxAmount": 378
    },
    "grandTotal": 2478,
    "validUntil": "2026-10-22",
    "termsAndConditions": "1. 50% advance payment upon approval, balance before delivery.\n2. Estimate valid for 7 days from issue date.\n3. Turnaround time starts after final artwork approval.",
    "customerNotes": "Prices inclusive of standard packaging in plastic card boxes.",
    "internalNotes": "Standard margins applied. Discount allowed up to 5% if requested on follow-up.",
    "sentAt": "2026-10-07T08:30:00.000Z",
    "sentBy": "Branch Manager",
    "timeline": [
      {
        "event": "CREATED",
        "status": "DRAFT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-07T08:00:00.000Z",
        "notes": "Initial draft estimate created from Job JOB-2026-00045"
      },
      {
        "event": "MARKED_READY",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-07T08:15:00.000Z",
        "notes": "Pricing verified and approved for sending"
      },
      {
        "event": "SENT",
        "status": "SENT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-07T08:30:00.000Z",
        "notes": "Estimate dispatched to customer WhatsApp (+91 98765 43210)"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-07T08:00:00.000Z",
    "updatedAt": "2026-10-07T08:30:00.000Z"
  },
  {
    "_id": "est_2026_00002",
    "id": "est_2026_00002",
    "estimateId": "est_2026_00002",
    "estimateNo": "EST-2026-00002",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_2026_00046",
    "jobNo": "JOB-2026-00046",
    "jobTitle": "Annual Conference Tri-Fold Brochures",
    "customerId": "cus_000185",
    "customerCode": "CUS-000185",
    "customerName": "Metro Healthcare",
    "customerMobile": "9845012345",
    "customerCompany": "Metro Healthcare Diagnostics",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "READY",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_00046_1",
        "itemName": "Tri-Fold Product Brochure",
        "productType": "Brochure",
        "quantity": 2500,
        "unit": "PCS",
        "lines": [
          {
            "lineId": "line_05",
            "description": "170 GSM Gloss Art Paper (A4 size)",
            "category": "MATERIAL",
            "quantity": 2500,
            "unit": "SHEETS",
            "rate": 1.4,
            "amount": 3500,
            "notes": "Imported gloss stock"
          },
          {
            "lineId": "line_06",
            "description": "Full Colour Digital Printing (2 Sides)",
            "category": "PRINTING",
            "quantity": 2500,
            "unit": "SHEETS",
            "rate": 2.2,
            "amount": 5500,
            "notes": "High fidelity CMYK"
          },
          {
            "lineId": "line_07",
            "description": "Precision Tri-Fold Creasing & Folding",
            "category": "FINISHING",
            "quantity": 2500,
            "unit": "PCS",
            "rate": 0.4,
            "amount": 1000,
            "notes": "Machine fold"
          }
        ]
      }
    ],
    "subtotal": 10000,
    "discount": {
      "type": "PERCENTAGE",
      "value": 5,
      "amount": 500
    },
    "deliveryCharge": 200,
    "taxableAmount": 9700,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 873,
      "sgstAmount": 873,
      "taxAmount": 1746
    },
    "grandTotal": 11446,
    "validUntil": "2026-10-25",
    "termsAndConditions": "1. 50% advance payment required.\n2. Estimate valid for 7 days.\n3. Delivery within 3 working days after proof sign-off.",
    "customerNotes": "Doorstep delivery to Banaswadi head office included.",
    "internalNotes": "5% volume discount applied as per healthcare account contract.",
    "sentAt": null,
    "sentBy": null,
    "timeline": [
      {
        "event": "CREATED",
        "status": "DRAFT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-06T11:00:00.000Z",
        "notes": "Draft estimate prepared"
      },
      {
        "event": "MARKED_READY",
        "status": "READY",
        "actor": "Branch Manager",
        "timestamp": "2026-10-06T11:30:00.000Z",
        "notes": "Quotation reviewed and verified ready for client"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-06T11:00:00.000Z",
    "updatedAt": "2026-10-06T11:30:00.000Z"
  },
  {
    "_id": "est_2026_00003",
    "id": "est_2026_00003",
    "estimateId": "est_2026_00003",
    "estimateNo": "EST-2026-00003",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_2026_00047",
    "jobNo": "JOB-2026-00047",
    "jobTitle": "Outdoor Promo Flex Banners",
    "customerId": "cus_000186",
    "customerCode": "CUS-000186",
    "customerName": "Green Leaf Cafe",
    "customerMobile": "9731122334",
    "customerCompany": "Green Leaf Hospitality",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "DRAFT",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_00047_1",
        "itemName": "Frontlit Flex Banner (10 × 4 ft)",
        "productType": "Flex Banner",
        "quantity": 3,
        "unit": "PCS",
        "lines": [
          {
            "lineId": "line_08",
            "description": "Star Frontlit Media 340 GSM (120 Sq.Ft)",
            "category": "MATERIAL",
            "quantity": 120,
            "unit": "SQFT",
            "rate": 15,
            "amount": 1800,
            "notes": "High strength banner vinyl"
          },
          {
            "lineId": "line_09",
            "description": "Eco-Solvent Outdoor Printing",
            "category": "PRINTING",
            "quantity": 120,
            "unit": "SQFT",
            "rate": 12,
            "amount": 1440,
            "notes": "Waterproof & UV resistant"
          },
          {
            "lineId": "line_10",
            "description": "Heavy Duty Eyelets & Edge Reinforcement",
            "category": "FINISHING",
            "quantity": 24,
            "unit": "PCS",
            "rate": 5,
            "amount": 120,
            "notes": "Brass eyelets every 2 feet"
          }
        ]
      }
    ],
    "subtotal": 3360,
    "discount": {
      "type": "AMOUNT",
      "value": 0,
      "amount": 0
    },
    "deliveryCharge": 0,
    "taxableAmount": 3360,
    "tax": {
      "type": "GST",
      "rate": 18,
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 302.4,
      "sgstAmount": 302.4,
      "taxAmount": 604.8
    },
    "grandTotal": 3964.8,
    "validUntil": "2026-10-20",
    "termsAndConditions": "1. 100% advance for flex printing.\n2. Validity: 7 days.\n3. Eyelet placing as per standard specification.",
    "customerNotes": "Includes edge folding and brass eyelets.",
    "internalNotes": "Check machine queue for eco-solvent large format printer before confirming ready.",
    "sentAt": null,
    "sentBy": null,
    "timeline": [
      {
        "event": "CREATED",
        "status": "DRAFT",
        "actor": "Branch Manager",
        "timestamp": "2026-10-07T09:00:00.000Z",
        "notes": "Draft estimate created"
      }
    ],
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-07T09:00:00.000Z",
    "updatedAt": "2026-10-07T09:00:00.000Z"
  },
  {
    "_id": "est_bw_001",
    "id": "est_bw_001",
    "estimateId": "est_bw_001",
    "estimateNo": "EST-2026-00015",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_bw_001",
    "jobNo": "JOB-2026-00061",
    "jobTitle": "Metallic Business Cards (Gold Foil)",
    "customerId": "cus_bw_001",
    "customerCode": "CUS-BW-001",
    "customerName": "Ramesh Babu",
    "customerMobile": "9845112233",
    "customerCompany": "Alpha Tech Solutions",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "DRAFT",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_bw_001_1",
        "itemName": "Premium Gold Foil Business Cards",
        "productType": "Visiting Card",
        "quantity": 1000,
        "unit": "PCS",
        "lines": [
          { "lineId": "line_bw_001_1", "description": "Art Card 350 GSM Velvet Stock", "category": "MATERIAL", "quantity": 88, "unit": "SHEETS", "rate": 4.5, "amount": 396 },
          { "lineId": "line_bw_001_2", "description": "Digital Press Color Print", "category": "PRINTING", "quantity": 1000, "unit": "CARDS", "rate": 1.2, "amount": 1200 },
          { "lineId": "line_bw_001_3", "description": "Thermal Velvet Matte Lamination", "category": "FINISHING", "quantity": 88, "unit": "SHEETS", "rate": 5.0, "amount": 440 },
          { "lineId": "line_bw_001_4", "description": "Metallic Gold Hot Foil Stamping", "category": "FINISHING", "quantity": 1000, "unit": "CARDS", "rate": 0.41, "amount": 414 }
        ],
        "itemSubtotal": 2450.00
      }
    ],
    "subtotal": 2450.00,
    "discount": 0,
    "taxableAmount": 2450.00,
    "tax": { "type": "GST", "rate": 18, "taxAmount": 441.00 },
    "grandTotal": 2891.00,
    "validUntil": "2026-10-25",
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-10T08:35:00.000Z",
    "updatedAt": "2026-10-10T08:35:00.000Z"
  },
  {
    "_id": "est_bw_002",
    "id": "est_bw_002",
    "estimateId": "est_bw_002",
    "estimateNo": "EST-2026-00016",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_bw_002",
    "jobNo": "JOB-2026-00062",
    "jobTitle": "Trifold Event Brochure & Price Catalog",
    "customerId": "cus_bw_002",
    "customerCode": "CUS-BW-002",
    "customerName": "Sneha Reddy",
    "customerMobile": "9845223344",
    "customerCompany": "Bloom Florists & Events",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "ACCEPTED",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_bw_002_1",
        "itemName": "Trifold A4 Brochure",
        "productType": "Brochure",
        "quantity": 2500,
        "unit": "PCS",
        "lines": [
          { "lineId": "line_bw_002_1", "description": "170 GSM Gloss Art Paper A4", "category": "MATERIAL", "quantity": 2500, "unit": "SHEETS", "rate": 1.4, "amount": 3500 },
          { "lineId": "line_bw_002_2", "description": "Double Sided Full Colour Offset Print", "category": "PRINTING", "quantity": 2500, "unit": "SHEETS", "rate": 1.6, "amount": 4000 },
          { "lineId": "line_bw_002_3", "description": "Creasing & 2-Fold Accordion", "category": "FINISHING", "quantity": 2500, "unit": "PCS", "rate": 0.56, "amount": 1400 }
        ],
        "itemSubtotal": 8900.00
      }
    ],
    "subtotal": 8900.00,
    "discount": 0,
    "taxableAmount": 8900.00,
    "tax": { "type": "GST", "rate": 18, "taxAmount": 1602.00 },
    "grandTotal": 10502.00,
    "validUntil": "2026-10-24",
    "approvedAt": "2026-10-09T14:00:00.000Z",
    "approvedBy": "Customer (Online Portal)",
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-09T11:15:00.000Z",
    "updatedAt": "2026-10-09T14:00:00.000Z"
  },
  {
    "_id": "est_bw_003",
    "id": "est_bw_003",
    "estimateId": "est_bw_003",
    "estimateNo": "EST-2026-00017",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_bw_003",
    "jobNo": "JOB-2026-00063",
    "jobTitle": "Outdoor Frontlit Signage & Rollup Standees",
    "customerId": "cus_bw_003",
    "customerCode": "CUS-BW-003",
    "customerName": "Vikram Singh",
    "customerMobile": "9845334455",
    "customerCompany": "Urban Cafe & Roastery",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "ACCEPTED",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_bw_003_1",
        "itemName": "Outdoor Star Flex Banner (8x4 ft)",
        "productType": "Banner",
        "quantity": 2,
        "unit": "PCS",
        "lines": [
          { "lineId": "line_bw_003_1", "description": "Star Flex 380 GSM Media (64 Sq.Ft)", "category": "MATERIAL", "quantity": 64, "unit": "SQFT", "rate": 16, "amount": 1024 },
          { "lineId": "line_bw_003_2", "description": "Eco-Solvent Outdoor Print", "category": "PRINTING", "quantity": 64, "unit": "SQFT", "rate": 12, "amount": 768 }
        ],
        "itemSubtotal": 1792.00
      },
      {
        "jobItemId": "item_bw_003_2",
        "itemName": "Luxury Rollup Standee (6x2.5 ft)",
        "productType": "Standee",
        "quantity": 4,
        "unit": "PCS",
        "lines": [
          { "lineId": "line_bw_003_3", "description": "Non-Tearable Polyester Film & Print", "category": "PRINTING", "quantity": 4, "unit": "PCS", "rate": 450, "amount": 1800 },
          { "lineId": "line_bw_003_4", "description": "Aluminum Base Cassette Hardware", "category": "MATERIAL", "quantity": 4, "unit": "PCS", "rate": 152, "amount": 608 }
        ],
        "itemSubtotal": 2408.00
      }
    ],
    "subtotal": 4200.00,
    "discount": 0,
    "taxableAmount": 4200.00,
    "tax": { "type": "GST", "rate": 18, "taxAmount": 756.00 },
    "grandTotal": 4956.00,
    "validUntil": "2026-10-22",
    "approvedAt": "2026-10-08T16:00:00.000Z",
    "approvedBy": "Customer (WhatsApp Confirmation)",
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-08T14:45:00.000Z",
    "updatedAt": "2026-10-08T16:00:00.000Z"
  },
  {
    "_id": "est_bw_004",
    "id": "est_bw_004",
    "estimateId": "est_bw_004",
    "estimateNo": "EST-2026-00018",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_bw_004",
    "jobNo": "JOB-2026-00064",
    "jobTitle": "Clinic Letterheads & Prescription Pads",
    "customerId": "cus_bw_004",
    "customerCode": "CUS-BW-004",
    "customerName": "Dr. Kavitha Murthy",
    "customerMobile": "9845445566",
    "customerCompany": "Aura Dental & Maxillofacial Clinic",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "ACCEPTED",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_bw_004_1",
        "itemName": "Doctor Prescription Pads (A5)",
        "productType": "Bill Book / Voucher",
        "quantity": 30,
        "unit": "BOOK",
        "lines": [
          { "lineId": "line_bw_004_1", "description": "90 GSM Maplitho Paper & Hardboard", "category": "MATERIAL", "quantity": 30, "unit": "PAD", "rate": 55, "amount": 1650 },
          { "lineId": "line_bw_004_2", "description": "Single Color Precision Offset Print", "category": "PRINTING", "quantity": 30, "unit": "PAD", "rate": 45, "amount": 1350 },
          { "lineId": "line_bw_004_3", "description": "Top Padding Glue & Numbering", "category": "FINISHING", "quantity": 30, "unit": "PAD", "rate": 25, "amount": 750 }
        ],
        "itemSubtotal": 3750.00
      },
      {
        "jobItemId": "item_bw_004_2",
        "itemName": "Executive Clinic Letterheads (A4)",
        "productType": "Letterhead",
        "quantity": 20,
        "unit": "REAMS",
        "lines": [
          { "lineId": "line_bw_004_4", "description": "Royal Executive Bond 100 GSM", "category": "MATERIAL", "quantity": 20, "unit": "REAM", "rate": 80, "amount": 1600 },
          { "lineId": "line_bw_004_5", "description": "Full Colour High Resolution Print", "category": "PRINTING", "quantity": 20, "unit": "REAM", "rate": 70, "amount": 1400 }
        ],
        "itemSubtotal": 3000.00
      }
    ],
    "subtotal": 6750.00,
    "discount": 0,
    "taxableAmount": 6750.00,
    "tax": { "type": "GST", "rate": 18, "taxAmount": 1215.00 },
    "grandTotal": 7965.00,
    "validUntil": "2026-10-20",
    "approvedAt": "2026-10-07T12:00:00.000Z",
    "approvedBy": "Customer (Direct Acceptance)",
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-07T10:15:00.000Z",
    "updatedAt": "2026-10-07T12:00:00.000Z"
  },
  {
    "_id": "est_bw_005",
    "id": "est_bw_005",
    "estimateId": "est_bw_005",
    "estimateNo": "EST-2026-00019",
    "version": "V1",
    "versionNumber": 1,
    "jobId": "job_bw_005",
    "jobNo": "JOB-2026-00065",
    "jobTitle": "Corporate Annual Reports (Hardcover Perfect Bound)",
    "customerId": "cus_bw_005",
    "customerCode": "CUS-BW-005",
    "customerName": "Rajesh Nambiar",
    "customerMobile": "9845556677",
    "customerCompany": "Nambiar Enterprises Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "status": "ACCEPTED",
    "currency": "INR",
    "items": [
      {
        "jobItemId": "item_bw_005_1",
        "itemName": "Annual Financial Report Book",
        "productType": "Book / Catalog",
        "quantity": 150,
        "unit": "BOOK",
        "lines": [
          { "lineId": "line_bw_005_1", "description": "130 GSM Matt Art Inside Pages (150pp)", "category": "MATERIAL", "quantity": 150, "unit": "BOOK", "rate": 45, "amount": 6750 },
          { "lineId": "line_bw_005_2", "description": "Double Sided Digital Production Print", "category": "PRINTING", "quantity": 150, "unit": "BOOK", "rate": 40, "amount": 6000 },
          { "lineId": "line_bw_005_3", "description": "350 GSM Hardcover Soft-Touch Matte Lam", "category": "MATERIAL", "quantity": 150, "unit": "BOOK", "rate": 20, "amount": 3000 },
          { "lineId": "line_bw_005_4", "description": "Hot Melt Perfect Binding & Shrink Wrap", "category": "FINISHING", "quantity": 150, "unit": "BOOK", "rate": 18.33, "amount": 2750 }
        ],
        "itemSubtotal": 18500.00
      }
    ],
    "subtotal": 18500.00,
    "discount": 0,
    "taxableAmount": 18500.00,
    "tax": { "type": "GST", "rate": 18, "taxAmount": 3330.00 },
    "grandTotal": 21830.00,
    "validUntil": "2026-10-18",
    "approvedAt": "2026-10-05T12:00:00.000Z",
    "approvedBy": "Customer (Signed Purchase Order)",
    "createdBy": "Branch Manager",
    "createdAt": "2026-10-05T10:00:00.000Z",
    "updatedAt": "2026-10-05T12:00:00.000Z"
  }
];
