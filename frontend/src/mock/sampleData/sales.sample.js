/**
 * PrintZ Sample Data - Sales & POS Transactions (Step 7)
 */

export const sampleSales = [
  {
    "_id": "sale_1791551486594_fapsn",
    "id": "sale_1791551486594_fapsn",
    "saleId": "sale_1791551486594_fapsn",
    "saleNo": "POS-2026-000007",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "customerId": null,
    "customerSnapshot": {
      "customerId": "walkin_retail",
      "customerCode": "WALK-IN",
      "name": "Walk-in Customer",
      "mobile": "9999999999",
      "customerType": "INDIVIDUAL"
    },
    "isWalkIn": true,
    "items": [
      {
        "itemId": "sitem_1791551486594_9eg9b",
        "productId": "prd_001",
        "productCode": "PRN-A4-COL",
        "productName": "A4 Colour Print",
        "category": "Printing",
        "type": "SERVICE",
        "quantity": 40,
        "unit": "page",
        "unitPrice": 10,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 72,
        "lineTotal": 472,
        "consumptionSnapshot": [
          {
            "consumable": "A4 Maplitho 70 GSM",
            "type": "PAPER",
            "quantity": 40,
            "unit": "sheet",
            "branchStock": 1240
          },
          {
            "consumable": "Colour toner clicks",
            "type": "INK_TONER",
            "quantity": 40,
            "unit": "click",
            "branchStock": null
          }
        ]
      },
      {
        "itemId": "sitem_1791551486594_w4dnx",
        "productId": "prd_011",
        "productCode": "PS268",
        "productName": "Metal Key Chain - Engraving",
        "category": "Finishing",
        "type": "PHYSICAL",
        "quantity": 2,
        "unit": "pcs",
        "unitPrice": 249,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 89.64,
        "lineTotal": 587.64,
        "consumptionSnapshot": [
          {
            "consumable": "Blank Metal Key Chain Base",
            "type": "MATERIAL",
            "quantity": 2,
            "unit": "pcs",
            "branchStock": 8
          }
        ]
      }
    ],
    "itemCount": 2,
    "totalQuantity": 42,
    "subtotal": 898,
    "discount": {
      "type": "AMOUNT",
      "value": 0,
      "amount": 0
    },
    "taxableAmount": 898,
    "taxAmount": 162,
    "taxBreakdown": {
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 81,
      "sgstAmount": 81,
      "igstRate": 0,
      "igstAmount": 0
    },
    "roundOff": 0,
    "grandTotal": 1060,
    "amountPaid": 1060,
    "balanceDue": 0,
    "changeDue": 0,
    "paymentMethod": "UPI",
    "paymentReference": "UTR 4521 7781 0091",
    "paymentStatus": "PAID",
    "saleStatus": "COMPLETED",
    "source": "POS",
    "jobId": null,
    "jobNo": null,
    "invoiceId": "inv_1791551486594_mptrd",
    "invoiceNo": "INV-2026-000007",
    "receiptId": "rcp_1791551486594_uykbc",
    "receiptNo": "SR-2026-000007",
    "printFormat": "A4",
    "whatsAppShared": true,
    "notes": "",
    "createdBy": "Divya S (Counter Staff)",
    "createdAt": "2026-10-09T13:11:26.594Z",
    "updatedAt": "2026-10-09T13:11:26.594Z"
  },
  {
    "_id": "sale_000001",
    "id": "sale_000001",
    "saleId": "sale_000001",
    "saleNo": "POS-2026-000001",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "customerId": "cus_000184",
    "customerSnapshot": {
      "customerId": "cus_000184",
      "customerCode": "CUS-000184",
      "name": "ABC Printers",
      "contactPerson": "Mr. Arjun",
      "mobile": "9876543210",
      "email": "abc@printers.com",
      "companyName": "ABC Printers Pvt Ltd",
      "gstNumber": "29ABCDE1234F1Z5",
      "address": "123, MG Road, Bengaluru",
      "customerType": "BUSINESS"
    },
    "isWalkIn": false,
    "items": [
      {
        "itemId": "sitem_001",
        "productId": "prd_001",
        "productCode": "PRN-A4-COL",
        "productName": "A4 Colour Print",
        "category": "Printing",
        "type": "SERVICE",
        "quantity": 40,
        "unit": "page",
        "unitPrice": 10,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 72,
        "lineTotal": 472,
        "consumptionSnapshot": [
          {
            "consumable": "A4 Maplitho 70 GSM",
            "type": "PAPER",
            "quantity": 40,
            "unit": "sheet",
            "branchStock": 1240
          },
          {
            "consumable": "Colour toner clicks",
            "type": "INK_TONER",
            "quantity": 40,
            "unit": "click",
            "branchStock": null
          }
        ]
      },
      {
        "itemId": "sitem_002",
        "productId": "prd_011",
        "productCode": "PS268",
        "productName": "Metal Key Chain - Engraving",
        "category": "Finishing",
        "type": "PHYSICAL",
        "quantity": 2,
        "unit": "pcs",
        "unitPrice": 249,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 89.64,
        "lineTotal": 587.64,
        "consumptionSnapshot": [
          {
            "consumable": "Blank Metal Key Chain Base",
            "type": "MATERIAL",
            "quantity": 2,
            "unit": "pcs",
            "branchStock": 8
          }
        ]
      }
    ],
    "itemCount": 2,
    "totalQuantity": 42,
    "subtotal": 898,
    "discount": {
      "type": "AMOUNT",
      "value": 0,
      "amount": 0
    },
    "taxableAmount": 898,
    "taxAmount": 161.64,
    "taxBreakdown": {
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 80.82,
      "sgstAmount": 80.82,
      "igstRate": 0,
      "igstAmount": 0
    },
    "roundOff": 0.36,
    "grandTotal": 1060,
    "amountPaid": 1060,
    "balanceDue": 0,
    "changeDue": 0,
    "paymentMethod": "UPI",
    "paymentReference": "UTR 4521 7781 0091",
    "paymentStatus": "PAID",
    "saleStatus": "COMPLETED",
    "source": "POS",
    "jobId": null,
    "jobNo": null,
    "invoiceId": "inv_000001",
    "invoiceNo": "INV-2026-000001",
    "receiptId": "rcp_000001",
    "receiptNo": "SR-2026-000001",
    "printFormat": "A4",
    "whatsAppShared": true,
    "createdBy": "Arun Kumar (Counter Staff)",
    "createdAt": "2026-10-05T11:30:00.000Z",
    "updatedAt": "2026-10-05T11:30:00.000Z"
  },
  {
    "_id": "sale_000002",
    "id": "sale_000002",
    "saleId": "sale_000002",
    "saleNo": "POS-2026-000002",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "customerId": "cus_000185",
    "customerSnapshot": {
      "customerId": "cus_000185",
      "customerCode": "CUS-000185",
      "name": "Sri Lakshmi Traders",
      "contactPerson": "Suresh Kumar",
      "mobile": "9845012345",
      "email": "sales@srilakshmi.com",
      "companyName": "Sri Lakshmi Traders",
      "gstNumber": "29AAACS1234A1Z1",
      "customerType": "BUSINESS"
    },
    "isWalkIn": false,
    "items": [
      {
        "itemId": "sitem_003",
        "productId": "prd_005",
        "productCode": "LAM-A4-MATT",
        "productName": "Lamination - A4 Matt",
        "category": "Lamination",
        "type": "SERVICE",
        "quantity": 20,
        "unit": "sheet",
        "unitPrice": 30,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 108,
        "lineTotal": 708,
        "consumptionSnapshot": []
      },
      {
        "itemId": "sitem_004",
        "productId": "prd_007",
        "productCode": "BND-SPIRAL",
        "productName": "Spiral Binding",
        "category": "Binding",
        "type": "SERVICE",
        "quantity": 5,
        "unit": "book",
        "unitPrice": 50,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 45,
        "lineTotal": 295,
        "consumptionSnapshot": []
      }
    ],
    "itemCount": 2,
    "totalQuantity": 25,
    "subtotal": 850,
    "discount": {
      "type": "AMOUNT",
      "value": 50,
      "amount": 50
    },
    "taxableAmount": 800,
    "taxAmount": 144,
    "taxBreakdown": {
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 72,
      "sgstAmount": 72,
      "igstRate": 0,
      "igstAmount": 0
    },
    "roundOff": 0,
    "grandTotal": 944,
    "amountPaid": 944,
    "balanceDue": 0,
    "changeDue": 0,
    "paymentMethod": "Cash",
    "paymentReference": "CASH-REC-002",
    "paymentStatus": "PAID",
    "saleStatus": "COMPLETED",
    "source": "POS",
    "jobId": null,
    "jobNo": null,
    "invoiceId": "inv_000002",
    "invoiceNo": "INV-2026-000002",
    "receiptId": "rcp_000002",
    "receiptNo": "SR-2026-000002",
    "printFormat": "Thermal",
    "whatsAppShared": false,
    "createdBy": "Arun Kumar",
    "createdAt": "2026-10-06T14:15:00.000Z",
    "updatedAt": "2026-10-06T14:15:00.000Z"
  },
  {
    "_id": "sale_000003",
    "id": "sale_000003",
    "saleId": "sale_000003",
    "saleNo": "POS-2026-000003",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "customerId": null,
    "customerSnapshot": {
      "customerId": "walkin_retail",
      "customerCode": "WALK-IN",
      "name": "Walk-in Customer",
      "contactPerson": "Walk-in Customer",
      "mobile": "9999999999",
      "email": "",
      "customerType": "INDIVIDUAL"
    },
    "isWalkIn": true,
    "items": [
      {
        "itemId": "sitem_005",
        "productId": "prd_004",
        "productCode": "XRX-A4",
        "productName": "A4 Photocopy / Xerox",
        "category": "Xerox",
        "type": "SERVICE",
        "quantity": 50,
        "unit": "page",
        "unitPrice": 2,
        "discount": 0,
        "discountAmount": 0,
        "taxRate": 18,
        "taxAmount": 18,
        "lineTotal": 118,
        "consumptionSnapshot": []
      }
    ],
    "itemCount": 1,
    "totalQuantity": 50,
    "subtotal": 100,
    "discount": {
      "type": "AMOUNT",
      "value": 0,
      "amount": 0
    },
    "taxableAmount": 100,
    "taxAmount": 18,
    "taxBreakdown": {
      "cgstRate": 9,
      "sgstRate": 9,
      "cgstAmount": 9,
      "sgstAmount": 9,
      "igstRate": 0,
      "igstAmount": 0
    },
    "roundOff": 0,
    "grandTotal": 118,
    "amountPaid": 118,
    "balanceDue": 0,
    "changeDue": 82,
    "paymentMethod": "Cash",
    "paymentReference": "Tendered ₹200",
    "paymentStatus": "PAID",
    "saleStatus": "COMPLETED",
    "source": "POS",
    "jobId": null,
    "jobNo": null,
    "invoiceId": "inv_000003",
    "invoiceNo": "INV-2026-000003",
    "receiptId": "rcp_000003",
    "receiptNo": "SR-2026-000003",
    "printFormat": "Thermal",
    "whatsAppShared": false,
    "createdBy": "Divya S (Counter Staff)",
    "createdAt": "2026-10-07T09:40:00.000Z",
    "updatedAt": "2026-10-07T09:40:00.000Z"
  }
];

export const sampleInvoices = [
  {
    "_id": "inv_1791551486594_mptrd",
    "id": "inv_1791551486594_mptrd",
    "invoiceId": "inv_1791551486594_mptrd",
    "invoiceNo": "INV-2026-000007",
    "source": "POS",
    "saleId": "sale_1791551486594_fapsn",
    "saleNo": "POS-2026-000007",
    "jobId": null,
    "jobNo": null,
    "customerId": null,
    "customerSnapshot": {
      "customerId": "walkin_retail",
      "customerCode": "WALK-IN",
      "name": "Walk-in Customer",
      "mobile": "9999999999",
      "customerType": "INDIVIDUAL"
    },
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "items": [
      {
        "name": "A4 Colour Print",
        "code": "PRN-A4-COL",
        "quantity": 40,
        "unit": "page",
        "unitPrice": 10,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 72,
        "lineTotal": 472
      },
      {
        "name": "Metal Key Chain - Engraving",
        "code": "PS268",
        "quantity": 2,
        "unit": "pcs",
        "unitPrice": 249,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 89.64,
        "lineTotal": 587.64
      }
    ],
    "subtotal": 898,
    "discountAmount": 0,
    "taxableAmount": 898,
    "taxAmount": 162,
    "roundOff": 0,
    "grandTotal": 1060,
    "amountPaid": 1060,
    "balanceDue": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "UPI",
    "invoiceDate": "2026-10-09",
    "dueDate": "2026-10-09",
    "createdAt": "2026-10-09T13:11:26.594Z"
  },
  {
    "_id": "inv_000001",
    "id": "inv_000001",
    "invoiceId": "inv_000001",
    "invoiceNo": "INV-2026-000001",
    "source": "POS",
    "saleId": "sale_000001",
    "saleNo": "POS-2026-000001",
    "jobId": null,
    "jobNo": null,
    "customerId": "cus_000184",
    "customerSnapshot": {
      "customerId": "cus_000184",
      "customerCode": "CUS-000184",
      "name": "ABC Printers",
      "contactPerson": "Mr. Arjun",
      "mobile": "9876543210",
      "email": "abc@printers.com",
      "companyName": "ABC Printers Pvt Ltd",
      "gstNumber": "29ABCDE1234F1Z5",
      "address": "123, MG Road, Bengaluru",
      "customerType": "BUSINESS"
    },
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "items": [
      {
        "name": "A4 Colour Print",
        "code": "PRN-A4-COL",
        "quantity": 40,
        "unit": "page",
        "unitPrice": 10,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 72,
        "lineTotal": 472
      },
      {
        "name": "Metal Key Chain - Engraving",
        "code": "PS268",
        "quantity": 2,
        "unit": "pcs",
        "unitPrice": 249,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 89.64,
        "lineTotal": 587.64
      }
    ],
    "subtotal": 898,
    "discountAmount": 0,
    "taxableAmount": 898,
    "taxAmount": 161.64,
    "roundOff": 0.36,
    "grandTotal": 1060,
    "amountPaid": 1060,
    "balanceDue": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "UPI",
    "invoiceDate": "2026-10-05",
    "dueDate": "2026-10-05",
    "createdAt": "2026-10-05T11:30:00.000Z"
  },
  {
    "_id": "inv_000002",
    "id": "inv_000002",
    "invoiceId": "inv_000002",
    "invoiceNo": "INV-2026-000002",
    "source": "POS",
    "saleId": "sale_000002",
    "saleNo": "POS-2026-000002",
    "jobId": null,
    "jobNo": null,
    "customerId": "cus_000185",
    "customerSnapshot": {
      "customerId": "cus_000185",
      "customerCode": "CUS-000185",
      "name": "Sri Lakshmi Traders",
      "contactPerson": "Suresh Kumar",
      "mobile": "9845012345",
      "email": "sales@srilakshmi.com",
      "companyName": "Sri Lakshmi Traders",
      "gstNumber": "29AAACS1234A1Z1",
      "customerType": "BUSINESS"
    },
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "items": [
      {
        "name": "Lamination - A4 Matt",
        "code": "LAM-A4-MATT",
        "quantity": 20,
        "unit": "sheet",
        "unitPrice": 30,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 108,
        "lineTotal": 708
      },
      {
        "name": "Spiral Binding",
        "code": "BND-SPIRAL",
        "quantity": 5,
        "unit": "book",
        "unitPrice": 50,
        "discount": 50,
        "taxRate": 18,
        "taxAmount": 45,
        "lineTotal": 295
      }
    ],
    "subtotal": 850,
    "discountAmount": 50,
    "taxableAmount": 800,
    "taxAmount": 144,
    "roundOff": 0,
    "grandTotal": 944,
    "amountPaid": 944,
    "balanceDue": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "Cash",
    "invoiceDate": "2026-10-06",
    "dueDate": "2026-10-06",
    "createdAt": "2026-10-06T14:15:00.000Z"
  },
  {
    "_id": "inv_000042",
    "id": "inv_000042",
    "invoiceId": "inv_000042",
    "invoiceNo": "INV-2026-000042",
    "source": "JOB ORDER",
    "saleId": null,
    "saleNo": null,
    "jobId": "job_000045",
    "jobNo": "JO-KO-2610-0045",
    "customerId": "cus_000184",
    "customerSnapshot": {
      "customerId": "cus_000184",
      "customerCode": "CUS-000184",
      "name": "ABC Printers",
      "contactPerson": "Mr. Arjun",
      "mobile": "9876543210",
      "email": "abc@printers.com",
      "companyName": "ABC Printers Pvt Ltd",
      "gstNumber": "29ABCDE1234F1Z5",
      "customerType": "BUSINESS"
    },
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "items": [
      {
        "name": "Premium Visiting Cards 350 GSM Velvet Touch",
        "code": "JOB-VC-350",
        "quantity": 1000,
        "unit": "cards",
        "unitPrice": 2.1,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 378,
        "lineTotal": 2478
      }
    ],
    "subtotal": 2100,
    "discountAmount": 0,
    "taxableAmount": 2100,
    "taxAmount": 378,
    "roundOff": 0,
    "grandTotal": 2478,
    "amountPaid": 1000,
    "balanceDue": 1478,
    "paymentStatus": "PARTIALLY_PAID",
    "paymentMethod": "Bank Transfer",
    "invoiceDate": "2026-09-15",
    "dueDate": "2026-09-22",
    "createdAt": "2026-09-15T10:00:00.000Z"
  },
  {
    "_id": "inv_bw_001",
    "id": "inv_bw_001",
    "invoiceId": "inv_bw_001",
    "invoiceNo": "INV-2026-00012",
    "source": "JOB_ORDER",
    "jobId": "job_bw_005",
    "jobNo": "JOB-2026-00065",
    "customerId": "cus_bw_005",
    "customerSnapshot": {
      "customerId": "cus_bw_005",
      "customerCode": "CUS-BW-005",
      "name": "Rajesh Nambiar",
      "contactPerson": "Rajesh Nambiar",
      "mobile": "9845556677",
      "email": "rajesh@nambiarenterprises.com",
      "companyName": "Nambiar Enterprises Pvt Ltd",
      "gstNumber": "29AAACN5678N1Z5",
      "customerType": "CORPORATE"
    },
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "items": [
      {
        "name": "Annual Financial Report Book (150 pp, Perfect Binding)",
        "code": "PRN-BOOK-PB",
        "quantity": 150,
        "unit": "book",
        "unitPrice": 123.33,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 3330,
        "lineTotal": 21830
      }
    ],
    "subtotal": 18500,
    "discountAmount": 0,
    "taxableAmount": 18500,
    "taxAmount": 3330,
    "roundOff": 0,
    "grandTotal": 21830,
    "amountPaid": 21830,
    "balanceDue": 0,
    "paymentStatus": "PAID",
    "paymentMethod": "UPI",
    "invoiceDate": "2026-10-10",
    "dueDate": "2026-10-10",
    "createdAt": "2026-10-10T15:30:00.000Z"
  }
];

export const sampleReceipts = [
  {
    "receiptId": "rec_bw_001",
    "receiptNo": "REC-2026-00012",
    "invoiceId": "inv_bw_001",
    "invoiceNo": "INV-2026-00012",
    "jobNo": "JOB-2026-00065",
    "customerName": "Rajesh Nambiar",
    "companyName": "Nambiar Enterprises Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "amount": 21830,
    "paymentMethod": "UPI",
    "transactionRef": "UPI/261010/89472619",
    "receiptDate": "2026-10-10",
    "status": "COMPLETED",
    "receivedBy": "Banaswadi Manager",
    "createdAt": "2026-10-10T15:30:00.000Z"
  }
];

export const sampleHeldBills = [
  {
    "heldId": "hld_001",
    "heldNo": "HELD-001",
    "customer": {
      "customerId": "cus_000186",
      "name": "Nova Clinic",
      "mobile": "9740011223"
    },
    "items": [
      {
        "productId": "prd_001",
        "productCode": "PRN-A4-COL",
        "productName": "A4 Colour Print",
        "quantity": 15,
        "unit": "page",
        "unitPrice": 10,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 27,
        "lineTotal": 177
      }
    ],
    "subtotal": 150,
    "grandTotal": 177,
    "savedAt": "2026-10-08T08:30:00.000Z",
    "savedBy": "Divya S",
    "notes": "Customer went to get sample file from car"
  },
  {
    "heldId": "hld_002",
    "heldNo": "HELD-002",
    "customer": {
      "customerId": "walkin_retail",
      "name": "Walk-in Customer",
      "mobile": ""
    },
    "items": [
      {
        "productId": "prd_007",
        "productCode": "BND-SPIRAL",
        "productName": "Spiral Binding",
        "quantity": 3,
        "unit": "book",
        "unitPrice": 50,
        "discount": 0,
        "taxRate": 18,
        "taxAmount": 27,
        "lineTotal": 177
      }
    ],
    "subtotal": 150,
    "grandTotal": 177,
    "savedAt": "2026-10-08T09:10:00.000Z",
    "savedBy": "Arun Kumar",
    "notes": "Verifying document page count"
  }
];

export const sampleReturns = [
  {
    "returnId": "ret_000001",
    "returnNo": "RET-2026-000001",
    "saleId": "sale_000002",
    "saleNo": "POS-2026-000002",
    "invoiceNo": "INV-2026-000002",
    "receiptNo": "SR-2026-000002",
    "customerId": "cus_000185",
    "customerName": "Sri Lakshmi Traders",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "itemsReturned": [
      {
        "productId": "prd_005",
        "productName": "Lamination - A4 Matt",
        "returnQty": 2,
        "unitPrice": 30,
        "taxRate": 18,
        "refundLineTotal": 70.8
      }
    ],
    "totalRefundAmount": 70.8,
    "refundMethod": "Cash",
    "reason": "Customer ordered 2 extra sheets by mistake",
    "status": "COMPLETED",
    "processedBy": "Arun Kumar",
    "createdAt": "2026-10-07T16:00:00.000Z"
  }
];
