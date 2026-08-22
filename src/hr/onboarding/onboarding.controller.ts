import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { UserRole } from '../../users/schemas/user.schema';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingGuideDto } from './dto/update-onboarding-guide.dto';
import { UploadOnboardingResourceDto } from './dto/upload-onboarding-resource.dto';
import {
  ONBOARDING_UPLOADS_DIR,
  onboardingResourceMulterOptions,
} from './onboarding-upload.config';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.getForOrg(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingGuideDto,
  ) {
    return this.onboardingService.update(
      user.organizationId,
      user.userId,
      dto.sections,
      dto.rules ?? [],
    );
  }

  // Any authenticated user — the list of training material attached to onboarding.
  @Get('resources')
  listResources(@CurrentUser() user: AuthenticatedUser) {
    return this.onboardingService.listResources(user.organizationId);
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Post('resources')
  @UseInterceptors(FileInterceptor('file', onboardingResourceMulterOptions))
  uploadResource(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadOnboardingResourceDto,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    return this.onboardingService.createResource(
      user.organizationId,
      user.userId,
      file,
      dto.title ?? '',
    );
  }

  // Any authenticated user — streams the file itself, not just its metadata.
  @Get('resources/:id/download')
  async downloadResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const resource = await this.onboardingService.getResourceForDownload(
      user.organizationId,
      id,
    );
    // @Res() hands the response to us directly, bypassing Nest's exception filters — a missing
    // file on disk (metadata exists, the file itself doesn't) needs its own error handling here.
    res.download(
      join(ONBOARDING_UPLOADS_DIR, resource.storedFileName),
      resource.fileName,
      (err) => {
        if (err && !res.headersSent) {
          res.status(404).json({ message: 'File not found' });
        }
      },
    );
  }

  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @Delete('resources/:id')
  deleteResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.onboardingService.deleteResource(user.organizationId, id);
  }
}
