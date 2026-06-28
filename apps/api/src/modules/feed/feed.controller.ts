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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FeedService } from './feed.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { IsString, IsNotEmpty } from 'class-validator';

class AddCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'O comentário não pode estar vazio.' })
  comment: string;
}

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `feed-${uniqueSuffix}${ext}`);
  },
});

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /** GET /feed — Public paginated feed (newest first) */
  @Get()
  findAll(
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
    @Query('userId') userId?: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.feedService.findAll(
      take ? parseInt(take, 10) : 10,
      cursor || undefined,
      userId,
      currentUserId,
    );
  }

  /** GET /feed/:id — Public post detail with comments */
  @Get(':id')
  findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.feedService.findOne(id, userId);
  }

  /** POST /feed — Create a new post (authenticated) */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('images', 5, { storage }))
  async create(
    @Request() req: any,
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const imagesUrls = files?.map((f) => `/uploads/${f.filename}`) || [];
    return this.feedService.createPost(req.user.id, createPostDto, imagesUrls);
  }

  /** PATCH /feed/:id — Update a post (author or ADMIN) */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 5, { storage }))
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const imagesUrls = files?.length ? files.map((f) => `/uploads/${f.filename}`) : undefined;
    return this.feedService.updatePost(id, req.user.id, req.user.role, updatePostDto, imagesUrls);
  }

  /** DELETE /feed/:id — Delete a post (author or ADMIN) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.feedService.deletePost(id, req.user.id, req.user.role);
  }

  /** POST /feed/:id/like — Toggle like (authenticated) */
  @UseGuards(JwtAuthGuard)
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

  /** POST /feed/:id/comments — Add a comment (authenticated) */
  @UseGuards(JwtAuthGuard)
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

  /** POST /feed/comments/:id/like — Toggle like on comment (authenticated) */
  @UseGuards(JwtAuthGuard)
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
