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
          
          // Disparar Webhook para o Frontend para limpar o cache da página
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const webhookSecret = process.env.REVALIDATION_SECRET;
          
          if (webhookSecret) {
            const webhookUrl = `${frontendUrl}/api/revalidate`;
            try {
              const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-revalidation-secret': webhookSecret,
                },
                body: JSON.stringify({ path: `/pontos/${point.slug}` }),
              });
              
              if (response.ok) {
                this.logger.log(`[Webhook] Cache revalidado com sucesso para /pontos/${point.slug}`);
              } else {
                this.logger.warn(`[Webhook] Falha ao revalidar cache: ${response.status} ${response.statusText}`);
              }
            } catch (webhookErr) {
              this.logger.error(`[Webhook] Erro ao tentar disparar webhook para ${webhookUrl}: ${webhookErr.message}`);
            }
          }
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
