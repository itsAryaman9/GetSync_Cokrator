import mongoose from "mongoose";
import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import WorkspaceModel from "../models/workspace.model";
import RoleModel from "../models/roles-permission.model";
import { Roles } from "../enums/role.enum";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/appError";
import MemberModel from "../models/member.model";
import { ProviderEnum } from "../enums/account-provider.enum";

const EMPLOYEE_CREDENTIALS = [
  {
    name: "Arjun Aswal",
    employeeCode: "COK001",
    password: "ASA@26001",
    role: Roles.ADMIN,
  },
  {
    name: "Kuldeep Rawat",
    employeeCode: "COK002",
    password: "KSR@26002",
    role: Roles.ADMIN,
  },
  {
    name: "Nirdosh Kumar",
    employeeCode: "COK003",
    password: "NKV@26003",
    role: Roles.ADMIN,
  },
  {
    name: "Ashish Rawat",
    employeeCode: "COK004",
    password: "Ashish@26004",
    role: Roles.MEMBER,
  },
  {
    name: "Vishal Kumar",
    employeeCode: "COK005",
    password: "Vishal@26005",
    role: Roles.MEMBER,
  },
  {
    name: "Tannu",
    employeeCode: "COK006",
    password: "Tannu@26006",
    role: Roles.MEMBER,
  },
  {
    name: "Sagar",
    employeeCode: "COK007",
    password: "Sagar@26007",
    role: Roles.MEMBER,
  },
  {
    name: "Mansi",
    employeeCode: "COK008",
    password: "Mansi@26008",
    role: Roles.MEMBER,
  },
  {
    name: "Nikhil",
    employeeCode: "COK009",
    password: "Nikhil@26009",
    role: Roles.MEMBER,
  },
  {
    name: "Soumya",
    employeeCode: "COK010",
    password: "Soumya@26010",
    role: Roles.MEMBER,
  },
  {
    name: "Sujata",
    employeeCode: "COK011",
    password: "Sujata@26011",
    role: Roles.MEMBER,
  },
  {
    name: "Aditi",
    employeeCode: "COK012",
    password: "Aditi@26012",
    role: Roles.MEMBER,
  },
  {
    name: "Diksha",
    employeeCode: "COK013",
    password: "Diksha@26013",
    role: Roles.MEMBER,
  },
  {
    name: "Ambika",
    employeeCode: "COK014",
    password: "Ambika@26014",
    role: Roles.MEMBER,
  },
  {
    name: "Pankaj Santra",
    employeeCode: "COK015",
    password: "Pankaj@260015",
    role: Roles.MEMBER,
  },
  {
    name: "Aryaman",
    employeeCode: "COK15072004",
    password: "1234",
    role: Roles.MEMBER,
  },
   {
    name: "Aryaman Admin",
    employeeCode: "1234",
    password: "1234",
    role: Roles.MEMBER,
  }
] as const;

const EMPLOYEE_EMAIL_DOMAIN = "getsync.local";

export const loginOrCreateAccountService = async (data: {
  provider: string;
  displayName: string;
  providerId: string;
  picture?: string;
  email?: string;
}) => {
  const { providerId, provider, displayName, email, picture } = data;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    console.log("Started Session...");

    let user = await UserModel.findOne({ email }).session(session);

    if (!user) {
      // Create a new user if it doesn't exist
      user = new UserModel({
        email,
        name: displayName,
        profilePicture: picture || null,
      });
      await user.save({ session });

      const account = new AccountModel({
        userId: user._id,
        provider: provider,
        providerId: providerId,
      });
      await account.save({ session });

      // 3. Create a new workspace for the new user
      const workspace = new WorkspaceModel({
        name: `My Workspace`,
        description: `Workspace created for ${user.name}`,
        owner: user._id,
      });
      await workspace.save({ session });

      const ownerRole = await RoleModel.findOne({
        name: Roles.OWNER,
      }).session(session);

      if (!ownerRole) {
        throw new NotFoundException("Owner role not found");
      }

      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
      });
      await member.save({ session });

      user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
      await user.save({ session });
    }
    await session.commitTransaction();
    session.endSession();
    console.log("End Session...");

    return { user };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  } finally {
    session.endSession();
  }
};

export const registerUserService = async (body: {
  email: string;
  name: string;
  password: string;
}) => {
  const { email, name, password } = body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingUser = await UserModel.findOne({ email }).session(session);
    if (existingUser) {
      throw new BadRequestException("Email already exists");
    }

    const user = new UserModel({
      email,
      name,
      password,
    });
    await user.save({ session });

    const account = new AccountModel({
      userId: user._id,
      provider: ProviderEnum.EMAIL,
      providerId: email,
    });
    await account.save({ session });

    // 3. Create a new workspace for the new user
    const workspace = new WorkspaceModel({
      name: `My Workspace`,
      description: `Workspace created for ${user.name}`,
      owner: user._id,
    });
    await workspace.save({ session });

    const ownerRole = await RoleModel.findOne({
      name: Roles.OWNER,
    }).session(session);

    if (!ownerRole) {
      throw new NotFoundException("Owner role not found");
    }

    const member = new MemberModel({
      userId: user._id,
      workspaceId: workspace._id,
      role: ownerRole._id,
      joinedAt: new Date(),
    });
    await member.save({ session });

    user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();
    console.log("End Session...");

    return {
      userId: user._id,
      workspaceId: workspace._id,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};

export const verifyUserService = async ({
  employeeCode,
  password,
  provider = ProviderEnum.EMAIL,
}: {
  employeeCode: string;
  password: string;
  provider?: string;
}) => {
  const credential = EMPLOYEE_CREDENTIALS.find(
    (employee) =>
      employee.employeeCode === employeeCode && employee.password === password
  );

  if (!credential) {
    throw new UnauthorizedException("Invalid employee code or password");
  }

  const employeeEmail = `${credential.employeeCode.toLowerCase()}@${EMPLOYEE_EMAIL_DOMAIN}`;
  let user = await UserModel.findOne({ email: employeeEmail });

  if (!user) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      user = new UserModel({
        email: employeeEmail,
        name: credential.name,
        profilePicture: null,
      });
      await user.save({ session });

      const account = new AccountModel({
        userId: user._id,
        provider,
        providerId: employeeEmail,
      });
      await account.save({ session });

      const workspace = new WorkspaceModel({
        name: `My Workspace`,
        description: `Workspace created for ${user.name}`,
        owner: user._id,
      });
      await workspace.save({ session });

      const role = await RoleModel.findOne({
        name: credential.role,
      }).session(session);

      if (!role) {
        throw new NotFoundException("Role not found");
      }

      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: role._id,
        joinedAt: new Date(),
      });
      await member.save({ session });

      user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
      await user.save({ session });

      await session.commitTransaction();
      session.endSession();
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  return user.omitPassword();
};
