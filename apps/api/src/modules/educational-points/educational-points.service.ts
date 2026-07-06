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
    // Higher resolution + a wider quiet zone (margin) and pure black on white
    // give the best contrast/sharpness, which iPhone cameras need to read the
    // (fairly dense) offline payload reliably.
    width: 600,
    margin: 4,
    color: { dark: '#000000', light: '#FFFFFF' },
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

// ---------------------------------------------------------------------------
// PDF layout palette — mirrors the "Ponto Educativo" tailwind design tokens.
// ---------------------------------------------------------------------------
const PDF_FLORESTA = '#123a29'; // header / footer / green cards
const PDF_ECO = '#1f6b47'; // number badge text on white cards
const PDF_SALVIA = '#f4f6f1'; // page background
const PDF_FOLHA = '#eef3ea'; // number badge background on white cards
const PDF_BORDA = '#eaeee5'; // card / divider borders
const PDF_TERRA = '#d99b78'; // accent (type badge, card 03)
const PDF_TEXTO = '#4a5249'; // body text on white cards
const PDF_MUDO = '#a3ab99'; // muted metadata labels
const PDF_CREME = '#eef1e9'; // light text on green surfaces
const PDF_MINT = '#a9d6bd'; // number badge text on green card 02

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

async function loadImageBuffer(source: string): Promise<Buffer | null> {
  try {
    if (source.startsWith('http')) {
      const response = await fetch(source);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    const localImgPath = path.resolve(process.cwd(), source.replace(/^\//, ''));
    if (fs.existsSync(localImgPath)) return fs.readFileSync(localImgPath);
  } catch (e) {
    console.error('Error loading image for PDF', e);
  }
  return null;
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
      margin: 0,
      info: { Title: point.title, Author: 'EcoTech' },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    const MX = 40; // horizontal page margin
    const contentW = pageWidth - MX * 2;
    const FOOTER_H = 34;
    const CARD_PAD = 18;
    const CARD_RADIUS = 14;
    const CARD_GAP = 14;

    // Keep the salvia background on every page (including auto-added overflow pages).
    doc.on('pageAdded', () => {
      doc.rect(0, 0, pageWidth, pageHeight).fill(PDF_SALVIA);
    });
    doc.rect(0, 0, pageWidth, pageHeight).fill(PDF_SALVIA);

    // ===================== HEADER (green) =====================
    const safeTitle = cleanPdfText(point.title);
    const safeType = cleanPdfText(point.type);
    const safeTrail = cleanPdfText(point.trail.title);
    const rawSubtitle = cleanPdfText(point.shortDescription);
    const subtitle = rawSubtitle
      ? truncateText(rawSubtitle, 95)
      : `Trilha ${safeTrail}`;

    const HEADER_PAD_TOP = 30;
    const TOPROW_H = 40;
    const GAP_AFTER_TOPROW = 20;
    const HEADER_PAD_BOTTOM = 26;
    const titleW = contentW;

    doc.font('Helvetica-Bold').fontSize(26);
    const titleH = doc.heightOfString(safeTitle, { width: titleW });
    doc.font('Helvetica-Oblique').fontSize(11);
    const subH = doc.heightOfString(subtitle, { width: titleW });

    const headerH =
      HEADER_PAD_TOP + TOPROW_H + GAP_AFTER_TOPROW + titleH + 5 + subH + HEADER_PAD_BOTTOM;

    doc.rect(0, 0, pageWidth, headerH).fill(PDF_FLORESTA);

    // Decorative circles (clipped to header)
    doc.save();
    doc.rect(0, 0, pageWidth, headerH).clip();
    doc.lineWidth(1).strokeOpacity(0.15).strokeColor(PDF_CREME);
    doc.circle(pageWidth - 30, 6, 78).stroke();
    doc.strokeOpacity(0.1);
    doc.circle(pageWidth - 12, 34, 56).stroke();
    doc.strokeOpacity(1);
    doc.restore();

    // Logo (white emblem) top-left. Rendered a bit larger than the top-row
    // height without growing the green header: the header height is driven by
    // TOPROW_H, and the title only starts at HEADER_PAD_TOP + TOPROW_H +
    // GAP_AFTER_TOPROW (=90), so a 52px logo (30→82) still clears the title.
    const LOGO_H = 52;
    const logoPath = path.resolve(process.cwd(), '../../apps/web/public/logo-header.png');
    if (fs.existsSync(logoPath)) {
      try {
        // Keep the logo vertically centered on the original top row so the extra
        // height grows symmetrically instead of only downward.
        const logoY = HEADER_PAD_TOP + (TOPROW_H - LOGO_H) / 2;
        doc.image(logoPath, MX, logoY, { height: LOGO_H });
      } catch (e) {
        console.error('Error loading logo', e);
      }
    }

    // Type badge (terra pill) top-right
    const badgeLabel = safeType.toUpperCase();
    doc.font('Helvetica-Bold').fontSize(8.5);
    const badgeLabelW = doc.widthOfString(badgeLabel);
    const badgeH = 20;
    const badgeW = badgeLabelW + 32;
    const badgeX = pageWidth - MX - badgeW;
    const badgeY = HEADER_PAD_TOP + (TOPROW_H - badgeH) / 2;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2)
      .fillOpacity(0.18)
      .fill(PDF_TERRA);
    doc.fillOpacity(1);
    doc.circle(badgeX + 13, badgeY + badgeH / 2, 2.5).fill(PDF_TERRA);
    doc.fill(PDF_TERRA).font('Helvetica-Bold').fontSize(8.5)
      .text(badgeLabel, badgeX + 21, badgeY + 6, { lineBreak: false });

    // Title + subtitle
    const titleY = HEADER_PAD_TOP + TOPROW_H + GAP_AFTER_TOPROW;
    doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(26)
      .text(safeTitle, MX, titleY, { width: titleW });
    doc.fillOpacity(0.7).fill(PDF_CREME).font('Helvetica-Oblique').fontSize(11)
      .text(subtitle, MX, titleY + titleH + 5, { width: titleW });
    doc.fillOpacity(1);

    // ===================== METADATA ROW (white) =====================
    const metaY = headerH;
    const metaH = 50;
    doc.rect(0, metaY, pageWidth, metaH).fill('#FFFFFF');
    doc.moveTo(0, metaY + metaH).lineTo(pageWidth, metaY + metaH)
      .lineWidth(1).strokeColor(PDF_BORDA).stroke();

    const metaCols = [
      { label: 'TIPO', value: safeType, weight: 1 },
      { label: 'TRILHA', value: safeTrail, weight: 1.8 },
      { label: 'ORDEM', value: String(point.order), weight: 0.9 },
    ];
    const weightTotal = metaCols.reduce((a, c) => a + c.weight, 0);
    let colX = MX;
    metaCols.forEach((col, i) => {
      const colW = (contentW * col.weight) / weightTotal;
      const pad = i === 0 ? 0 : 14;
      doc.fill(PDF_MUDO).font('Courier-Bold').fontSize(8)
        .text(col.label, colX + pad, metaY + 12, { width: colW - pad, lineBreak: false });
      doc.fill(PDF_FLORESTA).font('Helvetica-Bold').fontSize(12)
        .text(truncateText(col.value, 34), colX + pad, metaY + 26, { width: colW - pad, lineBreak: false });
      if (i < metaCols.length - 1) {
        doc.moveTo(colX + colW, metaY + 10).lineTo(colX + colW, metaY + metaH - 10)
          .lineWidth(1).strokeColor(PDF_BORDA).stroke();
      }
      colX += colW;
    });

    // ===================== MAIN IMAGE =====================
    const imgY = metaY + metaH + 20;
    const imgH = 200;
    const imageBuffer = point.mainImage ? await loadImageBuffer(point.mainImage) : null;

    doc.save();
    doc.roundedRect(MX, imgY, contentW, imgH, CARD_RADIUS).clip();
    if (imageBuffer) {
      try {
        doc.image(imageBuffer, MX, imgY, { cover: [contentW, imgH], align: 'center', valign: 'center' });
      } catch (e) {
        console.error('Error rendering image in PDF', e);
      }
    } else {
      // Placeholder: soft fill + diagonal hatch + mono caption
      doc.rect(MX, imgY, contentW, imgH).fill('#dfe4d8');
      doc.lineWidth(1).strokeColor(PDF_FLORESTA).strokeOpacity(0.07);
      for (let i = -imgH; i < contentW; i += 14) {
        doc.moveTo(MX + i, imgY + imgH).lineTo(MX + i + imgH, imgY).stroke();
      }
      doc.strokeOpacity(1);
      doc.fillOpacity(0.55).fill(PDF_ECO).font('Courier').fontSize(8)
        .text(`imagem principal — ${safeTitle}`, MX + 12, imgY + imgH - 18, { lineBreak: false });
      doc.fillOpacity(1);
    }
    doc.restore();

    // ===================== CARDS =====================
    let y = imgY + imgH + 18;
    const bottomLimit = pageHeight - FOOTER_H - 20;

    const ensureSpace = (h: number) => {
      if (y + h > bottomLimit) {
        doc.addPage();
        y = 40;
      }
    };

    // Height of a card given its wrapped body text.
    const cardHeight = (w: number, body: string, variant: 'white' | 'green'): number => {
      const innerW = w - CARD_PAD * 2;
      const bodySize = variant === 'green' ? 9.5 : 10;
      doc.font('Helvetica').fontSize(bodySize);
      const th = doc.heightOfString(body, { width: innerW, lineGap: 2 });
      return CARD_PAD + 22 + 10 + th + CARD_PAD;
    };

    const drawCard = (
      x: number,
      cardY: number,
      w: number,
      h: number,
      num: string,
      title: string,
      body: string,
      variant: 'white' | 'green',
    ) => {
      if (variant === 'green') {
        doc.roundedRect(x, cardY, w, h, CARD_RADIUS).fill(PDF_FLORESTA);
      } else {
        doc.roundedRect(x, cardY, w, h, CARD_RADIUS).fill('#FFFFFF');
        doc.roundedRect(x, cardY, w, h, CARD_RADIUS).lineWidth(1).strokeColor(PDF_BORDA).stroke();
      }

      const ix = x + CARD_PAD;
      const iy = cardY + CARD_PAD;
      const badgeSize = 22;

      // Number badge
      if (variant === 'green') {
        const accent03 = num === '03';
        doc.roundedRect(ix, iy, badgeSize, badgeSize, 6)
          .fillOpacity(accent03 ? 0.18 : 0.1)
          .fill(accent03 ? PDF_TERRA : '#FFFFFF');
        doc.fillOpacity(1);
        doc.fill(accent03 ? PDF_TERRA : PDF_MINT).font('Helvetica-Bold').fontSize(11)
          .text(num, ix, iy + 6, { width: badgeSize, align: 'center' });
        doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(12)
          .text(title, ix + badgeSize + 10, iy + 5, { lineBreak: false });
      } else {
        doc.roundedRect(ix, iy, badgeSize, badgeSize, 6).fill(PDF_FOLHA);
        doc.fill(PDF_ECO).font('Helvetica-Bold').fontSize(11)
          .text(num, ix, iy + 6, { width: badgeSize, align: 'center' });
        doc.fill(PDF_FLORESTA).font('Helvetica-Bold').fontSize(13)
          .text(title, ix + badgeSize + 10, iy + 5, { lineBreak: false });
      }

      // Body
      const bodyY = iy + badgeSize + 10;
      const innerW = w - CARD_PAD * 2;
      const bodySize = variant === 'green' ? 9.5 : 10;
      if (variant === 'green') {
        doc.fillOpacity(0.85).fill('#FFFFFF');
      } else {
        doc.fill(PDF_TEXTO);
      }
      doc.font('Helvetica').fontSize(bodySize)
        .text(body, ix, bodyY, { width: innerW, align: 'left', lineGap: 2 });
      doc.fillOpacity(1);
    };

    // 01 · Descrição (white)
    const descText = cleanPdfText(point.fullDescription || point.shortDescription);
    if (descText) {
      const h = cardHeight(contentW, descText, 'white');
      ensureSpace(h);
      drawCard(MX, y, contentW, h, '01', 'Descrição', descText, 'white');
      y += h + CARD_GAP;
    }

    // 02 + 03 · green cards (side by side when both exist)
    const greens: { num: string; title: string; body: string }[] = [];
    const importText = cleanPdfText(point.environmentalImportance);
    const curioText = cleanPdfText(point.curiosities);
    if (importText) greens.push({ num: '02', title: 'Importância', body: importText });
    if (curioText) greens.push({ num: '03', title: 'Curiosidades', body: curioText });

    if (greens.length === 2) {
      const gw = (contentW - CARD_GAP) / 2;
      const h = Math.max(
        cardHeight(gw, greens[0].body, 'green'),
        cardHeight(gw, greens[1].body, 'green'),
      );
      ensureSpace(h);
      drawCard(MX, y, gw, h, greens[0].num, greens[0].title, greens[0].body, 'green');
      drawCard(MX + gw + CARD_GAP, y, gw, h, greens[1].num, greens[1].title, greens[1].body, 'green');
      y += h + CARD_GAP;
    } else if (greens.length === 1) {
      const g = greens[0];
      const h = cardHeight(contentW, g.body, 'green');
      ensureSpace(h);
      drawCard(MX, y, contentW, h, g.num, g.title, g.body, 'green');
      y += h + CARD_GAP;
    }

    // 04 · Cuidados e Preservação (white)
    const careText = cleanPdfText(point.preservationCare);
    if (careText) {
      const h = cardHeight(contentW, careText, 'white');
      ensureSpace(h);
      drawCard(MX, y, contentW, h, '04', 'Cuidados e Preservação', careText, 'white');
      y += h + CARD_GAP;
    }

    // ===================== FOOTER (green, all pages) =====================
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, pageHeight - FOOTER_H, pageWidth, FOOTER_H).fill(PDF_FLORESTA);
      doc.fillOpacity(0.6).fill(PDF_CREME).font('Courier').fontSize(8);
      doc.text('EDUCACAO AMBIENTAL - TRILHAS EDUCATIVAS', MX, pageHeight - FOOTER_H + 13, { lineBreak: false });
      const rightTxt = '(c) 2026 ECOTECH';
      const rightW = doc.widthOfString(rightTxt);
      doc.text(rightTxt, pageWidth - MX - rightW, pageHeight - FOOTER_H + 13, { lineBreak: false });
      doc.fillOpacity(1);
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
