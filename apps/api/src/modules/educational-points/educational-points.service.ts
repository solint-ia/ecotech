import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PdfSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEducationalPointDto, PdfModeEnum } from './dto/create-educational-point.dto';
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

import { SupabaseService } from '../supabase/supabase.service';

function getPdfStoragePath(slug: string): string {
  return `pdfs/ponto-${slug}.pdf`;
}

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
  const baseUrl = 'https://www.projetoecotech.online';
  return [
    `Acesse a versão interativa:`,
    `${baseUrl}/pontos/${point.slug}`,
    '',
    '--- MODO OFFLINE ---',
    `Ponto: ${removeAccents(point.title)}`,
    `Trilha: ${removeAccents(point.trail.title)}`,
    '',
    'Resumo:',
    removeAccents(point.offlineSummary || '—'),
    '',
    'Importância ambiental:',
    removeAccents(point.environmentalImportance || '—').substring(0, 200),
  ].join('\n');
}

function removeAccents(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
): Promise<{ textContent: string; buffer: Buffer }> {
  const textContent = buildQrText(point);

  const buffer = await QRCode.toBuffer(textContent, {
    errorCorrectionLevel: 'M',
    width: 400,
    margin: 2,
    color: { dark: COLOR_DARK_GREEN, light: '#FFFFFF' },
  });

  return { textContent, buffer };
}

function cleanPdfText(text: string | null | undefined): string {
  if (!text) return '';
  // Remove \r to prevent rendering issues, remove Ð (\xD0) which may appear as an artifact
  let t = text.replace(/\r/g, '').replace(/Ð/g, '');
  // Remove emojis and non-latin symbols, keeping basic latin + latin-1 supplement + a few standard punctuations
  return t.replace(/[^\x00-\xFF\u0152\u0153\u0178\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u20AC]/g, '').trim();
}

async function generatePdf(point: {
  title: string;
  type: string;
  order: number;
  shortDescription: string;
  fullDescription: string;
  curiosities?: string | null;
  environmentalImportance: string;
  preservationCare: string;
  mainImage?: string;
  slug: string;
  trail: { title: string; school?: { name: string } | null };
}): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: { Title: point.title, Author: 'EcoTech' },
      bufferPages: true
    });

    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const COLOR_DEEP_FOREST = '#0B5D3B';
    const COLOR_CREME = '#FAFCFA';
    const COLOR_TEXT = '#2d3748';

    // Handle new pages to keep background
    doc.on('pageAdded', () => {
      doc.rect(0, 0, pageWidth, pageHeight).fill(COLOR_CREME);
      doc.fill(COLOR_TEXT);
    });

    // Background first page
    doc.rect(0, 0, pageWidth, pageHeight).fill(COLOR_CREME);

    const texturePath = path.resolve(process.cwd(), '../../apps/web/public/fundo-logo-pdf.jpg');
    let hasTexture = false;
    if (fs.existsSync(texturePath)) {
      hasTexture = true;
    }

    // --- Header Section ---
    // Calculate Title Height to make header dynamic
    const safeTitle = cleanPdfText(point.title).toUpperCase();
    doc.fontSize(26).font('Helvetica-Bold');
    const titleHeight = doc.heightOfString(safeTitle, { width: pageWidth - 220 });
    const headerHeight = Math.max(120, 35 + titleHeight + 45);

    // Full width green header
    doc.rect(0, 0, pageWidth, headerHeight).fill(COLOR_DEEP_FOREST);

    const logoPath = path.resolve(process.cwd(), '../../apps/web/public/logo-header.png');
    let hasLogo = false;
    if (fs.existsSync(logoPath)) {
      hasLogo = true;
    }

    // Logo on the left
    if (hasLogo) {
      try {
        const logoWidth = 70;
        doc.image(logoPath, 40, 25, { width: logoWidth });
      } catch (e) {
        console.error('Error loading logo', e);
      }
    }

    // Title
    doc.fill('#FFFFFF').fontSize(26).font('Helvetica-Bold').text(safeTitle, 110, 35, { align: 'center', width: pageWidth - 220 });

    // Subtitle
    doc.fill('#EAF4EE').fontSize(13).font('Helvetica-Oblique').text(`Natureza e Educação Ambiental`, 110, doc.y + 5, { align: 'center', width: pageWidth - 220 });

    // --- Metadata Row (Chips) ---
    let chipY = headerHeight + 25;
    doc.font('Helvetica-Bold').fontSize(10);

    const safeType = cleanPdfText(point.type);
    const safeTrail = cleanPdfText(point.trail.title);

    const chips = [
      `Tipo: ${safeType}`,
      `Trilha: ${safeTrail}`,
      `Ordem: ${point.order}`
    ];

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
      try {
        let imageBuffer: Buffer | null = null;
        if (point.mainImage.startsWith('http')) {
          const response = await fetch(point.mainImage);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
          }
        } else {
          const localImgPath = path.resolve(process.cwd(), point.mainImage.replace(/^\//, ''));
          if (fs.existsSync(localImgPath)) {
            imageBuffer = fs.readFileSync(localImgPath);
          }
        }

        if (imageBuffer) {
          const imgWidth = 400;
          const imgHeight = 250;
          doc.save();
          const imgX = (pageWidth - imgWidth) / 2;
          doc.image(imageBuffer, imgX, contentY, { width: imgWidth, height: imgHeight, fit: [imgWidth, imgHeight], align: 'center', valign: 'center' });
          doc.restore();
          contentY += imgHeight + 40;
        } else {
          contentY += 20;
        }
      } catch (e) {
        console.error('Error rendering image in PDF', e);
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

    // --- Space Before Content ---
    contentY += 15;

    // --- Structured Content (Single Column - Fluid Flow) ---
    const contentWidth = pageWidth - 100;

    const sections = [
      { title: 'Descrição Completa', content: point.fullDescription || point.shortDescription },
      { title: 'Importância Ambiental', content: point.environmentalImportance },
      { title: 'Curiosidades', content: point.curiosities },
      { title: 'Cuidados e Preservação', content: point.preservationCare }
    ].filter(s => !!s.content);

    sections.forEach((sec, idx) => {
      const isFirst = idx === 0;
      const safeTitle = cleanPdfText(sec.title);
      const safeContent = cleanPdfText(sec.content);

      if (isFirst) {
        doc.fill(COLOR_DEEP_FOREST).fontSize(14).font('Helvetica-Bold')
          .text(safeTitle, 50, contentY, { width: contentWidth, align: 'left' });
        doc.moveDown(0.5);
        doc.fill(COLOR_TEXT).fontSize(10).font('Helvetica')
          .text(safeContent, { width: contentWidth, align: 'justify' });
      } else {
        doc.moveDown(1.5);
        doc.fill(COLOR_DEEP_FOREST).fontSize(14).font('Helvetica-Bold')
          .text(safeTitle, { width: contentWidth, align: 'left' });
        doc.moveDown(0.5);
        doc.fill(COLOR_TEXT).fontSize(10).font('Helvetica')
          .text(safeContent, { width: contentWidth, align: 'justify' });
      }
    });

    // --- Footer Bar Text (Buffered Pages) ---
    // Now loop over all pages and draw the footer background and text
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      const originalBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc.rect(0, pageHeight - 40, pageWidth, 40).fill(COLOR_DEEP_FOREST);
      doc.fill('#EAF4EE').fontSize(9).font('Helvetica').text(
        'Educação Ambiental, Trilhas Educativas e Conexão com a Natureza. © 2026 Ecotech.',
        0, pageHeight - 25, { align: 'center', width: pageWidth, lineBreak: false }
      );

      doc.page.margins.bottom = originalBottom;
    }

    doc.flushPages();

    doc.end();
  });
}

@Injectable()
export class EducationalPointsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('pdf-queue') private pdfQueue: Queue,
    private supabaseService: SupabaseService,
  ) { }

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
    educationalFile?: Express.Multer.File,
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

    // Validate if the sequence order is already taken in this trail
    const existingPointWithOrder = await this.prisma.educationalPoint.findFirst({
      where: { trailId: dto.trailId, order: dto.order },
    });
    if (existingPointWithOrder) {
      throw new BadRequestException('Já existe um ponto cadastrado nesta posição. Por favor, escolha outra ordem.');
    }

    if (dto.pdfMode === PdfModeEnum.UPLOAD && !educationalFile) {
      throw new BadRequestException('Selecione um arquivo PDF para upload.');
    }

    // Generate unique slug
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let attempt = 0;
    while (await this.prisma.educationalPoint.findFirst({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Upload the custom PDF (if any) to its deterministic, per-point path before
    // touching the database — if this fails, nothing is created.
    let pdfUrl: string | undefined;
    if (dto.pdfMode === PdfModeEnum.UPLOAD && educationalFile) {
      pdfUrl = await this.supabaseService.uploadFileAt(educationalFile, getPdfStoragePath(slug));
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
        pdfSource: dto.pdfMode,
        ...(pdfUrl && { pdfUrl }),
      },
    });

    // Generate QR Code and PDF in background via BullMQ (Worker Isolado).
    // Skip PDF generation entirely when a custom file was uploaded.
    await this.pdfQueue.add('generate-pdf', {
      pointId: point.id,
      trailId: trail.id,
      skipPdfGeneration: dto.pdfMode === PdfModeEnum.UPLOAD,
    });

    return point;
  }

  async update(
    id: string,
    dto: UpdateEducationalPointDto,
    requestingUser: { id: string; role: string; schoolId?: string },
    educationalFile?: Express.Multer.File,
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

    // Validate if the new sequence order is already taken in this trail
    if (dto.order !== undefined && dto.order !== point.order) {
      const existingPointWithOrder = await this.prisma.educationalPoint.findFirst({
        where: { trailId: point.trailId, order: dto.order },
      });
      if (existingPointWithOrder) {
        throw new BadRequestException('Já existe um ponto cadastrado nesta posição. Por favor, escolha outra ordem.');
      }
    }

    // Clean up old mainImage if a new one is provided (unaffected by the PDF safe-swap below)
    if (dto.mainImage && point.mainImage && dto.mainImage !== point.mainImage) {
      if (point.mainImage.includes('supabase')) {
        await this.supabaseService.deleteFile(point.mainImage);
      }
    }

    // Resolve the requested PDF mode and, for UPLOAD, the new file's URL — BEFORE
    // writing to the database. If this throws (missing file, upload failure), the
    // request aborts here and the point (and its existing PDF) is left untouched.
    let pdfUrl: string | undefined;
    let pdfSource: PdfSource | undefined;

    if (dto.pdfMode === PdfModeEnum.UPLOAD) {
      if (educationalFile) {
        pdfUrl = await this.supabaseService.uploadFileAt(educationalFile, getPdfStoragePath(point.slug));
      } else if (point.pdfSource === PdfSource.UPLOAD && point.pdfUrl) {
        pdfUrl = point.pdfUrl; // keeping the already-uploaded file as-is
      } else {
        throw new BadRequestException('Selecione um arquivo PDF para upload.');
      }
      pdfSource = PdfSource.UPLOAD;
    } else if (dto.pdfMode === PdfModeEnum.AUTO) {
      pdfSource = PdfSource.AUTO;
      // pdfUrl is left untouched here; the async queue job regenerates and swaps it
      // in (see generateAssetsForPoint), using the same safe generate-then-replace order.
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
        ...(pdfUrl !== undefined && { pdfUrl }),
        ...(pdfSource !== undefined && { pdfSource }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { trail: { select: { id: true, title: true, slug: true, school: { select: { name: true } } } } },
    });

    // Only now that the new file (if any) is confirmed uploaded AND persisted do we
    // remove a stale old PDF living at a different path (e.g. a legacy custom-pdfs/
    // upload, or a leftover from a mode switch). A delete failure here is logged but
    // does not fail the request — the point already has a valid, working PDF.
    if (point.pdfUrl && updated.pdfUrl && point.pdfUrl !== updated.pdfUrl) {
      try {
        await this.supabaseService.deleteFile(point.pdfUrl);
      } catch (e) {
        console.error(`Failed to delete stale PDF for point ${point.id}:`, e);
      }
    }

    // Re-generate QR Code and PDF whenever point is updated via Queue
    await this.pdfQueue.add('generate-pdf', {
      pointId: updated.id,
      trailId: updated.trail.id,
      skipPdfGeneration: updated.pdfSource === PdfSource.UPLOAD,
    });

    return updated;
  }

  public async generateAssetsForPoint(
    point: {
      id: string;
      title: string;
      slug: string;
      type: string;
      order: number;
      shortDescription: string;
      fullDescription: string;
      curiosities?: string | null;
      environmentalImportance: string;
      preservationCare: string;
      mainImage?: string;
      offlineSummary: string;
      pdfUrl?: string | null;
    },
    trail: { title: string; slug?: string; school?: { name: string } | null },
    skipPdfGeneration?: boolean,
  ) {
    const pointForGen = { ...point, trail };

    // Generate QR Code
    const { textContent, buffer: qrBuffer } = await generateQrCode(pointForGen);

    // Upload QR Code to Supabase
    const qrFilename = `qr-${point.slug}.png`;
    const qrUrl = await this.supabaseService.uploadBuffer(qrBuffer, 'image/png', qrFilename, 'qrcodes');

    // Clean up old QR Code files from storage
    const oldQrCodes = await this.prisma.qrCode.findMany({ where: { educationalPointId: point.id } });
    for (const oldQr of oldQrCodes) {
      if (oldQr.qrImage?.includes('supabase')) {
        await this.supabaseService.deleteFile(oldQr.qrImage).catch(e => console.error(e));
      }
    }

    // Upsert QR Code record
    await this.prisma.qrCode.deleteMany({ where: { educationalPointId: point.id } });
    await this.prisma.qrCode.create({
      data: {
        educationalPointId: point.id,
        qrTextContent: textContent,
        qrImage: qrUrl,
      },
    });

    // Generate PDF ONLY IF skipPdfGeneration is not true.
    // Safe order: generate -> upload the new file -> persist it -> only THEN remove
    // a stale old one. If generation or upload fails, the old PDF (and the DB row)
    // are left completely untouched, so the point is never left without a PDF.
    if (!skipPdfGeneration) {
      const pdfBuffer = await generatePdf(pointForGen);

      const pdfUrl = await this.supabaseService.uploadBufferAt(
        pdfBuffer,
        'application/pdf',
        getPdfStoragePath(point.slug),
      );

      const oldPdfUrl = point.pdfUrl;

      await this.prisma.educationalPoint.update({
        where: { id: point.id },
        data: { pdfUrl, pdfSource: PdfSource.AUTO },
      });

      // Clean up a stale old PDF only if it lived at a different path (e.g. a
      // leftover custom upload, or pre-refactor filename) — same slug/path means
      // uploadBufferAt already overwrote it in place (upsert).
      if (oldPdfUrl && oldPdfUrl !== pdfUrl) {
        try {
          await this.supabaseService.deleteFile(oldPdfUrl);
        } catch (e) {
          console.error(`Failed to delete stale PDF for point ${point.id}:`, e);
        }
      }
    }
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

    // Clean up files in Supabase if needed (optional)
    if (point.pdfUrl && point.pdfUrl.includes('supabase')) {
      await this.supabaseService.deleteFile(point.pdfUrl);
    }

    return this.prisma.educationalPoint.delete({ where: { id } });
  }
}
