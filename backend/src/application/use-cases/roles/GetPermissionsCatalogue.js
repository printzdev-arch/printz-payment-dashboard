/**
 * GetPermissionsCatalogue Use Case
 * Returns all system permissions directly from the database, grouped by module.
 */
class GetPermissionsCatalogue {
  constructor({ permissionRepository } = {}) {
    this.permissionRepository = permissionRepository;
  }

  async execute() {
    const permissions = (await this.permissionRepository.findAll()) || [];

    const grouped = permissions.reduce((acc, curr) => {
      const mod = curr.module || "general";
      acc[mod] = acc[mod] || [];
      acc[mod].push(curr);
      return acc;
    }, {});

    return {
      permissions,
      grouped,
    };
  }
}

module.exports = GetPermissionsCatalogue;
