import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApprovedContributorGuard } from '../../common/guards/approved-contributor.guard';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { assertValidMediaFiles, processImageBuffer, mediaMulterOptions } from '../../common/media/media.util';

@Controller('stories')
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', mediaMulterOptions))
  async create(
    @Request() req: any,
    @Body() createStoryDto: CreateStoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('A imagem ou vídeo do story é obrigatório.');
    }
    assertValidMediaFiles([file]);
    const processed = await processImageBuffer(file);
    const mediaUrl = await this.supabaseService.uploadBuffer(processed.buffer, processed.mimetype, processed.originalname, 'stories');
    const mediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    
    return this.storiesService.createStory(req.user.id, createStoryDto, mediaUrl, mediaType);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findActive() {
    return this.storiesService.findActiveStories();
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: any) {
    await this.storiesService.deleteStory(id, req.user.id, req.user.role);
  }

  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Patch(':id')
  async updateStory(
    @Param('id') id: string,
    @Body() updateDto: { caption?: string; location?: string },
    @Request() req: any,
  ) {
    return this.storiesService.updateStory(id, req.user.id, req.user.role, updateDto.caption, updateDto.location);
  }

  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Request() req: any,
  ) {
    if (!comment) throw new BadRequestException('Comentário vazio.');
    return this.storiesService.addComment(id, req.user.id, comment);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.storiesService.getComments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('id') id: string, @Request() req: any) {
    await this.storiesService.deleteComment(id, req.user.id, req.user.role);
  }
}
