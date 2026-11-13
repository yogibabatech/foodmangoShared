import type { OrderStatus, OtpChannel, PaymentMethod, PaymentStatus, UserRole } from '../../src';

export interface Address {
  id: string;
  label: string;
  line1: string;
  landmark: string | null;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface AddressInput {
  label: string;
  line1: string;
  landmark?: string | null;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

/** The server's price for a cart. This, not the cart's own estimate, is what the customer pays. */
export interface Quote {
  vendorId: string;
  vendorName: string;
  lines: {
    variantId: string;
    itemName: string;
    variantName: string;
    addons: { id: string; name: string; pricePaise: number }[];
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  distanceKm: number;
  freeDeliveryApplied: boolean;
  codMaxPaise: number;
  codAvailable: boolean;
  /** False until a payment gateway is set up: then only Cash on Delivery is offered. */
  onlineAvailable: boolean;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotalPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
  totalPaise: number;
  notes: string | null;
  address: { label: string; line1: string; landmark: string | null; lat: number; lng: number };
  items: {
    itemId: string | null;
    variantId: string | null;
    itemName: string;
    variantName: string;
    addons: { id: string; name: string; pricePaise: number }[];
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];
  placedAt: string;
  canCancel: boolean;
  cancelReason: string | null;
  rating: { stars: number; comment: string | null } | null;
  rider: { name: string | null; phone: string } | null;
}

export interface PlaceOrderResult {
  order: OrderView;
  /** True when the server recognised the idempotency key and returned the earlier order. */
  replayed: boolean;
}

export interface User {
  id: string;
  phone: string; // +919876543210
  name: string | null;
  email: string | null;
  role: UserRole;
}

export interface OtpMethods {
  /** The methods a customer can use right now. */
  channels: OtpChannel[];
  /** True while the server is in Test OTP mode (development only). */
  testMode: boolean;
}

export interface SendOtpResult {
  sent: boolean;
  channel: OtpChannel;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface VerifyOtpResult {
  user: User;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
