/**
 * PrintZ Master Data - ORGANIZATION & ACCESS CONTROL
 * Collections: users, roles, employees
 */

export const sampleRoles = [
  {
    "_id": "64f2a1b2c3d4e5f6a7b80901",
    "id": "64f2a1b2c3d4e5f6a7b80901",
    "roleName": "SUPERADMIN",
    "description": "Full enterprise global access across all branches",
    "permissions": ["*"],
    "isSystemRole": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80902",
    "id": "64f2a1b2c3d4e5f6a7b80902",
    "roleName": "BRANCH_MANAGER",
    "description": "Manage branch operations, quotations, approvals, stock & cashier",
    "permissions": [
      "job.create", "job.read", "job.update", "estimate.manage", "estimate.approve",
      "design.assign", "pos.bill", "stock.manage", "reports.branch"
    ],
    "isSystemRole": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80903",
    "id": "64f2a1b2c3d4e5f6a7b80903",
    "roleName": "DESIGNER",
    "description": "Design pool access, proof versioning and customer feedback processing",
    "permissions": [
      "design.queue.read", "design.proof.upload", "design.proof.update", "job.read"
    ],
    "isSystemRole": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80904",
    "id": "64f2a1b2c3d4e5f6a7b80904",
    "roleName": "OPERATOR",
    "description": "Machine queue operations, meter readings, impression counter logging",
    "permissions": [
      "production.order.read", "production.step.update", "machine.log"
    ],
    "isSystemRole": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80905",
    "id": "64f2a1b2c3d4e5f6a7b80905",
    "roleName": "CASHIER",
    "description": "POS counter billing, receipts, dues collection and cash handover",
    "permissions": [
      "pos.sale.create", "payment.collect", "receipt.print", "settlement.eod"
    ],
    "isSystemRole": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  }
];

export const sampleUsers = [
  // --- SUPERADMIN & ADMINS ---
  {
    "_id": "64f2a1b2c3d4e5f6a7b80001",
    "id": "64f2a1b2c3d4e5f6a7b80001",
    "username": "admin",
    "name": "Super Administrator",
    "email": "admin@printz.shop",
    "password": "Admin@123",
    "phone": "+91 98450 00001",
    "role": "superadmin",
    "roleId": "64f2a1b2c3d4e5f6a7b80901",
    "branchId": null,
    "branch": "All Branches",
    "branchName": "All Branches",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90001", "64f1a2b3c4d5e6f7a8b90002", "64f1a2b3c4d5e6f7a8b90003", "64f1a2b3c4d5e6f7a8b90004"],
    "permissions": {
      "all": true,
      "isDashboardCapability": true,
      "isPrinterCapability": true,
      "isStockCapability": true,
      "isRevenueCapability": true,
      "isAddAdmin": true,
      "isAddManager": true,
      "isExtraCapability": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T08:30:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T08:30:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80002",
    "id": "64f2a1b2c3d4e5f6a7b80002",
    "username": "printzdev",
    "name": "Printz Developer",
    "email": "printzdev@gmail.com",
    "password": "Admin@123",
    "phone": "+91 98450 00002",
    "role": "admin",
    "roleId": "64f2a1b2c3d4e5f6a7b80901",
    "branchId": null,
    "branch": "All Branches",
    "branchName": "All Branches",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90001", "64f1a2b3c4d5e6f7a8b90002"],
    "permissions": { "all": true },
    "isActive": true,
    "lastLogin": "2026-10-09T09:15:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T09:15:00.000Z"
  },

  // --- BRANCH MANAGERS ---
  {
    "_id": "64f2a1b2c3d4e5f6a7b80011",
    "id": "64f2a1b2c3d4e5f6a7b80011",
    "username": "bw_manager",
    "name": "Arun Kumar",
    "email": "arun@printz.shop",
    "password": "Manager@123",
    "phone": "+91 98450 12345",
    "role": "manager",
    "roleId": "64f2a1b2c3d4e5f6a7b80902",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branch": "Banaswadi",
    "branchName": "Banaswadi",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90001"],
    "permissions": {
      "isDashboardCapability": true,
      "isPrinterCapability": true,
      "isStockCapability": true,
      "isRevenueCapability": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T07:45:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T07:45:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80012",
    "id": "64f2a1b2c3d4e5f6a7b80012",
    "username": "km_manager",
    "name": "Rajesh Sharma",
    "email": "rajesh@printz.shop",
    "password": "Manager@123",
    "phone": "+91 98450 12346",
    "role": "manager",
    "roleId": "64f2a1b2c3d4e5f6a7b80902",
    "branchId": "64f1a2b3c4d5e6f7a8b90002",
    "branch": "Kammanahalli",
    "branchName": "Kammanahalli",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90002"],
    "permissions": {
      "isDashboardCapability": true,
      "isPrinterCapability": true,
      "isStockCapability": true,
      "isRevenueCapability": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T08:00:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T08:00:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80014",
    "id": "64f2a1b2c3d4e5f6a7b80014",
    "username": "lr_manager",
    "name": "Sathasivam",
    "email": "lr@printz.shop",
    "password": "Manager@123",
    "phone": "+91 98450 12348",
    "role": "manager",
    "roleId": "64f2a1b2c3d4e5f6a7b80902",
    "branchId": "64f1a2b3c4d5e6f7a8b90004",
    "branch": "Lingrajpuram",
    "branchName": "Lingrajpuram",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90004"],
    "permissions": {
      "isDashboardCapability": true,
      "isPrinterCapability": true,
      "isStockCapability": true,
      "isRevenueCapability": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T08:10:00.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T08:10:00.000Z"
  },

  // --- GRAPHIC DESIGNERS ---
  {
    "_id": "64f2a1b2c3d4e5f6a7b80077",
    "id": "64f2a1b2c3d4e5f6a7b80077",
    "username": "priya_design",
    "name": "Priya Ramesh",
    "email": "priya@printz.shop",
    "password": "Designer@123",
    "phone": "+91 98450 77001",
    "role": "designer",
    "roleId": "64f2a1b2c3d4e5f6a7b80903",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branch": "Banaswadi",
    "branchName": "Banaswadi",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90001", "64f1a2b3c4d5e6f7a8b90002"],
    "permissions": {
      "design": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T08:45:00.000Z",
    "createdAt": "2025-03-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T08:45:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80078",
    "id": "64f2a1b2c3d4e5f6a7b80078",
    "username": "karthik_design",
    "name": "Karthik Subramanian",
    "email": "karthik.s@printz.shop",
    "password": "Designer@123",
    "phone": "+91 98450 77002",
    "role": "designer",
    "roleId": "64f2a1b2c3d4e5f6a7b80903",
    "branchId": "64f1a2b3c4d5e6f7a8b90002",
    "branch": "Kammanahalli",
    "branchName": "Kammanahalli",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90002"],
    "permissions": {
      "design": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T09:00:00.000Z",
    "createdAt": "2025-03-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T09:00:00.000Z"
  },

  // --- MACHINE OPERATORS ---
  {
    "_id": "64f2a1b2c3d4e5f6a7b80088",
    "id": "64f2a1b2c3d4e5f6a7b80088",
    "username": "suresh_operator",
    "name": "Suresh Kumar",
    "email": "suresh.k@printz.shop",
    "password": "Operator@123",
    "phone": "+91 98450 88001",
    "role": "operator",
    "roleId": "64f2a1b2c3d4e5f6a7b80904",
    "branchId": "64f1a2b3c4d5e6f7a8b90001",
    "branch": "Banaswadi",
    "branchName": "Banaswadi",
    "authorizedBranchIds": ["64f1a2b3c4d5e6f7a8b90001"],
    "permissions": {
      "production": true
    },
    "isActive": true,
    "lastLogin": "2026-10-09T07:30:00.000Z",
    "createdAt": "2025-02-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T07:30:00.000Z"
  }
];

export const sampleEmployees = [
  {
    "_id": "64f2a1b2c3d4e5f6a7b80801",
    "id": "64f2a1b2c3d4e5f6a7b80801",
    "employeeCode": "EMP-001",
    "userId": "64f2a1b2c3d4e5f6a7b80011",
    "firstName": "Arun",
    "lastName": "Kumar",
    "phone": "+91 98450 12345",
    "departmentId": "64f2a1b2c3d4e5f6a7b80851",
    "designationId": "64f2a1b2c3d4e5f6a7b80861",
    "dateOfJoining": "2025-01-01T00:00:00.000Z",
    "salary": 45000.0,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  },
  {
    "_id": "64f2a1b2c3d4e5f6a7b80802",
    "id": "64f2a1b2c3d4e5f6a7b80802",
    "employeeCode": "EMP-002",
    "userId": "64f2a1b2c3d4e5f6a7b80077",
    "firstName": "Priya",
    "lastName": "Ramesh",
    "phone": "+91 98450 77001",
    "departmentId": "64f2a1b2c3d4e5f6a7b80852",
    "designationId": "64f2a1b2c3d4e5f6a7b80862",
    "dateOfJoining": "2025-03-01T00:00:00.000Z",
    "salary": 32000.0,
    "isActive": true,
    "createdAt": "2025-03-01T00:00:00.000Z",
    "updatedAt": "2026-10-09T00:00:00.000Z"
  }
];

export default {
  sampleUsers,
  sampleRoles,
  sampleEmployees
};
