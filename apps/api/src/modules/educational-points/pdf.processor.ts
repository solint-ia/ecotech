import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EducationalPointsService } from './educational-points.service';

@Processor('pdf-queue')
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly educationalPointsService: EducationalPointsService
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
    
    if (job.name === 'generate-pdf') {
      const { pointId } = job.data;
      try {
        this.logger.log(`Generating Assets (PDF/QR) for point ${pointId}...`);
        
        // Fetch point data needed for PDF generation
        const point = await this.prisma.educationalPoint.findUnique({
          where: { id: pointId },
          include: { trail: { select: { title: true, slug: true, school: { select: { name: true } } } } },
        });

        if (point) {
          await this.educationalPointsService.generateAssetsForPoint(point, point.trail);
          this.logger.log(`Assets (PDF/QR) generated successfully for ${pointId}`);
        } else {
          this.logger.warn(`Point ${pointId} not found for PDF generation.`);
        }
      } catch (error) {
        this.logger.error(`Failed to generate PDF for ${pointId}: ${error.message}`);
        throw error;
      }
    }
  }
}
