export type Difficulty = 'FACIL' | 'MODERADA' | 'DIFICIL';

export interface TrailDTO {
  id: string;
  schoolId: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  city: string;
  coverImage: string;
  biome: string;
  distanceKm: number;
  duration: string;
  difficulty: Difficulty;
  wikilocUrl?: string;
  safetyWarnings?: string;
  status: boolean;
  viewsCount: number;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}
