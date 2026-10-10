/**
 * PrintZ Master Data - Payments Master
 * Collection: payments
 */

export const samplePayments = [
  {
    "_id": "64f1a2b3c4d5e6f7a8b90861",
    "id": "64f1a2b3c4d5e6f7a8b90861",
    "paymentNo": "PAY-2026-0120",
    "invoiceId": "64f1a2b3c4d5e6f7a8b90845",
    "jobOrderId": "64f1a2b3c4d5e6f7a8b90045",
    "saleReceiptId": null,
    "customerId": "64f1a2b3c4d5e6f7a8b90185",
    "customerName": "Apex Technologies Pvt Ltd",
    "customerPhone": "+91 98451 23456",
    "branchId": "64f1a2b3c4d5e6f7a8b90002",
    "branchName": "Kammanahalli",
    "paymentType": "ADVANCE",
    "paymentMode": "UPI",
    "paymentMethod": "UPI",
    "amount": 5000.0,
    "paidAmount": 5000.0,
    "totalBillAmount": 14160.0,
    "dueAmount": 9160.0,
    "paymentDate": "2026-10-09T08:35:00.000Z",
    "referenceNo": "UPI/428901234567/HDFC",
    "bankName": "HDFC Bank",
    "status": "COMPLETED",
    "receivedBy": "64f2a1b2c3d4e5f6a7b80012",
    "notes": "Advance token payment for job approval",
    "createdAt": "2026-10-09T08:35:00.000Z",
    "updatedAt": "2026-10-09T08:35:00.000Z"
  },
  {
    "_id": "64f1a2b3c4d5e6f7a8b90862",
    "id": "64f1a2b3c4d5e6f7a8b90862",
    "paymentNo": "PAY-2026-0121",
    "invoiceId": "64f1a2b3c4d5e6f7a8b90846",
    "jobOrderId": "64f1a2b3c4d5e6f7a8b90051",
    "saleReceiptId": null,
    "customerId": "64f1a2b3c4d5e6f7a8b90189",
    "customerName": "Guna",
    "customerPhone": "+91 98765 43211",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "paymentType": "ADVANCE",
    "paymentMode": "CASH",
    "paymentMethod": "Cash",
    "amount": 2000.0,
    "paidAmount": 2000.0,
    "totalBillAmount": 4130.0,
    "dueAmount": 2130.0,
    "paymentDate": "2026-10-08T09:35:00.000Z",
    "referenceNo": "CASH-COUNTER-01",
    "bankName": "",
    "status": "COMPLETED",
    "receivedBy": "64f2a1b2c3d4e5f6a7b80011",
    "notes": "Counter advance cash received",
    "createdAt": "2026-10-08T09:35:00.000Z",
    "updatedAt": "2026-10-08T09:35:00.000Z"
  }
];

export default samplePayments;
