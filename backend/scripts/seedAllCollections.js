const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function seedAll() {
  const newDbUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/newprintz_db";
  const vasuDbUri = "mongodb://127.0.0.1:27017/vasu_db";

  console.log(`Connecting to newprintz_db: ${newDbUri}`);
  const connNew = await mongoose.createConnection(newDbUri).asPromise();

  console.log(`Connecting to vasu_db for reference sample data: ${vasuDbUri}`);
  const connVasu = await mongoose.createConnection(vasuDbUri).asPromise();

  const newCollections = (await connNew.db.listCollections().toArray()).map((c) => c.name);
  console.log(`Target collections in newprintz_db: ${newCollections.length}`);

  const vasuCollections = await connVasu.db.listCollections().toArray();
  const vasuMap = new Set(vasuCollections.map((c) => c.name));

  // Default hashed password for test users: password123
  const defaultHashedPassword = await bcrypt.hash("password123", 10);

  // 1. Copy sample data from vasu_db for overlapping collections
  for (const colName of newCollections) {
    if (vasuMap.has(colName)) {
      const vasuCount = await connVasu.db.collection(colName).countDocuments();
      if (vasuCount > 0) {
        // Master & catalog collections get full or high limits
        let limit = 20;
        if (["roles", "categories", "branches", "permissions", "slaConfigurations", "numberSequences", "inventoryItems", "estimates", "printers"].includes(colName)) {
          limit = 200;
        } else if (colName === "stocks") {
          limit = 500;
        }

        const sampleDocs = await connVasu.db.collection(colName).find({}).limit(limit).toArray();
        if (sampleDocs.length > 0) {
          // If copying users, ensure password field is populated so they can authenticate
          if (colName === "users") {
            sampleDocs.forEach((u) => {
              if (!u.password) {
                u.password = defaultHashedPassword;
              }
              u.isActive = true;
              u.status = "ACTIVE";
            });
          }

          for (const doc of sampleDocs) {
            await connNew.db.collection(colName).updateOne(
              { _id: doc._id },
              { $set: doc },
              { upsert: true }
            );
          }
          console.log(` [${colName}] Seeded ${sampleDocs.length} sample docs from reference database.`);
        }
      }
    }
  }

  // Passwords for one-click login and demo accounts
  const adminHashedPassword = await bcrypt.hash("Admin@123", 10);
  const managerHashedPassword = await bcrypt.hash("Manager@123", 10);

  // Find Banaswadi branch for manager
  const banaswadiBranch = await connNew.db.collection("branches").findOne({ name: /banas/i });

  // Ensure standard and 1-click test accounts exist in 'users'
  const sampleUsers = [
    {
      name: "Banaswadi Manager",
      username: "bn_manager",
      email: "bn@printz.shop",
      password: managerHashedPassword,
      role: "manager",
      branch: banaswadiBranch ? banaswadiBranch.name : "Banaswadii",
      branchName: banaswadiBranch ? banaswadiBranch.name : "Banaswadii",
      branchId: banaswadiBranch ? banaswadiBranch._id : null,
      branchIds: banaswadiBranch ? [banaswadiBranch._id] : [],
      status: "ACTIVE",
      isActive: true,
      failedLoginAttempts: 0,
    },
    {
      name: "Printz Admin",
      username: "admin_printz",
      email: "admin@printz.shop",
      password: adminHashedPassword,
      role: "admin",
      status: "ACTIVE",
      isActive: true,
      failedLoginAttempts: 0,
    },
    {
      name: "Super Admin",
      username: "admin",
      email: "admin@printz.com",
      password: adminHashedPassword,
      role: "admin",
      status: "ACTIVE",
      isActive: true,
      failedLoginAttempts: 0,
    },
    {
      name: "Store Manager",
      username: "manager",
      email: "manager@printz.com",
      password: managerHashedPassword,
      role: "manager",
      branch: banaswadiBranch ? banaswadiBranch.name : "Banaswadii",
      branchName: banaswadiBranch ? banaswadiBranch.name : "Banaswadii",
      branchId: banaswadiBranch ? banaswadiBranch._id : null,
      branchIds: banaswadiBranch ? [banaswadiBranch._id] : [],
      status: "ACTIVE",
      isActive: true,
      failedLoginAttempts: 0,
    },
    {
      name: "Senior Cashier",
      username: "cashier",
      email: "cashier@printz.com",
      password: defaultHashedPassword,
      role: "cashier",
      status: "ACTIVE",
      isActive: true,
      failedLoginAttempts: 0,
    },
  ];

  for (const u of sampleUsers) {
    await connNew.db.collection("users").updateOne(
      { email: u.email },
      { $set: u },
      { upsert: true }
    );
  }
  console.log(" [users] Seeded 1-click accounts: bn@printz.shop, admin@printz.shop, admin@printz.com, manager@printz.com.");

  // Get sample references for generating foreign key dependent collections
  const firstBranch = await connNew.db.collection("branches").findOne({});
  const branchId = firstBranch ? firstBranch._id : new mongoose.Types.ObjectId();
  const branchName = firstBranch ? firstBranch.name : "Main Branch";
  const branchCode = firstBranch ? firstBranch.code : "MB";

  const firstUser = await connNew.db.collection("users").findOne({ role: "admin" }) || await connNew.db.collection("users").findOne({});
  const userId = firstUser ? firstUser._id : new mongoose.Types.ObjectId();

  const firstJob = await connNew.db.collection("jobOrders").findOne({});
  const jobOrderId = firstJob ? firstJob._id : new mongoose.Types.ObjectId();

  const firstItem = await connNew.db.collection("inventoryItems").findOne({});
  const itemId = firstItem ? firstItem._id : new mongoose.Types.ObjectId();

  const firstDelivery = await connNew.db.collection("deliveryOrders").findOne({});
  const deliveryOrderId = firstDelivery ? firstDelivery._id : new mongoose.Types.ObjectId();

  // 2. Synthesize realistic sample records for collections that were empty or missing in vasu_db

  // a. departments
  const deptCount = await connNew.db.collection("departments").countDocuments();
  let designDeptId = new mongoose.Types.ObjectId();
  let prodDeptId = new mongoose.Types.ObjectId();
  let salesDeptId = new mongoose.Types.ObjectId();

  if (deptCount === 0) {
    const sampleDepartments = [
      {
        _id: designDeptId,
        name: "Design & Creative",
        code: "DES",
        description: "Graphic design, prepress proofing and layout department",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: prodDeptId,
        name: "Digital Printing & Production",
        code: "PROD",
        description: "Offset, digital print operations and post-press finishing",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: salesDeptId,
        name: "Sales & Front Desk",
        code: "SALES",
        description: "Customer service, POS billing and order intake",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("departments").insertMany(sampleDepartments);
    console.log(" [departments] Seeded 3 sample departments.");
  } else {
    const existingDept = await connNew.db.collection("departments").findOne({});
    if (existingDept) designDeptId = existingDept._id;
  }

  // b. designations
  const desigCount = await connNew.db.collection("designations").countDocuments();
  if (desigCount === 0) {
    const sampleDesignations = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Senior Graphic Designer",
        code: "SR_DES",
        departmentId: designDeptId,
        description: "Handles complex customer design requests and proofs",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Print Machine Operator",
        code: "MACH_OP",
        departmentId: prodDeptId,
        description: "Operates high-speed Xerox, digital and plotter machines",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Branch Store Manager",
        code: "BR_MGR",
        departmentId: salesDeptId,
        description: "Oversees branch operations, inventory and daily sales closure",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("designations").insertMany(sampleDesignations);
    console.log(" [designations] Seeded 3 sample designations.");
  }

  // c. paymentToBeCollected
  const paymentCount = await connNew.db.collection("paymentToBeCollected").countDocuments();
  if (paymentCount === 0) {
    const samplePayments = [
      {
        _id: new mongoose.Types.ObjectId(),
        branchId: branchId,
        date: "2026-10-14",
        dateAt: new Date("2026-10-14"),
        balance: 2450,
        paymentCollectedTillNow: 15500,
        paymentToBeCollected: 2450,
        items: [
          {
            invoiceNo: "INV-2026-0010",
            customerName: "Apex Media Agency",
            amountDue: 1450,
            dueDate: "2026-10-18",
          },
          {
            invoiceNo: "INV-2026-0011",
            customerName: "City Retailers Ltd",
            amountDue: 1000,
            dueDate: "2026-10-20",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        branchId: branchId,
        date: "2026-10-13",
        dateAt: new Date("2026-10-13"),
        balance: 1200,
        paymentCollectedTillNow: 18200,
        paymentToBeCollected: 1200,
        items: [
          {
            invoiceNo: "INV-2026-0008",
            customerName: "Sunrise Enterprises",
            amountDue: 1200,
            dueDate: "2026-10-16",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("paymentToBeCollected").insertMany(samplePayments);
    console.log(" [paymentToBeCollected] Seeded 2 sample records.");
  }

  // d. sales
  const salesCount = await connNew.db.collection("sales").countDocuments();
  if (salesCount === 0) {
    const sampleSales = [
      {
        _id: new mongoose.Types.ObjectId(),
        branchID: String(branchId),
        branchName: branchName,
        managerID: userId,
        jobOrderId: jobOrderId,
        invoiceNo: "INV-SALES-2026-001",
        date: "2026-10-14",
        itemsSold: [
          {
            itemID: "ITEM-A4-001",
            name: "A4 Color Flyer 150gsm",
            quantity: 500,
            unitPrice: 2.5,
            totalAmount: 1250,
          },
        ],
        subtotal: 1250,
        gst: 225,
        grandTotal: 1475,
        totalAmount: 1475,
        paymentStatus: "Paid",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        branchID: String(branchId),
        branchName: branchName,
        managerID: userId,
        jobOrderId: jobOrderId,
        invoiceNo: "INV-SALES-2026-002",
        date: "2026-10-14",
        itemsSold: [
          {
            itemID: "ITEM-POSTER-002",
            name: "Vinyl Banner 6x3 ft with Eyelets",
            quantity: 2,
            unitPrice: 450,
            totalAmount: 900,
          },
        ],
        subtotal: 900,
        gst: 162,
        grandTotal: 1062,
        totalAmount: 1062,
        paymentStatus: "Paid",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("sales").insertMany(sampleSales);
    console.log(" [sales] Seeded 2 sample sales.");
  }

  // e. purchaseReceipts
  const prCount = await connNew.db.collection("purchaseReceipts").countDocuments();
  if (prCount === 0) {
    const samplePurchaseReceipts = [
      {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: "PR-2026-001",
        branchId: branchId,
        supplierName: "Apex Paper Mill Supplies",
        supplierInvoiceNo: "APM-INV-8821",
        receivedDate: new Date(),
        items: [
          {
            itemId: itemId,
            quantity: 100,
            purchaseRate: 85,
            amount: 8500,
          },
        ],
        totalAmount: 8500,
        paymentStatus: "PAID",
        remarks: "Received full stock in good quality",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        receiptNo: "PR-2026-002",
        branchId: branchId,
        supplierName: "ColorTone Toners & Inks Ltd",
        supplierInvoiceNo: "CT-9042",
        receivedDate: new Date(),
        items: [
          {
            itemId: itemId,
            quantity: 10,
            purchaseRate: 1200,
            amount: 12000,
          },
        ],
        totalAmount: 12000,
        paymentStatus: "PAID",
        remarks: "Cyan and Magenta cartridges restocked",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("purchaseReceipts").insertMany(samplePurchaseReceipts);
    console.log(" [purchaseReceipts] Seeded 2 sample purchase receipts.");
  }

  // f. jumboXeroxPricing
  const jxCount = await connNew.db.collection("jumboXeroxPricing").countDocuments();
  if (jxCount === 0) {
    const sampleJx = [
      {
        _id: new mongoose.Types.ObjectId(),
        branchId: branchId,
        printerId: "PRN-JX-01",
        printerName: "Canon imagePROGRAF TX-5400",
        size: "A0",
        type: "Color CAD Drawing",
        unitPrice: 45.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        branchId: branchId,
        printerId: "PRN-JX-02",
        printerName: "HP DesignJet T1700",
        size: "A1",
        type: "Blueprint Monochrome",
        unitPrice: 22.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        branchId: branchId,
        printerId: "PRN-JX-03",
        printerName: "Epson SureColor P8000",
        size: "A2",
        type: "Photographic Glossy",
        unitPrice: 65.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("jumboXeroxPricing").insertMany(sampleJx);
    console.log(" [jumboXeroxPricing] Seeded 3 sample pricing configurations.");
  }

  // g. deliveryProofs
  const dpCount = await connNew.db.collection("deliveryProofs").countDocuments();
  if (dpCount === 0) {
    const sampleDeliveryProofs = [
      {
        _id: new mongoose.Types.ObjectId(),
        proofNo: "DP-2026-0001",
        deliveryOrderId: deliveryOrderId,
        deliveryNo: "DEL-2026-001",
        jobOrderId: jobOrderId,
        branchId: branchId,
        recipientName: "Venkatesh Rao",
        recipientPhone: "+91 98450 12345",
        recipientRelationship: "Self",
        deliveryType: "doorstep",
        otp: "482910",
        otpVerified: true,
        deliveryPhotos: ["uploads/proof_del_01.jpg"],
        remarks: "Package received and verified",
        proofType: "DIGITAL_OTP",
        location: {
          latitude: 13.0112,
          longitude: 77.6514,
          address: "12/A 4th Cross, Kalyan Nagar, Bengaluru",
        },
        deliveryPersonName: "Ramesh K",
        deliveredAt: new Date(),
        status: "DELIVERED",
        handoverStage: "COMPLETED",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("deliveryProofs").insertMany(sampleDeliveryProofs);
    console.log(" [deliveryProofs] Seeded 1 sample delivery proof.");
  }

  // h. attachments
  const attCount = await connNew.db.collection("attachments").countDocuments();
  if (attCount === 0) {
    const sampleAttachments = [
      {
        _id: new mongoose.Types.ObjectId(),
        entityType: "jobOrder",
        entityId: jobOrderId,
        fileName: "brochure_front_design_v2.pdf",
        mimeType: "application/pdf",
        size: 345120,
        checksum: "8a6e872d8e578c7b41e3a908f9024f0c",
        storageProvider: "local",
        storageKey: "uploads/brochure_front_design_v2.pdf",
        uploadedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        entityType: "jobOrder",
        entityId: jobOrderId,
        fileName: "company_logo_vector.svg",
        mimeType: "image/svg+xml",
        size: 51200,
        checksum: "4b9e872a8c578c7b41e3a908f9024f0d",
        storageProvider: "local",
        storageKey: "uploads/company_logo_vector.svg",
        uploadedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("attachments").insertMany(sampleAttachments);
    console.log(" [attachments] Seeded 2 sample attachments.");
  }

  // i. invoices
  const invCount = await connNew.db.collection("invoices").countDocuments();
  if (invCount === 0) {
    const custDoc = (await connNew.db.collection("customers").findOne({})) || {
      _id: new mongoose.Types.ObjectId(),
      name: "Acme Graphics & Retail Ltd",
      email: "billing@acmegraphics.com",
      mobile: "+91 98450 12345",
    };
    const jobDoc = (await connNew.db.collection("jobOrders").findOne({})) || {
      _id: jobOrderId,
      jobNo: "JO-202610-0001",
      title: "Tri-fold Corporate Product Brochure",
    };

    const invoiceId1 = new mongoose.Types.ObjectId();
    const invoiceId2 = new mongoose.Types.ObjectId();

    const sampleInvoices = [
      {
        _id: invoiceId1,
        invoiceNumber: "INV-202610-0001",
        jobOrderId: jobDoc._id,
        jobNo: jobDoc.jobNo || "JO-202610-0001",
        customerId: custDoc._id,
        customerSnapshot: {
          name: custDoc.name || "Acme Graphics & Retail Ltd",
          email: custDoc.email || "billing@acmegraphics.com",
          mobile: custDoc.mobile || "+91 98450 12345",
          address: "42 MG Road, Bengaluru",
        },
        branchId: branchId,
        branchSnapshot: {
          name: branchName,
          code: "BN-01",
        },
        status: "PARTIALLY_PAID",
        paymentStatus: "PARTIAL",
        invoiceType: "TAX_INVOICE",
        items: [
          {
            itemName: "Tri-fold Corporate Brochure (300gsm Gloss)",
            description: "Full color offset print with aqueous coating",
            quantity: 500,
            unit: "PCS",
            unitPrice: 2.5,
            discountValue: 0,
            discountAmount: 0,
            taxRate: 18,
            taxableAmount: 1250,
            cgstAmount: 112.5,
            sgstAmount: 112.5,
            igstAmount: 0,
            taxAmount: 225,
            lineTotal: 1475,
          },
        ],
        subtotal: 1250,
        discountTotal: 0,
        taxableAmount: 1250,
        cgstTotal: 112.5,
        sgstTotal: 112.5,
        igstTotal: 0,
        taxAmount: 225,
        roundOff: 0,
        grandTotal: 1475,
        advancePaid: 500,
        paidAmount: 975,
        balanceDue: 500,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invoiceDate: new Date(),
        createdBy: userId,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: invoiceId2,
        invoiceNumber: "INV-202610-0002",
        jobOrderId: jobDoc._id,
        jobNo: jobDoc.jobNo || "JO-202610-0001",
        customerId: custDoc._id,
        customerSnapshot: {
          name: custDoc.name || "Acme Graphics & Retail Ltd",
          email: custDoc.email || "billing@acmegraphics.com",
          mobile: custDoc.mobile || "+91 98450 12345",
        },
        branchId: branchId,
        branchSnapshot: {
          name: branchName,
          code: "BN-01",
        },
        status: "FINALIZED",
        paymentStatus: "UNPAID",
        invoiceType: "TAX_INVOICE",
        items: [
          {
            itemName: "Rollup Standee 6x3 ft with flex print",
            description: "High-res solvent flex with aluminum base",
            quantity: 2,
            unit: "PCS",
            unitPrice: 650,
            taxRate: 18,
            taxableAmount: 1300,
            taxAmount: 234,
            lineTotal: 1534,
          },
        ],
        subtotal: 1300,
        taxableAmount: 1300,
        taxAmount: 234,
        grandTotal: 1534,
        advancePaid: 0,
        paidAmount: 0,
        balanceDue: 1534,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        invoiceDate: new Date(),
        createdBy: userId,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("invoices").insertMany(sampleInvoices);
    console.log(" [invoices] Seeded 2 sample invoices.");

    // j. payments
    const samplePayments = [
      {
        _id: new mongoose.Types.ObjectId(),
        paymentNo: "PAY-202610-0001",
        invoiceId: invoiceId1,
        jobOrderId: jobDoc._id,
        customerId: custDoc._id,
        branchId: branchId,
        amount: 475,
        paymentMode: "UPI",
        paymentReference: "UPI/390291/GPay",
        paymentDate: new Date(),
        status: "SUCCESS",
        collectedBy: userId,
        remarks: "Interim payment for brochure printing",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("payments").insertMany(samplePayments);
    console.log(" [payments] Seeded 1 sample payment.");

    // k. invoiceReminders
    const sampleReminders = [
      {
        _id: new mongoose.Types.ObjectId(),
        invoiceId: invoiceId1,
        jobOrderId: jobDoc._id,
        customerId: custDoc._id,
        branchId: branchId,
        reminderType: "PAYMENT_FOLLOW_UP",
        channel: "WHATSAPP",
        status: "PENDING",
        scheduledAt: new Date(),
        remarks: "Kindly settle outstanding balance of RM 500.00",
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await connNew.db.collection("invoiceReminders").insertMany(sampleReminders);
    console.log(" [invoiceReminders] Seeded 1 sample invoice reminder.");
  }

  // 3. Final validation & summary across all collections
  console.log("\n=======================================================");
  console.log(`Document Counts across all collections in [${connNew.name}]:`);
  const finalCols = (await connNew.db.listCollections().toArray()).map((c) => c.name).sort();
  let nonZeroCount = 0;
  for (const col of finalCols) {
    const count = await connNew.db.collection(col).countDocuments();
    if (count > 0) nonZeroCount++;
    console.log(` - ${col}: ${count} document(s)`);
  }
  console.log(`\nResult: ${nonZeroCount} of ${finalCols.length} collections have active sample data.`);
  console.log("=======================================================\n");

  await connNew.close();
  await connVasu.close();
}

seedAll().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
