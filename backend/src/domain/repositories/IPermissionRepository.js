/**
 * IPermissionRepository Interface / Contract
 */
class IPermissionRepository {
  async findAll() { throw new Error("Method not implemented"); }
  async findByModule(module) { throw new Error("Method not implemented"); }
  async bulkUpsert(permissions) { throw new Error("Method not implemented"); }
}

module.exports = IPermissionRepository;
