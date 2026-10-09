/**
 * IAttachmentRepository Interface / Contract
 */
class IAttachmentRepository {
  async create(data) { throw new Error("Method not implemented"); }
  async findByChecksumAndEntity(checksum, entityType, entityId) { throw new Error("Method not implemented"); }
  async findById(id) { throw new Error("Method not implemented"); }
  async findAll(query, options) { throw new Error("Method not implemented"); }
  async deleteById(id) { throw new Error("Method not implemented"); }
}

module.exports = IAttachmentRepository;
