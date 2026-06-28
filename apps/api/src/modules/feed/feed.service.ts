import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new feed post.
   * Any authenticated user can publish.
   */
  async createPost(userId: string, createPostDto: CreatePostDto, imagesUrls: string[] = []) {
    return this.prisma.feedPost.create({
      data: {
        userId,
        title: createPostDto.title,
        description: createPostDto.description,
        schoolId: createPostDto.schoolId || null,
        trailId: createPostDto.trailId || null,
        images: {
          create: imagesUrls.map((url, index) => ({ url, order: index })),
        },
      },
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
        school: { select: { id: true, name: true, coverImage: true } },
        trail: { select: { id: true, title: true, slug: true } },
        images: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * Paginated feed — newest first, cursor-based using `createdAt` for
   * efficient "Ver mais" infinite scroll.
   *
   * @param take  – number of items to return (default 10)
   * @param cursor – ISO date string; returns posts *before* this date
   */
  async findAll(take = 10, cursor?: string, userId?: string, currentUserId?: string) {
    const whereClause: any = { status: true };

    if (userId) {
      whereClause.userId = userId;
    }

    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) };
    }

    const posts = await this.prisma.feedPost.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: take + 1, // fetch one extra to know if there are more
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
        school: { select: { id: true, name: true, coverImage: true } },
        trail: { select: { id: true, title: true, slug: true } },
        images: { orderBy: { order: 'asc' } },
        _count: { select: { likes: true, comments: true } },
        ...(currentUserId ? { likes: { where: { userId: currentUserId }, select: { id: true } } } : {}),
      },
    });

    const hasMore = posts.length > take;
    const items = hasMore ? posts.slice(0, take) : posts;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    // Intercept user data for SCHOOL_MANAGER and set hasLiked
    const mappedItems = items.map((post: any) => {
      if (post.user.role === 'SCHOOL_MANAGER' && post.school) {
        post.user.name = post.school.name;
        post.user.profileImage = (post.school as any).coverImage || post.user.profileImage;
      }
      post.hasLiked = currentUserId ? (post.likes && post.likes.length > 0) : false;
      delete post.likes;
      return post;
    });

    return { items: mappedItems, hasMore, nextCursor };
  }

  /**
   * Get a single post by ID with its comments.
   */
  async findOne(id: string, currentUserId?: string) {
    const post = await this.prisma.feedPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
        school: { select: { id: true, name: true, coverImage: true } },
        trail: { select: { id: true, title: true, slug: true } },
        images: { orderBy: { order: 'asc' } },
        ...(currentUserId ? { likes: { where: { userId: currentUserId }, select: { id: true } } } : {}),
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, profileImage: true } },
            ...(currentUserId ? { likes: { where: { userId: currentUserId }, select: { id: true } } } : {}),
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) {
      throw new NotFoundException('Publicação não encontrada.');
    }

    if (post.user.role === 'SCHOOL_MANAGER' && post.school) {
      post.user.name = post.school.name;
      post.user.profileImage = (post.school as any).coverImage || post.user.profileImage;
    }

    const processedComments = post.comments?.map((comment: any) => {
      comment.hasLiked = currentUserId ? (comment.likes && comment.likes.length > 0) : false;
      delete comment.likes;
      return comment;
    }) || [];

    const hasLiked = currentUserId ? (post.likes && (post.likes as any).length > 0) : false;
    const postToReturn = { ...post, comments: processedComments, hasLiked };
    delete (postToReturn as any).likes;

    return postToReturn;
  }

  /**
   * Update a post — only the author or an ADMIN can update.
   */
  async updatePost(
    postId: string,
    userId: string,
    userRole: string,
    updatePostDto: UpdatePostDto,
    imagesUrls?: string[]
  ) {
    const post = await this.findOne(postId);

    if (post.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para editar esta publicação.');
    }

    const dataPayload: any = { ...updatePostDto };
    
    if (imagesUrls) {
      dataPayload.images = {
        deleteMany: {}, // Exclui todas as imagens antigas
        create: imagesUrls.map((url, index) => ({ url, order: index })),
      };
    }

    return this.prisma.feedPost.update({
      where: { id: postId },
      data: dataPayload,
      include: {
        user: { select: { id: true, name: true, profileImage: true, role: true } },
        school: { select: { id: true, name: true, coverImage: true } },
        trail: { select: { id: true, title: true, slug: true } },
        images: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * Delete a post — only the author or an ADMIN can delete.
   */
  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.findOne(postId);

    if (post.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Você não tem permissão para excluir esta publicação.');
    }

    // Delete related likes and comments first
    await this.prisma.feedComment.deleteMany({ where: { postId } });
    await this.prisma.feedLike.deleteMany({ where: { postId } });
    await this.prisma.feedPost.delete({ where: { id: postId } });

    return { deleted: true };
  }

  /**
   * Toggle like on a post. If already liked, remove; otherwise, create.
   * Also updates the denormalized likesCount.
   */
  async toggleLike(postId: string, userId: string) {
    const existing = await this.prisma.feedLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.feedLike.delete({ where: { id: existing.id } });
      await this.prisma.feedPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false };
    }

    await this.prisma.feedLike.create({ data: { postId, userId } });
    await this.prisma.feedPost.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });
    return { liked: true };
  }

  /**
   * Check if a user has liked a specific post.
   */
  async hasLiked(postId: string, userId: string) {
    const like = await this.prisma.feedLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    return { liked: !!like };
  }

  /**
   * Add a comment to a post.
   */
  async addComment(postId: string, userId: string, comment: string) {
    await this.findOne(postId); // ensure post exists

    const created = await this.prisma.feedComment.create({
      data: { postId, userId, comment },
      include: {
        user: { select: { id: true, name: true, profileImage: true } },
      },
    });

    await this.prisma.feedPost.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return created;
  }

  /**
   * Delete a comment — only the author or an ADMIN can delete.
   */
  async deleteComment(commentId: string, userId: string, role: string) {
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });

    if (!comment) throw new NotFoundException('Comentário não encontrado');

    if (comment.userId !== userId && comment.post.userId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('Sem permissão para apagar este comentário');
    }

    await this.prisma.$transaction([
      this.prisma.feedComment.delete({ where: { id: commentId } }),
      this.prisma.feedPost.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);
    return { deleted: true };
  }

  /**
   * Toggle like on a comment
   */
  async toggleCommentLike(commentId: string, userId: string) {
    const comment = await this.prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');

    const existingLike = await this.prisma.feedCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existingLike) {
      await this.prisma.$transaction([
        this.prisma.feedCommentLike.delete({ where: { id: existingLike.id } }),
        this.prisma.feedComment.update({
          where: { id: commentId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false, likesCount: Math.max(0, comment.likesCount - 1) };
    } else {
      await this.prisma.$transaction([
        this.prisma.feedCommentLike.create({
          data: { commentId, userId },
        }),
        this.prisma.feedComment.update({
          where: { id: commentId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      return { liked: true, likesCount: comment.likesCount + 1 };
    }
  }

  /**
   * Increment the shares counter (fire-and-forget, no auth required).
   */
  async incrementShares(postId: string) {
    return this.prisma.feedPost.update({
      where: { id: postId },
      data: { sharesCount: { increment: 1 } },
      select: { sharesCount: true },
    });
  }
}
