/** Our own kitchen is vendor #1. Its id is fixed by the seed (apps/api/prisma/seed.ts). */
export const OWN_VENDOR_ID = 'vendor-1';

/** Cart limits, enforced by the server and used by the apps for friendly messages. */
export const MAX_CART_LINES = 30;
export const MAX_LINE_QUANTITY = 20;

/** How many orders one customer may have in progress at once. */
export const MAX_ACTIVE_ORDERS = 3;
