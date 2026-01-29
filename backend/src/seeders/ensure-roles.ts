import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "../utils/role-permission";

export const ensureRolesSeeded = async () => {
  console.log("Ensuring default roles exist...");

  for (const roleName of Object.keys(RolePermissions)) {
    const role = roleName as keyof typeof RolePermissions;
    const permissions = RolePermissions[role];

    const existingRole = await RoleModel.findOne({ name: role });
    if (!existingRole) {
      const newRole = new RoleModel({
        name: role,
        permissions,
      });
      await newRole.save();
      console.log(`Role ${role} added with permissions.`);
    }
  }
};
