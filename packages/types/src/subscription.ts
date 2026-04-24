export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

export type SubscriptionStatusType =
  | 'trial'
  | 'active'
  | 'inactive'
  | 'canceled'
  | 'expired';

export interface ISubscription {
  _id: string;
  clinicId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatusType;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateSubscriptionDto {
  clinicId: string;
  plan?: SubscriptionPlan;
  expiresAt: string;
}

export interface IUpdateSubscriptionDto {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatusType;
  expiresAt?: string;
}

export const PLAN_PROFESSIONAL_LIMITS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 2,
  [SubscriptionPlan.BASIC]: 10,
  [SubscriptionPlan.PRO]: -1,
};
