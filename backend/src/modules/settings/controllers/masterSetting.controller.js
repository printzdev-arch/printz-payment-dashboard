const asyncHandler = require("../../../utils/asyncHandler");
const ResponseHelper = require("../../../utils/ResponseHelper");
const MasterSettingService = require("../services/masterSetting.service");

/**
 * Master Setting Controller
 * Handles CRUD and reset operations for project-wide master defaults and dropdown lists
 */

const getAllSettings = asyncHandler(async (req, res) => {
  const settings = await MasterSettingService.getAllSettings();
  return ResponseHelper.ok(res, "Master settings retrieved successfully", settings);
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await MasterSettingService.getCategory(req.params.category);
  return ResponseHelper.ok(res, "Category settings retrieved successfully", category);
});

const addItem = asyncHandler(async (req, res) => {
  const item = await MasterSettingService.addItem(
    req.params.category,
    req.body,
    req.user
  );
  return ResponseHelper.created(res, item, "Setting item added successfully");
});

const updateItem = asyncHandler(async (req, res) => {
  const item = await MasterSettingService.updateItem(
    req.params.category,
    req.params.itemId,
    req.body,
    req.user
  );
  return ResponseHelper.ok(res, "Setting item updated successfully", item);
});

const deleteItem = asyncHandler(async (req, res) => {
  const result = await MasterSettingService.deleteItem(
    req.params.category,
    req.params.itemId,
    req.user
  );
  return ResponseHelper.ok(res, "Setting item deleted successfully", result);
});

const resetCategory = asyncHandler(async (req, res) => {
  const category = await MasterSettingService.resetCategory(req.params.category);
  return ResponseHelper.ok(res, "Category reset to defaults successfully", category);
});

const resetAll = asyncHandler(async (req, res) => {
  const all = await MasterSettingService.resetAll();
  return ResponseHelper.ok(res, "All settings reset to factory defaults successfully", all);
});

module.exports = {
  getAllSettings,
  getCategory,
  addItem,
  updateItem,
  deleteItem,
  resetCategory,
  resetAll,
};
