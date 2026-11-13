export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  RIDER: 'RIDER',
  ADMIN: 'ADMIN',
  /** Kitchen staff: sees and works only on the orders and dishes of their own kitchen. */
  VENDOR: 'VENDOR',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES = Object.values(UserRole) as readonly UserRole[];
