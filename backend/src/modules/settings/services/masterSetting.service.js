const MasterCategory = require("../models/MasterCategory");
const MasterDefault = require("../models/MasterDefault");
const ErrorHelper = require("../../../utils/ApiError");
const {
  INITIAL_MASTER_CATEGORIES,
  INITIAL_MASTER_ITEMS,
} = require("./masterSeeds");

const generateCode = (name) => {
  return String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
};

class MasterSettingService {
  /**
   * Ensure both MongoDB collections ("masterCategories" and "masterDefaults") are seeded
   * If collections are empty, seeds the factory defaults into MongoDB.
   */
  static async ensureDefaultsSeeded() {
    // 1. Seed Categories in MongoDB collection "masterCategories"
    const catCount = await MasterCategory.countDocuments();
    if (catCount === 0) {
      await MasterCategory.insertMany(INITIAL_MASTER_CATEGORIES);
    } else {
      // Check if any missing category needs to be inserted
      const existingKeys = await MasterCategory.distinct("category");
      const missingCats = INITIAL_MASTER_CATEGORIES.filter(
        (c) => !existingKeys.includes(c.category)
      );
      if (missingCats.length > 0) {
        await MasterCategory.insertMany(missingCats);
      }
    }

    // 2. Seed Default Items in MongoDB collection "masterDefaults"
    const categoriesInDb = await MasterCategory.find().lean();
    const catMap = {};
    categoriesInDb.forEach((c) => {
      catMap[c.category] = c;
    });

    const existingCategoriesInDefaults = await MasterDefault.distinct("category");
    const missingItems = INITIAL_MASTER_ITEMS.filter(
      (it) => !existingCategoriesInDefaults.includes(it.category)
    );

    if (missingItems.length > 0) {
      const docs = missingItems.map((it) => {
        const cat = catMap[it.category] || {};
        return {
          category: it.category,
          categoryLabel: cat.displayName || it.category,
          categoryGroup: cat.categoryGroup || "general",
          name: it.name,
          code: it.code || generateCode(it.name),
          description: "",
          config: it.config || "",
          defaultPrice: it.defaultPrice || 0,
          unit: it.unit || "pcs",
          isDefault: Boolean(it.isDefault),
          isActive: true,
          order: it.order || 1,
        };
      });

      await MasterDefault.insertMany(docs);
    }
  }

  /**
   * Retrieve all categories and options directly from MongoDB collections:
   * "masterCategories" and "masterDefaults"
   */
  static async getAllSettings() {
    await this.ensureDefaultsSeeded();

    // Query categories directly from MongoDB
    const categoriesFromDb = await MasterCategory.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    // Query all default options directly from MongoDB
    const allItems = await MasterDefault.find({})
      .sort({ order: 1, name: 1 })
      .lean();

    return categoriesFromDb.map((cat) => ({
      category: cat.category,
      displayName: cat.displayName,
      categoryGroup: cat.categoryGroup,
      icon: cat.icon,
      order: cat.order,
      items: allItems.filter((it) => it.category === cat.category),
    }));
  }

  /**
   * Retrieve a single category and its items directly from MongoDB collections
   */
  static async getCategory(category) {
    await this.ensureDefaultsSeeded();

    // Read category from MongoDB
    const cat = await MasterCategory.findOne({ category }).lean();
    if (!cat) {
      throw ErrorHelper.notFound(`Setting category '${category}' not found in MongoDB.`);
    }

    // Read items from MongoDB
    const items = await MasterDefault.find({ category })
      .sort({ order: 1, name: 1 })
      .lean();

    return {
      category: cat.category,
      displayName: cat.displayName,
      categoryGroup: cat.categoryGroup,
      icon: cat.icon,
      items,
    };
  }

  /**
   * Add a new item to MongoDB collection "masterDefaults"
   */
  static async addItem(category, itemData, user = null) {
    await this.ensureDefaultsSeeded();
    const name = (itemData.name || "").trim();
    if (!name) {
      throw ErrorHelper.badRequest("Option name is required.");
    }

    const cat = await MasterCategory.findOne({ category }).lean();
    const categoryLabel = cat?.displayName || category;
    const categoryGroup = cat?.categoryGroup || "general";

    // Check duplicate name within category in MongoDB
    const exists = await MasterDefault.findOne({
      category,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (exists) {
      throw ErrorHelper.conflict(`Option '${name}' already exists in this category.`);
    }

    // If marked as default, unset other defaults in this category in MongoDB
    if (itemData.isDefault) {
      await MasterDefault.updateMany({ category }, { $set: { isDefault: false } });
    }

    // Determine order from MongoDB
    const maxOrderDoc = await MasterDefault.findOne({ category })
      .sort({ order: -1 })
      .select("order");
    const nextOrder = (maxOrderDoc?.order || 0) + 1;

    // Create document in MongoDB "masterDefaults"
    const newItem = await MasterDefault.create({
      category,
      categoryLabel,
      categoryGroup,
      name,
      code: itemData.code?.trim() || generateCode(name),
      description: "",
      config: (itemData.config || "").trim(),
      defaultPrice: Number(itemData.defaultPrice) || 0,
      unit: (itemData.unit || "pcs").trim(),
      isDefault: Boolean(itemData.isDefault),
      isActive: itemData.isActive !== false,
      order: nextOrder,
      updatedBy: user?._id || null,
    });

    return newItem;
  }

  /**
   * Update an existing item directly in MongoDB collection "masterDefaults"
   */
  static async updateItem(category, itemId, itemData, user = null) {
    await this.ensureDefaultsSeeded();
    const item = await MasterDefault.findById(itemId);
    if (!item) {
      throw ErrorHelper.notFound(`Setting item with ID '${itemId}' not found in MongoDB.`);
    }

    if (itemData.name && itemData.name.trim()) {
      const newName = itemData.name.trim();
      if (newName.toLowerCase() !== item.name.toLowerCase()) {
        const exists = await MasterDefault.findOne({
          category,
          _id: { $ne: itemId },
          name: { $regex: new RegExp(`^${newName}$`, "i") },
        });
        if (exists) {
          throw ErrorHelper.conflict(`Option '${newName}' already exists in this category.`);
        }
      }
      item.name = newName;
    }

    if (itemData.code !== undefined) {
      item.code = itemData.code.trim() || generateCode(item.name);
    }
    item.description = "";

    if (itemData.config !== undefined) {
      item.config = itemData.config.trim();
    }
    if (itemData.defaultPrice !== undefined) {
      item.defaultPrice = Number(itemData.defaultPrice) || 0;
    }
    if (itemData.unit !== undefined) {
      item.unit = itemData.unit.trim();
    }
    if (itemData.isActive !== undefined) {
      item.isActive = Boolean(itemData.isActive);
    }
    if (itemData.order !== undefined) {
      item.order = Number(itemData.order) || 0;
    }

    if (itemData.isDefault === true) {
      await MasterDefault.updateMany(
        { category, _id: { $ne: itemId } },
        { $set: { isDefault: false } }
      );
      item.isDefault = true;
    } else if (itemData.isDefault === false) {
      item.isDefault = false;
    }

    if (user?._id) {
      item.updatedBy = user._id;
    }

    await item.save();
    return item;
  }

  /**
   * Delete an item directly from MongoDB collection "masterDefaults"
   */
  static async deleteItem(category, itemId, user = null) {
    await this.ensureDefaultsSeeded();
    const deleted = await MasterDefault.findByIdAndDelete(itemId);
    if (!deleted) {
      throw ErrorHelper.notFound(`Setting item with ID '${itemId}' not found in MongoDB.`);
    }
    return { success: true, deletedId: itemId };
  }

  /**
   * Reset a category to defaults in MongoDB
   */
  static async resetCategory(category) {
    const cat = await MasterCategory.findOne({ category }).lean();
    if (!cat) {
      throw ErrorHelper.notFound(`Category '${category}' not found in MongoDB.`);
    }

    // Delete existing documents in masterDefaults collection for this category
    await MasterDefault.deleteMany({ category });

    // Filter factory items
    const factoryItems = INITIAL_MASTER_ITEMS.filter((it) => it.category === category);
    const docs = factoryItems.map((it, idx) => ({
      category: cat.category,
      categoryLabel: cat.displayName,
      categoryGroup: cat.categoryGroup,
      name: it.name,
      code: it.code || generateCode(it.name),
      description: "",
      config: it.config || "",
      defaultPrice: it.defaultPrice || 0,
      unit: it.unit || "pcs",
      isDefault: Boolean(it.isDefault),
      isActive: true,
      order: it.order || idx + 1,
    }));

    if (docs.length > 0) {
      await MasterDefault.insertMany(docs);
    }

    return await this.getCategory(category);
  }

  /**
   * Reset all settings in MongoDB collections to factory defaults
   */
  static async resetAll() {
    await MasterCategory.deleteMany({});
    await MasterDefault.deleteMany({});
    await this.ensureDefaultsSeeded();
    return await this.getAllSettings();
  }
}

module.exports = MasterSettingService;
