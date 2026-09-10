/**
 * Domain models. Shapes mirror the MongoDB schema in docs/context.md so a future
 * backend can adopt them unchanged; today they are persisted as JSON in AsyncStorage.
 */

export type ItemStatus = 'fresh' | 'soon' | 'expired';

export interface User {
  _id: string;
  email: string;
  /** `pbkdf2$<iterations>$<saltHex>$<hashHex>` - see AuthService. Never plaintext. */
  password: string;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    notificationPreferences: {
      expiringSoon: boolean;
      expired: boolean;
      customReminders: boolean;
    };
    defaultCategories: string[];
  };
}

export interface Item {
  _id: string;
  userId: string;
  name: string;
  dateAdded: Date;
  estimatedExpiry: Date;
  /** Derived from `estimatedExpiry` on every read; stored value is only a snapshot. */
  status: ItemStatus;
  quantity: number;
  category: string;
  store: string;
  receiptTotal: number;
  receiptId: string;
  notes?: string;
  imageUrl?: string;
  barcode?: string;
  /** Which estimator produced `estimatedExpiry`. */
  expirySource?: 'foodkeeper' | 'llm' | 'manual';
  /** Human-readable explanation, e.g. "USDA FoodKeeper: Bananas (fridge)". */
  expiryNote?: string;
}

export interface Receipt {
  _id: string;
  userId: string;
  storeName: string;
  purchaseDate: Date;
  totalAmount: number;
  items: string[]; // References to Item documents
  imageUrl: string;
  rawText: string; // OCR output
  parsedData: {
    items: {
      name: string;
      price: number;
      quantity: number;
    }[];
    taxes: number;
    discounts: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  _id: string;
  userId: string;
  itemId: string;
  type: 'expiringSoon' | 'expired' | 'custom';
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}
