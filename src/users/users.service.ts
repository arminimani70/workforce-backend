import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SALT_ROUNDS = 10;

// Never send passwordHash over the wire, regardless of whether the document came from a
// query (where select:false already hides it) or straight out of .create() (where it doesn't).
export function toPublicUser(user: UserDocument) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(params: {
    organizationId: Types.ObjectId | string;
    fullName: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: params.email });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
    return this.userModel.create({
      organizationId: params.organizationId,
      fullName: params.fullName,
      email: params.email,
      passwordHash,
      role: params.role ?? UserRole.EMPLOYEE,
    });
  }

  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').exec();
  }

  findAllInOrg(organizationId: string): Promise<UserDocument[]> {
    return this.userModel.find({ organizationId }).sort({ fullName: 1 });
  }

  async findById(id: Types.ObjectId | string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  comparePassword(plainText: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(plainText, passwordHash);
  }

  // email and role are deliberately excluded — those aren't part of self-service profile
  // editing (see UpdateProfileDto).
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const update: Record<string, unknown> = {};
    if (dto.fullName !== undefined) update.fullName = dto.fullName;
    if (dto.phone !== undefined) update.phone = dto.phone;
    if (dto.birthDate !== undefined) update.birthDate = new Date(dto.birthDate);
    if (dto.address !== undefined) update.address = dto.address;
    if (dto.emergencyContactName !== undefined) {
      update.emergencyContactName = dto.emergencyContactName;
    }
    if (dto.emergencyContactPhone !== undefined) {
      update.emergencyContactPhone = dto.emergencyContactPhone;
    }
    if (dto.avatarUrl !== undefined) update.avatarUrl = dto.avatarUrl;

    const updated = await this.userModel.findByIdAndUpdate(userId, update, {
      new: true,
    });
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();
  }
}
