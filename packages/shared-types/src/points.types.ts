export type PointType =
  | 'ARVORE'
  | 'PLANTA'
  | 'RIO'
  | 'MANGUEZAL'
  | 'FAUNA'
  | 'ESPACO_CULTURAL'
  | 'AREA_VERDE'
  | 'OUTRO';

export interface EducationalPointDTO {
  id: string;
  trailId: string;
  title: string;
  slug: string;
  type: PointType;
  order: number;
  shortDescription: string;
  fullDescription: string;
  curiosities?: string;
  environmentalImportance: string;
  preservationCare: string;
  mainImage: string;
  offlineSummary: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QrCodeDTO {
  id: string;
  educationalPointId: string;
  qrTextContent: string;
  qrImage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BiodiversityItemDTO {
  id: string;
  trailId: string;
  groupType: string;
  popularName: string;
  scientificName?: string;
  description: string;
  image: string;
  curiosities?: string;
  environmentalImportance: string;
  createdAt: Date;
  updatedAt: Date;
}
