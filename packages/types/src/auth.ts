export enum UserRole {
  PATIENT = 'patient',
  CLINIC = 'clinic',
  PROFESSIONAL = 'professional',
  ATTENDANT = 'attendant',
}

export interface IUser {
  _id: string;
  role: UserRole;
  email?: string;
  username?: string;
  clinicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinic {
  _id: string;
  name: string;
  subscriptionStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProfessional {
  _id: string;
  specialty: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinicProfessional {
  _id: string;
  clinicId: string;
  professionalId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthTokens {
  accessToken: string;
}

export interface ILoginStandardDto {
  email: string;
  password: string;
}

export interface ILoginAttendantDto {
  clinicId: string;
  username: string;
  password: string;
}
