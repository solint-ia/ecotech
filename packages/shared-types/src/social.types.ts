export type MediaType = 'IMAGE' | 'VIDEO';

export type ContentType =
  | 'GUIA'
  | 'FAUNA'
  | 'FLORA'
  | 'CARTILHA'
  | 'PROTOCOLO'
  | 'ODS'
  | 'CURIOSIDADE'
  | 'ARTIGO'
  | 'VIDEO';

export type ApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REPROVADO';

export interface FeedPostDTO {
  id: string;
  userId: string;
  schoolId?: string;
  trailId?: string;
  title: string;
  description: string;
  mediaType: MediaType;
  images?: {
    id: string;
    url: string;
    order: number;
  }[];
  status: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryDTO {
  id: string;
  userId: string;
  schoolId?: string;
  mediaType: MediaType;
  mediaUrl: string;
  expiresAt: Date;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LibraryContentDTO {
  id: string;
  title: string;
  description: string;
  contentType: ContentType;
  coverImage: string;
  fileUrl?: string;
  videoUrl?: string;
  userId: string;
  schoolId?: string;
  approvalStatus: ApprovalStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerDTO {
  id: string;
  name: string;
  category: string;
  description: string;
  coverImage: string;
  address: string;
  city: string;
  phone: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  openingHours: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}
