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
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: point.title, Author: 'EcoTech' } });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const COLOR_DEEP_FOREST = '#0B5D3B';
    const COLOR_CREME = '#FAFCFA';
    const COLOR_TEXT = '#2d3748';
    
    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill(COLOR_CREME);

    const texturePath = path.resolve(process.cwd(), '../../apps/web/public/fundo-logo-pdf.jpg');
    let hasTexture = false;
    if (fs.existsSync(texturePath)) {
      hasTexture = true;
    }

    // --- Header Section ---
    const logoPath = path.resolve(process.cwd(), '../../apps/web/public/EcoTechLogo.png');
    let hasLogo = false;
    if (fs.existsSync(logoPath)) {
      hasLogo = true;
    }

    const headerY = hasLogo ? 110 : 30;

    // Top Background Texture
    if (hasTexture) {
      try {
        doc.save();
        doc.rect(0, 0, pageWidth, headerY).clip();
        doc.image(texturePath, 0, 0, { width: pageWidth, height: headerY, cover: [pageWidth, headerY] });
        doc.restore();
      } catch (e) {
        console.error('Error drawing top texture', e);
      }
    }

    // Logo
    if (hasLogo) {
      try {
        doc.image(logoPath, (pageWidth - 80) / 2, 20, { width: 80 });
      } catch (e) {
        console.error('Error loading logo', e);
      }
    }

    doc.rect(0, headerY, pageWidth, 90).fill(COLOR_DEEP_FOREST);

    // Title
    doc.fill('#FFFFFF').fontSize(24).font('Helvetica-Bold').text(point.title.toUpperCase(), 0, headerY + 25, { align: 'center', width: pageWidth });
    
    // Subtitle (Using type or short desc as subtitle)
    doc.fill('#EAF4EE').fontSize(12).font('Helvetica-Oblique').text(`Natureza e Educação Ambiental`, 0, headerY + 55, { align: 'center', width: pageWidth });

    // --- Metadata Row (Chips) ---
    let chipY = headerY + 110;
    doc.font('Helvetica-Bold').fontSize(10);
    
    const chips = [
      `Tipo: ${point.type}`,
      `Trilha: ${point.trail.title}`,
    ];
    if (point.trail.school?.name) {
      chips.push(`Escola: ${point.trail.school.name}`);
    }

    // Calculate total width of chips to center them
    const chipPadding = 20;
    const chipSpacing = 15;
    const chipWidths = chips.map(c => doc.widthOfString(c) + chipPadding * 2);
    const totalChipsWidth = chipWidths.reduce((a, b) => a + b, 0) + (chips.length - 1) * chipSpacing;
    let currentX = (pageWidth - totalChipsWidth) / 2;

    chips.forEach((chipText, i) => {
      const w = chipWidths[i];
      doc.roundedRect(currentX, chipY, w, 24, 12)
         .lineWidth(1)
         .strokeColor(COLOR_DEEP_FOREST)
         .stroke();
      
      doc.fill(COLOR_DEEP_FOREST).text(chipText, currentX, chipY + 7, { width: w, align: 'center' });
      currentX += w + chipSpacing;
    });

    let contentY = chipY + 50;

    // --- Main Image ---
    if (point.mainImage) {
      const localImgPath = path.resolve(process.cwd(), point.mainImage.replace(/^\//, ''));
      if (fs.existsSync(localImgPath)) {
        try {
          const imgWidth = pageWidth - 100;
          const imgHeight = 220;
          
          doc.save();
          // Shadow effect
          doc.roundedRect(50 + 2, contentY + 2, imgWidth, imgHeight, 15).fillOpacity(0.1).fill('#000000');
          doc.restore();
          
          doc.save();
          doc.roundedRect(50, contentY, imgWidth, imgHeight, 15).clip();
          doc.image(localImgPath, 50, contentY, { width: imgWidth, height: imgHeight, fit: [imgWidth, imgHeight], align: 'center', valign: 'center' });
          doc.restore();
          
          // Draw a border just in case
          doc.roundedRect(50, contentY, imgWidth, imgHeight, 15).lineWidth(1).strokeColor('#E2E8F0').stroke();
          
          contentY += imgHeight + 40;
        } catch (e) {
          console.error('Error rendering image in PDF', e);
          contentY += 20;
        }
      } else {
        contentY += 20;
      }
    } else {
      contentY += 20;
    }

    // Bottom Background Texture (Informative Text Section)
    if (hasTexture) {
      try {
        doc.save();
        const bottomHeight = pageHeight - contentY - 40; // up to footer
        if (bottomHeight > 0) {
          doc.rect(0, contentY - 10, pageWidth, bottomHeight + 10).clip();
          doc.opacity(0.15); // Subtle texture opacity
          doc.image(texturePath, 0, contentY - 10, { width: pageWidth, height: bottomHeight + 10, cover: [pageWidth, bottomHeight + 10] });
        }
        doc.restore();
      } catch (e) {
        console.error('Error drawing bottom texture', e);
      }
    }

    // --- Structured Content (Two Columns) ---
    const colWidth = (pageWidth - 140) / 2;
    const leftColX = 50;
    const rightColX = leftColX + colWidth + 40;

    let leftY = contentY;
    let rightY = contentY;

    // Helper to draw a section
    const drawSection = (title: string, content: string, x: number, y: number) => {
      if (!content) return y;
      
      // Page break logic (simplified)
      if (y > pageHeight - 120) {
        doc.addPage();
        doc.rect(0, 0, pageWidth, pageHeight).fill(COLOR_CREME);
        leftY = 50; rightY = 50;
        y = 50;
      }

      // Try drawing the title with emojis, fallback if PDFKit complains
      let safeTitle = title;
      try {
        doc.fill(COLOR_DEEP_FOREST).fontSize(14).font('Helvetica-Bold').text(title, x, y);
      } catch (e) {
        safeTitle = title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        doc.fill(COLOR_DEEP_FOREST).fontSize(14).font('Helvetica-Bold').text(safeTitle, x, y);
      }

      const titleHeight = doc.heightOfString(safeTitle, { width: colWidth });
      
      // Horizontal separator line (green)
      doc.moveTo(x, y + titleHeight + 5).lineTo(x + colWidth, y + titleHeight + 5).lineWidth(1).strokeColor(COLOR_DEEP_FOREST).stroke();

      // Content
      doc.fill(COLOR_TEXT).fontSize(10).font('Helvetica').text(content, x, y + titleHeight + 15, { width: colWidth, align: 'justify', lineGap: 3 });
      
      const contentHeight = doc.heightOfString(content, { width: colWidth, lineGap: 3 });
      return y + titleHeight + 15 + contentHeight + 30; // Return new Y
    };

    // Left Column
    leftY = drawSection('📖 Descrição Completa', point.fullDescription || point.shortDescription, leftColX, leftY);
    leftY = drawSection('🌳 Importância Ambiental', point.environmentalImportance, leftColX, leftY);

    // Right Column
    if (point.curiosities) {
      rightY = drawSection('❓ Curiosidades', point.curiosities, rightColX, rightY);
    }
    rightY = drawSection('🌿 Cuidados e Preservação', point.preservationCare, rightColX, rightY);

    // --- Footer Bar ---
    // Draw footer on all pages? Just on the last page for simplicity
    doc.rect(0, pageHeight - 40, pageWidth, 40).fill(COLOR_DEEP_FOREST);
    doc.fill('#EAF4EE').fontSize(9).font('Helvetica').text(
      'Educação Ambiental, Trilhas Educativas e Conexão com a Natureza. © 2026 Ecotech.',
      0, pageHeight - 25, { align: 'center', width: pageWidth }
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
