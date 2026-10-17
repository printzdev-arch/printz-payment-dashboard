const PublicJobRequestService = require("../../services/public/publicJobRequest.service");
const { PublicJobRequestDto } = require("../../utils/dto/public/PublicJobRequestDto");
const { asyncHandler, ResponseHelper } = require("../../utils");

/**
 * Handle public customer QR self-service job request
 */
const submitJobRequest = asyncHandler(async (req, res) => {
  const dto = PublicJobRequestDto.fromRequest(req);
  const uploadedFiles = req.files || (req.file ? [req.file] : []);

  const result = await PublicJobRequestService.createJobRequest(dto, uploadedFiles);

  if (result.isDuplicate) {
    return ResponseHelper.success(res, result, "Job request already received (idempotent submission)");
  }

  return ResponseHelper.created(res, result, result.message);
});

/**
 * Get branch QR job-request configuration for authorized employees
 */
const getBranchQrConfig = asyncHandler(async (req, res) => {
  const branchId = req.params.branchId || req.params.id;
  const result = await PublicJobRequestService.getBranchQrConfig(branchId, {
    user: req.user,
  });

  return ResponseHelper.success(
    res,
    result,
    "Branch QR job-request configuration retrieved successfully"
  );
});

/**
 * Check if customer with phone, email, or name already exists
 */
const checkCustomer = asyncHandler(async (req, res) => {
  const { phone, mobile, email, name } = req.query;
  const Customer = require("../../models/customer/Customer");

  const rawPhone = String(mobile || phone || "").trim();
  const rawEmail = String(email || "").trim().toLowerCase();
  const rawName = String(name || "").trim();

  let matched = null;
  let matchType = null;

  // 1. Check Phone / Mobile
  if (rawPhone && rawPhone.length >= 7) {
    let digits = rawPhone.replace(/[^\d]/g, "");
    if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

    const conditions = [{ mobile: rawPhone }, { phone: rawPhone }];
    if (digits) {
      conditions.push(
        { mobile: digits },
        { phone: digits },
        { mobile: `+91${digits}` },
        { phone: `+91${digits}` },
        { mobile: `0${digits}` },
        { phone: `0${digits}` }
      );
    }
    matched = await Customer.findOne({ $or: conditions })
      .select("customerCode name mobile phone email company companyName branchId")
      .populate("branchId", "name code")
      .lean();
    if (matched) matchType = "Phone";
  }

  // 2. Check Email
  if (!matched && rawEmail && rawEmail.includes("@")) {
    matched = await Customer.findOne({ email: rawEmail })
      .select("customerCode name mobile phone email company companyName branchId")
      .populate("branchId", "name code")
      .lean();
    if (matched) matchType = "Email";
  }

  // 3. Check Name
  if (!matched && rawName && rawName.length >= 3) {
    matched = await Customer.findOne({
      name: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    })
      .select("customerCode name mobile phone email company companyName branchId")
      .populate("branchId", "name code")
      .lean();
    if (matched) matchType = "Name";
  }

  return ResponseHelper.success(
    res,
    {
      exists: Boolean(matched),
      matchType,
      customer: matched || null,
    },
    matched ? `Customer already exists (matched by ${matchType})` : "Customer not found"
  );
});

/**
 * Get active branches for public customer self-service registration
 */
const getPublicBranches = asyncHandler(async (req, res) => {
  const Branch = require("../../models/common/Branch");
  const branches = await Branch.find({ isActive: true })
    .select("_id name code address phone")
    .sort({ name: 1 })
    .lean();

  return ResponseHelper.success(res, branches, "Branches retrieved successfully");
});

/**
 * Get current server LAN IP addresses for mobile QR intake
 */
const getServerNetworkIp = asyncHandler(async (req, res) => {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  const addresses = [];
  let bestIp = null;

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === "IPv4" && !net.internal) {
        addresses.push({
          interface: name,
          ip: net.address,
        });

        // Prefer active Wi-Fi or Ethernet adapter
        if (!bestIp) {
          bestIp = net.address;
        } else if (/wi-fi|wlan|wireless|ethernet|lan/i.test(name)) {
          bestIp = net.address;
        }
      }
    }
  }

  const hostHeader = req.get("host") || "";
  const requestIp = hostHeader.split(":")[0];
  const isValidReqIp = requestIp && requestIp !== "localhost" && requestIp !== "127.0.0.1";

  const resolvedIp = bestIp || (isValidReqIp ? requestIp : "192.23.0.180");
  const port = 3000;

  return ResponseHelper.success(
    res,
    {
      ip: resolvedIp,
      port,
      clientUrl: `http://${resolvedIp}:${port}`,
      addresses,
    },
    "Server network IP retrieved successfully"
  );
});

module.exports = {
  submitJobRequest,
  getBranchQrConfig,
  checkCustomer,
  getPublicBranches,
  getServerNetworkIp,
};

