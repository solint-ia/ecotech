import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEducationalPointDto } from './dto/create-educational-point.dto';
import { UpdateEducationalPointDto } from './dto/update-educational-point.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

// Brand colors
const COLOR_DARK_GREEN = '#1A3D2B';
const COLOR_LIGHT_GREEN = '#4C8B5E';
const COLOR_BEIGE = '#F5EFE0';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PDFS_DIR = path.join(UPLOADS_DIR, 'pdfs');
const QR_DIR = path.join(UPLOADS_DIR, 'qrcodes');

// Ensure dirs exist
[UPLOADS_DIR, PDFS_DIR, QR_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildQrText(point: {
  title: string;
  offlineSummary: string;
  environmentalImportance: string;
  slug: string;
  trail: { title: string };
  preservationCare?: string;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return [
    `Ponto: ${point.title}`,
    `Trilha: ${point.trail.title}`,
    '',
    'Resumo:',
    point.offlineSummary || '—',
    '',
    'Importância ambiental:',
    (point.environmentalImportance || '—').substring(0, 200),
    '',
    'Conteúdo completo:',
    `${baseUrl}/pontos/${point.slug}`,
  ].join('\n');
}

async function generateQrCode(
  point: {
    title: string;
    offlineSummary: string;
    environmentalImportance: string;
    slug: string;
    trail: { title: string };
    preservationCare?: string;
  },
): Promise<{ textContent: string; imagePath: string }> {
  const textContent = buildQrText(point);
  const filename = `qr-${point.slug}-${Date.now()}.png`;
  const filePath = path.join(QR_DIR, filename);

  await QRCode.toFile(filePath, textContent, {
    errorCorrectionLevel: 'M',
    width: 400,
    margin: 2,
    color: { dark: COLOR_DARK_GREEN, light: '#FFFFFF' },
  });

  return { textContent, imagePath: `/uploads/qrcodes/${filename}` };
}

async function generatePdf(point: {
  title: string;
  type: string;
  shortDescription: string;
  fullDescription: string;
  curiosities?: string | null;
  environmentalImportance: string;
  preservationCare: string;
  mainImage?: string;
  slug: string;
  trail: { title: string; school?: { name: string } | null };
}): Promise<string> {
  const filename = `ponto-${point.slug}.pdf`;
  const filePath = path.join(PDFS_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // --- Header bar ---
    doc.rect(0, 0, doc.page.width, 80).fill(COLOR_DARK_GREEN);

    // Logo placeholder + title in header
    doc
      .fill('#FFFFFF')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ECOTECH', 50, 20);
    doc
      .fontSize(18)
      .text(point.title, 50, 40, { width: doc.page.width - 100 });

    // Subtitle bar (beige)
    doc.rect(0, 80, doc.page.width, 30).fill(COLOR_BEIGE);
    doc
      .fill(COLOR_DARK_GREEN)
      .fontSize(10)
      .font('Helvetica')
      .text(`Tipo: ${point.type}   •   Trilha: ${point.trail.title}`, 50, 90);

    if (point.trail.school?.name) {
      doc.text(`Escola: ${point.trail.school.name}`, doc.page.width - 250, 90, {
        align: 'right',
      });
    }

    let y = 130;

    // Main image (if exists and is local file)
    if (point.mainImage) {
      const localPath = path.resolve(process.cwd(), point.mainImage.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        try {
          doc.image(localPath, 50, y, { width: 200, height: 140 });
          y += 150;
        } catch {
          // silently skip if image can't be read
        }
      }
    }

    const section = (title: string, content: string, currentY: number): number => {
      if (!content) return currentY;

      // Check for page overflow
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      doc
        .fill(COLOR_LIGHT_GREEN)
        .rect(50, currentY, doc.page.width - 100, 20)
        .fill();
      doc
        .fill('#FFFFFF')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(title, 55, currentY + 4);

      currentY += 25;

      doc
        .fill('#333333')
        .fontSize(10)
        .font('Helvetica')
        .text(content, 50, currentY, { width: doc.page.width - 100, align: 'justify' });

      currentY = doc.y + 15;
      return currentY;
    };

    y = section('Descrição Curta', point.shortDescription, y);
    y = section('Descrição Completa', point.fullDescription, y);
    if (point.curiosities) {
      y = section('Curiosidades', point.curiosities, y);
    }
    y = section('Importância Ambiental', point.environmentalImportance, y);
    y = section('Cuidados e Preservação', point.preservationCare, y);

    // Footer
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY - 10, doc.page.width, 60).fill(COLOR_DARK_GREEN);
    doc
      .fill(COLOR_BEIGE)
      .fontSize(8)
      .font('Helvetica')
      .text(
        `EcoTech — Educação Ambiental  |  Gerado automaticamente`,
        50,
        footerY,
        { align: 'center', width: doc.page.width - 100 },
      );

    doc.end();

    stream.on('finish', () => resolve(`/uploads/pdfs/${filename}`));
    stream.on('error', reject);
  });
}

@Injectable()
export class EducationalPointsService {
  constructor(private prisma: PrismaService) {}

  async findBySlug(slug: string) {
    const point = await this.prisma.educationalPoint.findFirst({
      where: { slug, status: true, trail: { status: true } },
      include: {
        trail: {
          select: {
            title: true,
            slug: true,
            wikilocUrl: true,
            school: { select: { name: true } },
          },
        },
        qrCodes: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!point) {
      throw new NotFoundException('Ponto educativo não encontrado.');
    }

    return point;
  }

  async findByTrail(trailId: string, includeUnpublished = false) {
    return this.prisma.educationalPoint.findMany({
      where: {
        trailId,
        ...(includeUnpublished ? {} : { status: true }),
      },
      orderBy: { order: 'asc' },
      include: {
        qrCodes: { orderBy: { createdAt: 'desc' }, take: 1, select: { qrImage: true } },
      },
    });
  }

  async create(
    dto: CreateEducationalPointDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    // Validate trail access
    const trail = await this.prisma.trail.findUnique({
      where: { id: dto.trailId },
      select: { id: true, title: true, slug: true, schoolId: true, school: { select: { name: true } } },
    });

    if (!trail) throw new NotFoundException('Trilha não encontrada.');

    if (requestingUser.role === 'SCHOOL_MANAGER' && trail.schoolId !== requestingUser.schoolId) {
      throw new ForbiddenException('Você não tem permissão para adicionar pontos a esta trilha.');
    }

    // Generate unique slug
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let attempt = 0;
    while (await this.prisma.educationalPoint.findFirst({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Create the point first
    const point = await this.prisma.educationalPoint.create({
      data: {
        trailId: dto.trailId,
        title: dto.title,
        slug,
        type: dto.type as any,
        order: dto.order,
        shortDescription: dto.shortDescription ?? '',
        fullDescription: dto.fullDescription ?? '',
        curiosities: dto.curiosities,
        environmentalImportance: dto.environmentalImportance ?? '',
        preservationCare: dto.preservationCare ?? '',
        mainImage: dto.mainImage ?? '',
        offlineSummary: dto.offlineSummary ?? '',
        status: dto.status ?? false,
      },
    });

    // Generate QR Code and PDF in background (fire and forget – don't block response)
    this.generateAssetsForPoint(point, trail).catch((err) =>
      console.error(`[EducationalPoints] Asset generation failed for ${point.id}:`, err),
    );

    return point;
  }

  async update(
    id: string,
    dto: UpdateEducationalPointDto,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const point = await this.prisma.educationalPoint.findUnique({
      where: { id },
      include: { trail: { select: { schoolId: true, title: true, slug: true, school: { select: { name: true } } } } },
    });

    if (!point) throw new NotFoundException('Ponto educativo não encontrado.');

    if (
      requestingUser.role === 'SCHOOL_MANAGER' &&
      point.trail.schoolId !== requestingUser.schoolId
    ) {
      throw new ForbiddenException('Você não tem permissão para editar este ponto.');
    }

    const updated = await this.prisma.educationalPoint.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.type && { type: dto.type as any }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.fullDescription !== undefined && { fullDescription: dto.fullDescription }),
        ...(dto.curiosities !== undefined && { curiosities: dto.curiosities }),
        ...(dto.environmentalImportance !== undefined && {
          environmentalImportance: dto.environmentalImportance,
        }),
        ...(dto.preservationCare !== undefined && { preservationCare: dto.preservationCare }),
        ...(dto.mainImage !== undefined && { mainImage: dto.mainImage }),
        ...(dto.offlineSummary !== undefined && { offlineSummary: dto.offlineSummary }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { trail: { select: { title: true, slug: true, school: { select: { name: true } } } } },
    });

    // Re-generate QR Code and PDF whenever point is updated
    this.generateAssetsForPoint(updated, updated.trail).catch((err) =>
      console.error(`[EducationalPoints] Asset generation failed for ${updated.id}:`, err),
    );

    return updated;
  }

  private async generateAssetsForPoint(
    point: {
      id: string;
      title: string;
      slug: string;
      type: string;
      shortDescription: string;
      fullDescription: string;
      curiosities?: string | null;
      environmentalImportance: string;
      preservationCare: string;
      mainImage?: string;
      offlineSummary: string;
    },
    trail: { title: string; slug?: string; school?: { name: string } | null },
  ) {
    const pointForGen = { ...point, trail };

    // Generate QR Code
    const { textContent, imagePath } = await generateQrCode(pointForGen);

    // Upsert QR Code record
    await this.prisma.qrCode.deleteMany({ where: { educationalPointId: point.id } });
    await this.prisma.qrCode.create({
      data: {
        educationalPointId: point.id,
        qrTextContent: textContent,
        qrImage: imagePath,
      },
    });

    // Generate PDF
    const pdfUrl = await generatePdf(pointForGen);

    // Save pdfUrl back to point
    await this.prisma.educationalPoint.update({
      where: { id: point.id },
      data: { pdfUrl },
    });
  }

  async remove(
    id: string,
    requestingUser: { id: string; role: string; schoolId?: string },
  ) {
    const point = await this.prisma.educationalPoint.findUnique({
      where: { id },
      include: { trail: { select: { schoolId: true } } },
    });

    if (!point) throw new NotFoundException('Ponto educativo não encontrado.');

    if (
      requestingUser.role === 'SCHOOL_MANAGER' &&
      point.trail.schoolId !== requestingUser.schoolId
    ) {
      throw new ForbiddenException('Você não tem permissão para excluir este ponto.');
    }

    // Clean up files
    if (point.pdfUrl) {
      const pdfPath = path.resolve(process.cwd(), point.pdfUrl.replace(/^\//, ''));
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }

    return this.prisma.educationalPoint.delete({ where: { id } });
  }
}
