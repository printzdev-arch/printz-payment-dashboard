/**
 * PrintZ Sample Data - Design Assignments & Proof Approval (Step 5 & 6)
 */

export const sampleDesignAssignments = [
  {
    "_id": "des_1791456752461_6d1w2",
    "id": "des_1791456752461_6d1w2",
    "assignmentId": "des_1791456752461_6d1w2",
    "assignmentNo": "DES-2026-00006",
    "jobId": "job_1791454942277_2jjuy",
    "jobNo": "JOB-2026-00051",
    "jobItemId": "item_1791454446070_1",
    "itemName": "Flex Banner (Frontlit / Star)",
    "productType": "Flex Banner (Frontlit / Star)",
    "customerCode": "CUS-000189",
    "customerName": "Guna",
    "customerMobile": "9876543211",
    "customerCompany": "MRF tyres",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "priority": "HIGH",
    "status": "APPROVED",
    "dueDate": "2026-10-24",
    "slaUrgency": "Due in 4h",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedAt": "2026-10-08T12:08:33.104Z",
    "assignedBy": "Branch Manager",
    "startedAt": null,
    "startedBy": null,
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 7,
      "unit": "SQFT",
      "size": "Custom Dimension",
      "width": 10,
      "height": 4,
      "sizeUnit": "FEET",
      "paperType": "Frontlit Star Flex Banner",
      "gsm": 340,
      "paperSize": "Roll",
      "side": "SINGLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": [
        "MOUNTING"
      ],
      "customerNotes": "Keep 2 as separate , and 5 as separate",
      "designNotes": "Standard design layout"
    },
    "customerFiles": [],
    "designFiles": [],
    "proofs": [
      {
        "proofId": "proof_1791459900600_fa6wl",
        "version": 1,
        "title": "Sample Version 1",
        "frontUrl": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
        "backUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "comments": "Updated font to Montserrat, logo enlarged 20%, Tamil name added below English.",
        "sendToMobile": "9876543211",
        "shareOnWhatsApp": true,
        "submittedBy": "Priya R",
        "submittedAt": "2026-10-08T11:45:00.600Z",
        "status": "SUBMITTED"
      },
      {
        "proofId": "proof_1791459957455_un2pn",
        "version": 2,
        "title": "Sample Version 2",
        "frontUrl": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
        "backUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "comments": "Updated font to Montserrat, logo enlarged 20%, Tamil name added below English.",
        "sendToMobile": "9876543211",
        "shareOnWhatsApp": true,
        "submittedBy": "Priya R",
        "submittedAt": "2026-10-08T11:45:57.454Z",
        "status": "APPROVED",
        "approvedAt": "2026-10-08T12:09:11.666Z"
      }
    ],
    "designerNotes": "",
    "internalNotes": "",
    "timeline": [
      {
        "event": "ASSIGNMENT_CREATED",
        "status": "PENDING_ASSIGNMENT",
        "actor": "System Workflow (Estimate Accepted)",
        "timestamp": "2026-10-08T10:52:32.460Z",
        "notes": "Design assignment initiated for Flex Banner (Frontlit / Star) (JOB-2026-00051)"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Auto Allocation (Round Robin)",
        "timestamp": "2026-10-08T11:22:16.666Z",
        "notes": "Automatically assigned to Priya R"
      },
      {
        "event": "DESIGN_PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-10-08T11:45:00.600Z",
        "notes": "Proof Sample V1 submitted to customer for approval."
      },
      {
        "event": "DESIGN_PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-10-08T11:45:57.454Z",
        "notes": "Proof Sample V2 submitted to customer for approval."
      },
      {
        "event": "PROOF_APPROVED",
        "status": "APPROVED",
        "actor": "Customer (Mr. Arjun)",
        "timestamp": "2026-10-08T11:59:34.921Z",
        "notes": "Customer approved Proof Version V2. Comments: Approved"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T12:08:33.104Z",
        "notes": "Assigned to Priya R. "
      },
      {
        "event": "PROOF_APPROVED",
        "status": "APPROVED",
        "actor": "Customer (Mr. Arjun)",
        "timestamp": "2026-10-08T12:09:11.666Z",
        "notes": "Customer approved Proof Version V2. Comments: Approved in person at branch counter by walk-in customer."
      }
    ],
    "createdAt": "2026-10-08T10:52:32.460Z",
    "updatedAt": "2026-10-08T12:09:11.666Z",
    "assignedDesignerRole": "Sr. Designer",
    "approvedAt": "2026-10-08T12:09:11.666Z",
    "reviews": [
      {
        "reviewId": "rev_1791460774921_s6rpq",
        "assignmentId": "des_1791456752461_6d1w2",
        "jobId": "job_1791454942277_2jjuy",
        "jobItemId": "item_1791454446070_1",
        "version": 2,
        "decision": "APPROVED",
        "comments": "Looks good. Approved for production.",
        "reviewedBy": "Customer (Online Portal)",
        "reviewedAt": "2026-10-08T11:59:34.921Z",
        "createdAt": "2026-10-08T11:59:34.921Z"
      },
      {
        "reviewId": "rev_1791461351668_zkbb3",
        "assignmentId": "des_1791456752461_6d1w2",
        "jobId": "job_1791454942277_2jjuy",
        "jobItemId": "item_1791454446070_1",
        "version": 2,
        "decision": "APPROVED",
        "comments": "Approved in person at branch counter by walk-in customer.",
        "reviewedBy": "Customer (Online Portal)",
        "reviewedAt": "2026-10-08T12:09:11.666Z",
        "createdAt": "2026-10-08T12:09:11.666Z"
      }
    ]
  },
  {
    "_id": "des_2026_00001",
    "id": "des_2026_00001",
    "assignmentId": "des_2026_00001",
    "assignmentNo": "DES-2026-00001",
    "jobId": "job_2026_00045",
    "jobNo": "JO-KO-2610-0045",
    "jobItemId": "item_00045_1",
    "itemName": "Visiting Card",
    "productType": "Visiting Card",
    "customerCode": "CUS-000184",
    "customerName": "ABC Printers",
    "customerContactPerson": "Mr. Arjun",
    "customerEmail": "abc@printers.com",
    "customerMobile": "+91 98765 43210",
    "customerCompany": "ABC Printers Pvt Ltd",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Kothanur",
    "priority": "HIGH",
    "status": "PROOF_PENDING",
    "dueDate": "22 Sep 2026",
    "slaUrgency": "Customer review 1d left",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedDesignerRole": "Sr. Designer",
    "assignedAt": "2026-09-15T17:10:00.000Z",
    "assignedBy": "Arun Kumar (Branch Manager)",
    "startedAt": "2026-09-16T11:20:00.000Z",
    "startedBy": "Priya R",
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 1000,
      "unit": "pcs",
      "size": "85 × 55 mm",
      "width": 85,
      "height": 55,
      "sizeUnit": "MM",
      "paperType": "Art Card",
      "gsm": 300,
      "paperSize": "SRA3",
      "side": "DOUBLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": [
        "Lamination (Matt)",
        "Die Cutting"
      ],
      "customerNotes": "Name & designation in Tamil + English. Blue-green theme similar to previous order.",
      "designNotes": "New executive layout, 2 revisions included"
    },
    "customerFiles": [
      {
        "fileId": "cfile_001",
        "fileName": "abc-logo.ai",
        "fileType": "application/illustrator",
        "fileSize": "1.8 MB",
        "fileUrl": "https://placehold.co/600x400/047857/ffffff?text=Vector+Logo+AI",
        "uploadedAt": "2026-09-15T16:30:00.000Z"
      },
      {
        "fileId": "cfile_002",
        "fileName": "old-card.jpg",
        "fileType": "image/jpeg",
        "fileSize": "640 KB",
        "fileUrl": "https://placehold.co/600x400/0f766e/ffffff?text=Old+Card+Sample",
        "uploadedAt": "2026-09-15T16:30:00.000Z"
      }
    ],
    "designFiles": [
      {
        "fileId": "dfile_001",
        "fileName": "abc-visiting-card-v1.pdf",
        "fileType": "application/pdf",
        "fileSize": "2.1 MB",
        "version": 1,
        "uploadedBy": "Priya R",
        "uploadedAt": "2026-09-16T17:20:00.000Z",
        "isCurrent": false
      },
      {
        "fileId": "dfile_002",
        "fileName": "abc-visiting-card-v2.pdf",
        "fileType": "application/pdf",
        "fileSize": "2.4 MB",
        "version": 2,
        "uploadedBy": "Priya R",
        "uploadedAt": "2026-09-17T16:15:00.000Z",
        "isCurrent": true
      }
    ],
    "proofs": [
      {
        "proofId": "proof_001",
        "version": 1,
        "title": "Initial Executive Layout",
        "frontUrl": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80",
        "backUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "comments": "Executive dark emerald layout with embossed logo placement.",
        "submittedBy": "Priya R",
        "submittedAt": "2026-09-16T17:20:00.000Z",
        "status": "REVISED",
        "customerFeedback": "Logo too small, add Tamil name.",
        "feedbackDate": "16 Sep 07:05 PM",
        "recordedBy": "Arun Kumar"
      },
      {
        "proofId": "proof_002",
        "version": 2,
        "title": "Sample v2 • Sent 17 Sep 2026, 04:15 PM via WhatsApp",
        "frontUrl": "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
        "backUrl": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
        "comments": "Updated font to Montserrat, logo enlarged 20%, Tamil name added below English.",
        "submittedBy": "Priya R",
        "submittedAt": "2026-09-17T16:15:00.000Z",
        "status": "SUBMITTED",
        "isCurrent": true
      }
    ],
    "reviews": [
      {
        "reviewId": "rev_001",
        "version": 1,
        "decision": "REVISION_REQUESTED",
        "comments": "Logo too small, add Tamil name.",
        "reviewedBy": "Customer (Mr. Arjun)",
        "reviewedAt": "2026-09-16T19:05:00.000Z"
      }
    ],
    "designerNotes": "Working on proof v2 revisions. Need vector font confirmation for Tamil text.",
    "internalNotes": "Important client, deliver initial proofs within 4 hours.",
    "timeline": [
      {
        "event": "ASSIGNMENT_CREATED",
        "status": "PENDING_ASSIGNMENT",
        "actor": "System Workflow (Estimate Accepted)",
        "timestamp": "2026-09-15T17:00:00.000Z",
        "notes": "Automated creation based on Job Item design requirement"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Arun Kumar (Branch Manager)",
        "timestamp": "2026-09-15T17:10:00.000Z",
        "notes": "Assigned to Priya R via Round Robin allocation"
      },
      {
        "event": "DESIGN_STARTED",
        "status": "IN_PROGRESS",
        "actor": "Priya R (Sr. Designer)",
        "timestamp": "2026-09-16T11:20:00.000Z",
        "notes": "Designer accepted assignment and opened workspace"
      },
      {
        "event": "PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-09-16T17:20:00.000Z",
        "notes": "Submitted Sample Proof V1"
      },
      {
        "event": "PROOF_REVISION_REQUESTED",
        "status": "REVISION_REQUESTED",
        "actor": "Customer (Mr. Arjun)",
        "timestamp": "2026-09-16T19:05:00.000Z",
        "notes": "Revision requested: 'Logo too small, add Tamil name.'"
      },
      {
        "event": "PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-09-17T16:15:00.000Z",
        "notes": "Submitted Sample Proof V2"
      }
    ],
    "createdAt": "2026-09-15T17:00:00.000Z",
    "updatedAt": "2026-09-17T16:15:00.000Z"
  },
  {
    "_id": "des_2026_00002",
    "id": "des_2026_00002",
    "assignmentId": "des_2026_00002",
    "assignmentNo": "DES-2026-00002",
    "jobId": "job_2026_00047",
    "jobNo": "JO-KO-2610-0047",
    "jobItemId": "item_00047_1",
    "itemName": "Invitation Card",
    "productType": "Invitation Card",
    "customerCode": "CUS-000186",
    "customerName": "Kids Planet Preschool",
    "customerContactPerson": "Mrs. Meena",
    "customerEmail": "contact@kidsplanet.edu",
    "customerMobile": "+91 98450 33445",
    "customerCompany": "Kids Planet Education Trust",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Kothanur",
    "priority": "HIGH",
    "status": "REVISION_REQUESTED",
    "dueDate": "21 Sep 2026",
    "slaUrgency": "Overdue 1h",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedDesignerRole": "Sr. Designer",
    "assignedAt": "2026-09-15T15:20:00.000Z",
    "assignedBy": "Arun Kumar (Branch Manager)",
    "startedAt": "2026-09-15T16:00:00.000Z",
    "startedBy": "Priya R",
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 300,
      "unit": "pcs",
      "size": "7 × 5 in",
      "paperType": "Metallic Gold Board",
      "gsm": 280,
      "side": "SINGLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": [
        "Foil Stamping",
        "Creasing"
      ],
      "customerNotes": "Annual day event theme: Cartoon characters with gold foil title.",
      "designNotes": "Playful colourful border with theme characters"
    },
    "customerFiles": [
      {
        "fileId": "cfile_003",
        "fileName": "event-details.docx",
        "fileType": "application/docx",
        "fileSize": "120 KB",
        "fileUrl": "https://placehold.co/600x400/3b82f6/ffffff?text=Event+Details",
        "uploadedAt": "2026-09-15T14:00:00.000Z"
      }
    ],
    "designFiles": [
      {
        "fileId": "dfile_003",
        "fileName": "invitation-card-v1.pdf",
        "fileType": "application/pdf",
        "fileSize": "3.1 MB",
        "version": 1,
        "uploadedBy": "Priya R",
        "uploadedAt": "2026-09-15T17:30:00.000Z",
        "isCurrent": true
      }
    ],
    "proofs": [
      {
        "proofId": "proof_003",
        "version": 1,
        "title": "Initial Cartoon Layout",
        "frontUrl": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80",
        "backUrl": "",
        "comments": "Playful cartoon border layout with placeholder for guest names.",
        "submittedBy": "Priya R",
        "submittedAt": "2026-09-15T17:30:00.000Z",
        "status": "REVISED",
        "customerFeedback": "Change font to gold, larger logo",
        "feedbackDate": "15 Sep 07:15 PM",
        "recordedBy": "Customer (Mrs. Meena)"
      }
    ],
    "reviews": [
      {
        "reviewId": "rev_002",
        "version": 1,
        "decision": "REVISION_REQUESTED",
        "comments": "Change font to gold, larger logo",
        "reviewedBy": "Customer (Mrs. Meena)",
        "reviewedAt": "2026-09-15T19:15:00.000Z"
      }
    ],
    "designerNotes": "Working on revision v2 -> v3.",
    "internalNotes": "Foil block size must not exceed 4x2 inches.",
    "timeline": [
      {
        "event": "ASSIGNMENT_CREATED",
        "status": "PENDING_ASSIGNMENT",
        "actor": "System Workflow",
        "timestamp": "2026-09-15T15:00:00.000Z"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Arun Kumar",
        "timestamp": "2026-09-15T15:20:00.000Z",
        "notes": "Assigned to Priya R"
      },
      {
        "event": "PROOF_SUBMITTED",
        "status": "PROOF_PENDING",
        "actor": "Priya R",
        "timestamp": "2026-09-15T17:30:00.000Z"
      },
      {
        "event": "PROOF_REVISION_REQUESTED",
        "status": "REVISION_REQUESTED",
        "actor": "Customer (Mrs. Meena)",
        "timestamp": "2026-09-15T19:15:00.000Z",
        "notes": "Revision requested: 'Change font to gold, larger logo'"
      }
    ],
    "createdAt": "2026-09-15T15:00:00.000Z",
    "updatedAt": "2026-09-15T19:15:00.000Z"
  },
  {
    "_id": "des_2026_00003",
    "id": "des_2026_00003",
    "assignmentId": "des_2026_00003",
    "assignmentNo": "DES-2026-00003",
    "jobId": "job_2026_00050",
    "jobNo": "JOB-2026-00050",
    "jobItemId": "item_00050_1",
    "itemName": "Restaurant Menu Card",
    "productType": "Menu Card",
    "customerCode": "CUS-000188",
    "customerName": "Green Leaf Café",
    "customerMobile": "9845077889",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "priority": "HIGH",
    "status": "ASSIGNED",
    "dueDate": "2026-10-14",
    "slaUrgency": "Due in 2h 10m",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedAt": "2026-10-08T11:44:32.321Z",
    "assignedBy": "Branch Manager",
    "startedAt": null,
    "startedBy": null,
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 200,
      "unit": "PCS",
      "size": "A4 Tri-Fold",
      "paperType": "Gloss Art Card",
      "gsm": 350,
      "side": "DOUBLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": [
        "Gloss Lamination",
        "Double Creasing"
      ],
      "customerNotes": "High contrast food images with price list columns.",
      "designNotes": "Tri-fold 6-page layout with beverage section on back page"
    },
    "customerFiles": [],
    "designFiles": [],
    "proofs": [],
    "designerNotes": "",
    "internalNotes": "Check image resolution before layout.",
    "timeline": [
      {
        "event": "ASSIGNMENT_CREATED",
        "status": "PENDING_ASSIGNMENT",
        "actor": "System Workflow",
        "timestamp": "2026-10-07T10:00:00.000Z",
        "notes": "Estimate accepted by Green Leaf Café"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Branch Manager",
        "timestamp": "2026-10-08T11:44:32.321Z",
        "notes": "Assigned to Priya R. "
      }
    ],
    "createdAt": "2026-10-07T10:00:00.000Z",
    "updatedAt": "2026-10-08T11:44:32.321Z",
    "assignedDesignerRole": "Sr. Designer"
  },
  {
    "_id": "des_2026_00004",
    "id": "des_2026_00004",
    "assignmentId": "des_2026_00004",
    "assignmentNo": "DES-2026-00004",
    "jobId": "job_2026_00052",
    "jobNo": "JOB-2026-00052",
    "jobItemId": "item_00052_1",
    "itemName": "Clinic Letterhead & Rx Pad",
    "productType": "Letterhead",
    "customerCode": "CUS-000190",
    "customerName": "Nova Health Clinic",
    "customerMobile": "9845099001",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "priority": "NORMAL",
    "status": "ASSIGNED",
    "dueDate": "2026-10-18",
    "slaUrgency": "Accept in 2h 05m",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80022",
    "assignedDesignerName": "Rahul M",
    "assignedDesignerCode": "RM",
    "assignedDesignerRole": "Designer",
    "assignedAt": "2026-10-07T10:30:00.000Z",
    "assignedBy": "Arun Kumar (Branch Manager)",
    "startedAt": null,
    "startedBy": null,
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 1000,
      "unit": "SHEET",
      "size": "A4 (210 × 297 mm)",
      "paperType": "Executive Bond",
      "gsm": 100,
      "side": "SINGLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": [
        "Padding on Top"
      ],
      "customerNotes": "Clean medical layout with doctor registration number.",
      "designNotes": "Header with hospital logo and footer with address & emergency contact"
    },
    "customerFiles": [],
    "designFiles": [],
    "proofs": [],
    "designerNotes": "",
    "internalNotes": "",
    "timeline": [
      {
        "event": "ASSIGNMENT_CREATED",
        "status": "PENDING_ASSIGNMENT",
        "actor": "System Workflow",
        "timestamp": "2026-10-07T10:15:00.000Z"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Arun Kumar",
        "timestamp": "2026-10-07T10:30:00.000Z"
      }
    ],
    "createdAt": "2026-10-07T10:15:00.000Z",
    "updatedAt": "2026-10-07T10:30:00.000Z"
  },
  {
    "_id": "des_2026_00005",
    "id": "des_2026_00005",
    "assignmentId": "des_2026_00005",
    "assignmentNo": "DES-2026-00005",
    "jobId": "job_2026_00049",
    "jobNo": "JOB-2026-00049",
    "jobItemId": "item_00049_1",
    "itemName": "School ID Cards & Lanyards",
    "productType": "PVC ID Card",
    "customerCode": "CUS-000187",
    "customerName": "Sunrise Public School",
    "customerMobile": "9845044556",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "priority": "NORMAL",
    "status": "IN_PROGRESS",
    "dueDate": "2026-10-16",
    "slaUrgency": "In design • 5h 20m left",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedDesignerRole": "Sr. Designer",
    "assignedAt": "2026-10-06T15:00:00.000Z",
    "assignedBy": "Arun Kumar",
    "startedAt": "2026-10-07T08:30:00.000Z",
    "startedBy": "Priya R",
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 850,
      "unit": "PCS",
      "size": "CR80 (85.6 × 54 mm)",
      "paperType": "PVC Thermal Card",
      "gsm": 760,
      "side": "DOUBLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": [
        "Slot Punching",
        "Lanyard Attachment"
      ],
      "customerNotes": "School crest on top left, student photo with barcode on back.",
      "designNotes": "Clean blue-gold layout matching school uniform colours"
    },
    "customerFiles": [],
    "designFiles": [],
    "proofs": [],
    "designerNotes": "Layout approved in draft, generating high-res mockups.",
    "internalNotes": "Standard CR80 size with slot on short edge.",
    "timeline": [
      {
        "event": "ASSIGNMENT_CREATED",
        "status": "PENDING_ASSIGNMENT",
        "actor": "System Workflow",
        "timestamp": "2026-10-06T14:45:00.000Z"
      },
      {
        "event": "DESIGNER_ASSIGNED",
        "status": "ASSIGNED",
        "actor": "Arun Kumar",
        "timestamp": "2026-10-06T15:00:00.000Z"
      },
      {
        "event": "DESIGN_STARTED",
        "status": "IN_PROGRESS",
        "actor": "Priya R",
        "timestamp": "2026-10-07T08:30:00.000Z"
      }
    ],
    "createdAt": "2026-10-06T14:45:00.000Z",
    "updatedAt": "2026-10-07T08:30:00.000Z"
  },
  {
    "_id": "des_bw_001",
    "id": "des_bw_001",
    "assignmentId": "des_bw_001",
    "assignmentNo": "DES-2026-00011",
    "jobId": "job_bw_002",
    "jobNo": "JOB-2026-00062",
    "jobItemId": "item_bw_002_1",
    "itemName": "Trifold A4 Brochure",
    "productType": "Brochure",
    "customerCode": "CUS-BW-002",
    "customerName": "Sneha Reddy",
    "customerMobile": "9845223344",
    "customerCompany": "Bloom Florists & Events",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "priority": "NORMAL",
    "status": "IN_PROGRESS",
    "dueDate": "2026-10-24",
    "slaUrgency": "In design • 6h left",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedDesignerRole": "Sr. Designer",
    "assignedAt": "2026-10-09T14:30:00.000Z",
    "assignedBy": "Branch Manager",
    "startedAt": "2026-10-10T09:00:00.000Z",
    "startedBy": "Priya R",
    "completedAt": null,
    "requirementSnapshot": {
      "quantity": 2500,
      "unit": "PCS",
      "size": "A4 (210 × 297 mm)",
      "paperType": "Gloss Art Paper",
      "gsm": 170,
      "side": "DOUBLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": ["CUTTING", "CREASING", "FOLDING"],
      "customerNotes": "Pastel botanical palette with rose gold headings",
      "designNotes": "Layout grid aligned for accordion fold"
    },
    "customerFiles": [],
    "designFiles": [],
    "proofs": [],
    "designerNotes": "Mockup draft 1 in progress on Adobe InDesign.",
    "internalNotes": "Customer requested PDF proof link via WhatsApp once ready.",
    "timeline": [
      { "event": "ASSIGNMENT_CREATED", "status": "PENDING_ASSIGNMENT", "actor": "System Workflow", "timestamp": "2026-10-09T14:00:00.000Z" },
      { "event": "DESIGNER_ASSIGNED", "status": "ASSIGNED", "actor": "Branch Manager", "timestamp": "2026-10-09T14:30:00.000Z" },
      { "event": "DESIGN_STARTED", "status": "IN_PROGRESS", "actor": "Priya R", "timestamp": "2026-10-10T09:00:00.000Z" }
    ],
    "createdAt": "2026-10-09T14:00:00.000Z",
    "updatedAt": "2026-10-10T09:00:00.000Z"
  },
  {
    "_id": "des_bw_002",
    "id": "des_bw_002",
    "assignmentId": "des_bw_002",
    "assignmentNo": "DES-2026-00012",
    "jobId": "job_bw_003",
    "jobNo": "JOB-2026-00063",
    "jobItemId": "item_bw_003_1",
    "itemName": "Outdoor Star Flex Banner (8x4 ft)",
    "productType": "Banner",
    "customerCode": "CUS-BW-003",
    "customerName": "Vikram Singh",
    "customerMobile": "9845334455",
    "customerCompany": "Urban Cafe & Roastery",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branchName": "Banaswadi",
    "priority": "HIGH",
    "status": "APPROVED",
    "dueDate": "2026-10-22",
    "slaUrgency": "Proof Approved",
    "assignedDesignerId": "64f2a1b2c3d4e5f6a7b80021",
    "assignedDesignerName": "Priya R",
    "assignedDesignerCode": "PR",
    "assignedDesignerRole": "Sr. Designer",
    "assignedAt": "2026-10-08T16:15:00.000Z",
    "assignedBy": "Branch Manager",
    "startedAt": "2026-10-09T08:30:00.000Z",
    "startedBy": "Priya R",
    "completedAt": "2026-10-09T15:00:00.000Z",
    "requirementSnapshot": {
      "quantity": 2,
      "unit": "PCS",
      "size": "96 x 48 inches",
      "paperType": "Star Flex 380 GSM",
      "gsm": 380,
      "side": "SINGLE_SIDE",
      "colourMode": "COLOUR",
      "finishing": ["EYELETS", "EDGE_TAPING"],
      "customerNotes": "Dark roast espresso mug photo with typography: 'URBAN CAFE'",
      "designNotes": "300 DPI high resolution vector banner"
    },
    "customerFiles": [],
    "designFiles": [],
    "proofs": [
      {
        "proofId": "proof_bw_001",
        "version": 1,
        "title": "Star Flex Banner Proof Final",
        "frontUrl": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80",
        "backUrl": null,
        "sampleNotes": "Color calibration set for Roland Eco-Solvent printer",
        "status": "APPROVED",
        "submittedAt": "2026-10-09T11:00:00.000Z",
        "decidedAt": "2026-10-09T15:00:00.000Z",
        "decidedBy": "Customer (Online Approval)",
        "comments": "Looks phenomenal! Approved for printing."
      }
    ],
    "designerNotes": "Customer approved proof v1 directly without revisions.",
    "internalNotes": "Production ready file exported to RIP queue.",
    "timeline": [
      { "event": "ASSIGNMENT_CREATED", "status": "PENDING_ASSIGNMENT", "actor": "System Workflow", "timestamp": "2026-10-08T16:00:00.000Z" },
      { "event": "DESIGNER_ASSIGNED", "status": "ASSIGNED", "actor": "Branch Manager", "timestamp": "2026-10-08T16:15:00.000Z" },
      { "event": "DESIGN_STARTED", "status": "IN_PROGRESS", "actor": "Priya R", "timestamp": "2026-10-09T08:30:00.000Z" },
      { "event": "PROOF_SUBMITTED", "status": "PROOF_SUBMITTED", "actor": "Priya R", "timestamp": "2026-10-09T11:00:00.000Z" },
      { "event": "PROOF_APPROVED", "status": "APPROVED", "actor": "Customer", "timestamp": "2026-10-09T15:00:00.000Z" }
    ],
    "createdAt": "2026-10-08T16:00:00.000Z",
    "updatedAt": "2026-10-09T15:00:00.000Z"
  }
];
