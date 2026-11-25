/**
 * What GET /menu returns. The API builds these and the mobile app reads them, so both use
 * the same definitions. Unavailable things are removed from the menu, never just flagged.
 * Money is integer paise.
 */

export interface PublicAddon {
  id: string;
  name: string;
  pricePaise: number;
}

export interface PublicAddonGroup {
  id: string;
  name: string;
  /** How many the customer must pick (0 means the group is optional). */
  minSelect: number;
  /** The most they may pick. */
  maxSelect: number;
  addons: PublicAddon[];
}

export interface PublicVariant {
  id: string;
  name: string;
  pricePaise: number;
}

export interface PublicItem {
  id: string;
  name: string;
  description: string | null;
  /** A full URL, or null when the item has no picture. */
  imageUrl: string | null;
  isVeg: boolean;
  /** The cheapest available variant, for "from Rs X" on the list. */
  startingPricePaise: number;
  variants: PublicVariant[];
  addonGroups: PublicAddonGroup[];
}

export interface PublicCategory {
  id: string;
  name: string;
  items: PublicItem[];
}

export interface PublicVendor {
  id: string;
  name: string;
  /** Shown as an Open or Closed badge. A closed kitchen still shows its menu. */
  isOpen: boolean;
  prepTimeMinutes: number;
  /** Preorder-only kitchen: no order-now, customers book a delivery time on `preorderWeekdays`. */
  preorderOnly?: boolean;
  /** Weekdays a preorder-only kitchen delivers on (0 = Sunday). Empty means any day. */
  preorderWeekdays?: number[];
  /** PIN codes this kitchen delivers to. Empty means it is not limited to an area. */
  servicePincodes: string[];
  categories: PublicCategory[];
}

/** The shop settings customers need to see (delivery fee, minimum order, COD limit). */
export interface MenuSettings {
  deliveryRadiusKm: number;
  minOrderPaise: number;
  flatDeliveryFeePaise: number;
  /** Delivery is free when the subtotal reaches this. 0 means the rule is off. */
  freeDeliveryAbovePaise: number;
  codMaxPaise: number;
}

export interface PublicMenu {
  vendors: PublicVendor[];
  config: MenuSettings;
  banners: PublicBanners;
}

/** Where a home screen banner sits: above the menu, in the middle of it, or after it. */
export const BANNER_POSITIONS = ['TOP', 'MID', 'BOTTOM'] as const;
export type BannerPosition = (typeof BANNER_POSITIONS)[number];

/** The most banners one position may hold. More than one shows as a strip to swipe through. */
export const MAX_BANNERS_PER_POSITION = 8;

export interface PublicBanner {
  id: string;
  /** A full URL. */
  imageUrl: string;
  /** Read out by screen readers. Null when the admin gave none. */
  title: string | null;
  /** The menu item a tap opens, or null when the banner is only a picture. */
  itemId: string | null;
}

/** The home screen banners the Super Admin has switched on, in show order. */
export interface PublicBanners {
  top: PublicBanner[];
  mid: PublicBanner[];
  bottom: PublicBanner[];
}
