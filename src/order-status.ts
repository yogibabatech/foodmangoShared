/**
 * Order statuses and the single table that says which status may move to which, and who may do it.
 *
 *   AWAITING_PAYMENT -> PLACED                      online orders, once payment is confirmed
 *   PLACED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED
 *   PLACED or ACCEPTED -> CANCELLED or REJECTED
 *
 * AWAITING_PAYMENT exists only for ONLINE orders that are not paid yet. The kitchen never sees it.
 * The server checks every change against ORDER_TRANSITIONS; the apps use it to decide which buttons to show.
 */
export const OrderStatus = {
  PLACED: 'PLACED',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUSES = Object.values(OrderStatus) as readonly OrderStatus[];

/** Who is making a change. SYSTEM is the server itself (payment confirmed, payment expired). */
export const TransitionActor = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  RIDER: 'RIDER',
  SYSTEM: 'SYSTEM',
} as const;

export type TransitionActor = (typeof TransitionActor)[keyof typeof TransitionActor];

type Transitions = Readonly<
  Record<OrderStatus, Readonly<Partial<Record<OrderStatus, readonly TransitionActor[]>>>>
>;

const { CUSTOMER, ADMIN, RIDER, SYSTEM } = TransitionActor;

/**
 * from -> to -> who may do it.
 *  - A customer may cancel only while the order is PLACED, before the kitchen accepts it.
 *  - Admin accepts, rejects, prepares, marks ready, and cancels (with a reason).
 *  - A rider picks up and delivers (Step 8). Admin may do both too, as a manual fallback.
 *  - SYSTEM confirms or expires online payments (Step 5).
 */
export const ORDER_TRANSITIONS: Transitions = {
  AWAITING_PAYMENT: { PLACED: [SYSTEM], CANCELLED: [SYSTEM] },
  PLACED: { ACCEPTED: [ADMIN], REJECTED: [ADMIN], CANCELLED: [CUSTOMER, ADMIN] },
  ACCEPTED: { PREPARING: [ADMIN], REJECTED: [ADMIN], CANCELLED: [ADMIN] },
  PREPARING: { READY: [ADMIN] },
  READY: { OUT_FOR_DELIVERY: [RIDER, ADMIN] },
  OUT_FOR_DELIVERY: { DELIVERED: [RIDER, ADMIN] },
  DELIVERED: {},
  CANCELLED: {},
  REJECTED: {},
};

/** Orders that are still in progress. A customer may have only a few of these at once. */
export const ACTIVE_ORDER_STATUSES = [
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PLACED,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
] as const satisfies readonly OrderStatus[];

/** A rider can be assigned (or changed) only until the order leaves the kitchen. */
export const RIDER_ASSIGNABLE_STATUSES = [
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
] as const satisfies readonly OrderStatus[];

export type TransitionCheck =
  | { ok: true }
  | {
      ok: false;
      /** INVALID_TRANSITION: that move does not exist. FORBIDDEN_TRANSITION: it exists, but not for this actor. */
      code: 'INVALID_TRANSITION' | 'FORBIDDEN_TRANSITION';
      message: string;
    };

const label = (status: OrderStatus) => status.toLowerCase().replaceAll('_', ' ');

export function checkTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): TransitionCheck {
  const allowed = ORDER_TRANSITIONS[from][to];
  if (!allowed) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `An order that is ${label(from)} cannot be changed to ${label(to)}`,
    };
  }
  if (!allowed.includes(actor)) {
    return {
      ok: false,
      code: 'FORBIDDEN_TRANSITION',
      message: `You are not allowed to change an order from ${label(from)} to ${label(to)}`,
    };
  }
  return { ok: true };
}

/** The statuses this actor may move an order to from here. Handy for choosing buttons. */
export function allowedNextStatuses(from: OrderStatus, actor: TransitionActor): OrderStatus[] {
  return Object.entries(ORDER_TRANSITIONS[from])
    .filter(([, actors]) => actors.includes(actor))
    .map(([status]) => status as OrderStatus);
}

/** Admin must give a reason when rejecting or cancelling, so the customer can be told why. */
export function requiresReason(to: OrderStatus, actor: TransitionActor): boolean {
  return actor === ADMIN && (to === OrderStatus.REJECTED || to === OrderStatus.CANCELLED);
}
