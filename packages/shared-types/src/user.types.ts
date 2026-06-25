export type Role = 'ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  schoolId?: string;
  profileImage?: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}
