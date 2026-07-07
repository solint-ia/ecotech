import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FeedService } from './feed.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApprovedContributorGuard } from '../../common/guards/approved-contributor.guard';
import { IsString, IsNotEmpty } from 'class-validator';
import { SupabaseService } from '../supabase/supabase.service';
import { assertValidMediaFiles, processImageBuffer, mediaMulterOptions } from '../../common/media/media.util';

class AddCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'O comentário não pode estar vazio.' })
  comment: string;
}

@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /** GET /feed — Public paginated feed (newest first) */
  @Get()
  findAll(
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
    @Query('userId') userId?: string,
    @Query('currentUserId') currentUserId?: string,
    @Query('trailId') trailId?: string,
  ) {
    return this.feedService.findAll(
      take ? parseInt(take, 10) : 10,
      cursor || undefined,
      userId,
      currentUserId,
      trailId,
    );
  }

  /** GET /feed/:id — Public post detail with comments */
  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.feedService.findOne(id, userId);
  }

  /** POST /feed — Create a new post (approved members only) */
  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('images', 5, mediaMulterOptions))
  async create(
    @Request() req: any,
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files?.length) assertValidMediaFiles(files);
    const imagesUrls = files?.length
      ? await Promise.all(files.map(async f => {
          const processed = await processImageBuffer(f);
          return this.supabaseService.uploadBuffer(processed.buffer, processed.mimetype, processed.originalname, 'feed');
        }))
      : [];
    const mediaType = files?.some(f => f.mimetype.startsWith('video/')) ? 'VIDEO' : 'IMAGE';
    return this.feedService.createPost(req.user, createPostDto, imagesUrls, mediaType);
  }

  /** PATCH /feed/:id — Update a post (author or ADMIN) */
  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 5, mediaMulterOptions))
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files?.length) assertValidMediaFiles(files);
    const imagesUrls = files?.length
      ? await Promise.all(files.map(async f => {
          const processed = await processImageBuffer(f);
          return this.supabaseService.uploadBuffer(processed.buffer, processed.mimetype, processed.originalname, 'feed');
        }))
      : undefined;
    const mediaType = files?.length ? (files.some(f => f.mimetype.startsWith('video/')) ? 'VIDEO' : 'IMAGE') : undefined;
    return this.feedService.updatePost(id, req.user.id, req.user.role, updatePostDto, imagesUrls, mediaType);
  }

  /** DELETE /feed/:id — Delete a post (author or ADMIN) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.feedService.deletePost(id, req.user.id, req.user.role);
  }

  /** POST /feed/:id/like — Toggle like (approved members only) */
  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req: any) {
    return this.feedService.toggleLike(id, req.user.id);
  }

  /** GET /feed/:id/liked — Check if current user liked this post */
  @UseGuards(JwtAuthGuard)
  @Get(':id/liked')
  hasLiked(@Param('id') id: string, @Request() req: any) {
    return this.feedService.hasLiked(id, req.user.id);
  }

  /** POST /feed/:id/comments — Add a comment (approved members only) */
  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  addComment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: AddCommentDto,
  ) {
    return this.feedService.addComment(id, req.user.id, body.comment);
  }

  /** DELETE /feed/comments/:commentId — Delete a comment (author or ADMIN) */
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeComment(
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    return this.feedService.deleteComment(
      commentId,
      req.user.id,
      req.user.role,
    );
  }

  /** POST /feed/comments/:id/like — Toggle like on comment (approved members only) */
  @UseGuards(JwtAuthGuard, ApprovedContributorGuard)
  @Post('comments/:id/like')
  toggleCommentLike(@Param('id') id: string, @Request() req: any) {
    return this.feedService.toggleCommentLike(id, req.user.id);
  }

  /** POST /feed/:id/share — Increment share counter (public) */
  @Post(':id/share')
  sharePost(@Param('id') id: string) {
    return this.feedService.incrementShares(id);
  }
}
