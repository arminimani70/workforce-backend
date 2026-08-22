import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import {
  FormTemplate,
  FormTemplateDocument,
} from './schemas/form-template.schema';
import {
  FormSubmission,
  FormSubmissionDocument,
} from './schemas/form-submission.schema';
import { UpsertFormTemplateDto } from './dto/upsert-form-template.dto';
import { SubmitFormDto } from './dto/submit-form.dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(FormTemplate.name)
    private readonly templateModel: Model<FormTemplateDocument>,
    @InjectModel(FormSubmission.name)
    private readonly submissionModel: Model<FormSubmissionDocument>,
  ) {}

  async upsertTemplate(organizationId: string, dto: UpsertFormTemplateDto) {
    if (dto.id) {
      if (!isValidObjectId(dto.id)) {
        throw new NotFoundException('Form not found');
      }
      const updated = await this.templateModel.findOneAndUpdate(
        { _id: dto.id, organizationId },
        { title: dto.title, fields: dto.fields },
        { returnDocument: 'after' },
      );
      if (!updated) {
        throw new NotFoundException('Form not found');
      }
      return updated;
    }

    return this.templateModel.create({
      organizationId,
      title: dto.title,
      fields: dto.fields,
    });
  }

  listTemplates(organizationId: string) {
    return this.templateModel.find({ organizationId }).sort({ title: 1 });
  }

  async deleteTemplate(organizationId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Form not found');
    }
    const deleted = await this.templateModel.findOneAndDelete({
      _id: id,
      organizationId,
    });
    if (!deleted) {
      throw new NotFoundException('Form not found');
    }
  }

  async submit(organizationId: string, employeeId: string, dto: SubmitFormDto) {
    if (!isValidObjectId(dto.formTemplateId)) {
      throw new NotFoundException('Form not found');
    }
    const template = await this.templateModel.findOne({
      _id: dto.formTemplateId,
      organizationId,
    });
    if (!template) {
      throw new NotFoundException('Form not found');
    }

    return this.submissionModel.create({
      organizationId,
      formTemplateId: template._id,
      formTitle: template.title,
      employeeId,
      values: dto.values,
    });
  }

  // Org-wide, owner/manager only — every submission ever made, newest first.
  listSubmissions(organizationId: string) {
    return this.submissionModel
      .find({ organizationId })
      .populate('employeeId', 'fullName role')
      .sort({ createdAt: -1 });
  }
}
