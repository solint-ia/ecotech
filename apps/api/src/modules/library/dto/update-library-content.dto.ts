import { PartialType } from '@nestjs/mapped-types';
import { CreateLibraryContentDto } from './create-library-content.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApprovalStatus } from '@prisma/client';

export class UpdateLibraryContentDto extends PartialType(CreateLibraryContentDto) {
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;
}
