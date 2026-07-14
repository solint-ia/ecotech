import { IsEnum, IsString, Length, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApprovalStatus } from '@prisma/client';

/**
 * Body of the three moderation endpoints (partners, trails, library content).
 *
 * A rejection has to explain itself: the author reads this text back on their own
 * submissions screen, so an empty reason would leave them with nothing to act on.
 * The reason is therefore required — and only validated — when the new status is
 * REPROVADO; approving needs no justification.
 */
export class UpdateApprovalDto {
  @IsEnum(ApprovalStatus, { message: 'Status inválido.' })
  status: ApprovalStatus;

  // Trimmed before validation, so a reason of nothing but spaces can't pass the
  // length check. Both bounds live in a single @Length: with one decorator a
  // missing reason yields one coherent message, instead of a pile that leads with
  // an irrelevant "no máximo 1000 caracteres".
  @ValidateIf((dto: UpdateApprovalDto) => dto.status === ApprovalStatus.REPROVADO)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Informe a justificativa da reprovação.' })
  @Length(10, 1000, { message: 'A justificativa deve ter entre 10 e 1000 caracteres.' })
  reason?: string;
}
