/**
 * Local persistence layer.
 *
 * The product spec targets MongoDB, but a mobile client cannot talk to Mongo directly
 * and there is no backend yet. This repository keeps the same method surface a REST
 * client would expose and stores everything as JSON in AsyncStorage, so the app works
 * fully offline. Swapping in an HTTP implementation later only touches this file.
 *
 * Storage layout (one key per collection):
 *   session -> current user's id            users -> User[]
 *   items   -> Item[] (all users)           receipts / notifications -> reserved
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { expirationService } from '../ExpirationService';
import { Item, Notification, Receipt, User } from './models';

const KEYS = {
  session: '@foodsec/session',
  users: '@foodsec/users',
  items: '@foodsec/items',
  receipts: '@foodsec/receipts',
  notifications: '@foodsec/notifications',
} as const;

const newId = (): string => Crypto.randomUUID();

/** JSON round-trips turn Dates into strings; restore them so callers can rely on the model types. */
const reviveItem = (raw: Item): Item => {
  const estimatedExpiry = new Date(raw.estimatedExpiry);
  return {
    ...raw,
    dateAdded: new Date(raw.dateAdded),
    estimatedExpiry,
    status: expirationService.getStatusForDate(estimatedExpiry),
  };
};

const reviveUser = (raw: User): User => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  updatedAt: new Date(raw.updatedAt),
});

class DatabaseService {
  private static instance: DatabaseService;
  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async readCollection<T>(key: string): Promise<T[]> {
    const json = await AsyncStorage.getItem(key);
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn(`Corrupt data under ${key}; resetting collection`, error);
      await AsyncStorage.removeItem(key);
      return [];
    }
  }

  private async writeCollection<T>(key: string, rows: T[]): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(rows));
  }

  // ---- Session -------------------------------------------------------------

  /** Returns the id of the signed-in user, if any. */
  async getSessionUserId(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.session);
  }

  async setSessionUserId(userId: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.session, userId);
  }

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.session);
  }

  // ---- Users ---------------------------------------------------------------

  async getUsers(): Promise<User[]> {
    return (await this.readCollection<User>(KEYS.users)).map(reviveUser);
  }

  async getUserById(userId: string): Promise<User | null> {
    return (await this.getUsers()).find((u) => u._id === userId) ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const needle = email.trim().toLowerCase();
    return (await this.getUsers()).find((u) => u.email.toLowerCase() === needle) ?? null;
  }

  async createUser(user: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const users = await this.getUsers();
    const now = new Date();
    const newUser: User = { ...user, _id: newId(), createdAt: now, updatedAt: now };
    users.push(newUser);
    await this.writeCollection(KEYS.users, users);
    return newUser;
  }

  // ---- Items ---------------------------------------------------------------

  private async getAllItems(): Promise<Item[]> {
    return (await this.readCollection<Item>(KEYS.items)).map(reviveItem);
  }

  async getItemsByUserId(userId: string): Promise<Item[]> {
    return (await this.getAllItems()).filter((item) => item.userId === userId);
  }

  async getItemById(itemId: string): Promise<Item | null> {
    return (await this.getAllItems()).find((item) => item._id === itemId) ?? null;
  }

  async createItem(item: Omit<Item, '_id' | 'status'>): Promise<Item> {
    const items = await this.getAllItems();
    const newItem = reviveItem({ ...item, _id: newId(), status: 'fresh' });
    items.push(newItem);
    await this.writeCollection(KEYS.items, items);
    return newItem;
  }

  /** Bulk insert used after a receipt scan; one write instead of N. */
  async createItems(newItems: Omit<Item, '_id' | 'status'>[]): Promise<Item[]> {
    const items = await this.getAllItems();
    const created = newItems.map((item) => reviveItem({ ...item, _id: newId(), status: 'fresh' }));
    await this.writeCollection(KEYS.items, [...items, ...created]);
    return created;
  }

  async updateItem(itemId: string, updates: Partial<Omit<Item, '_id' | 'userId'>>): Promise<Item | null> {
    const items = await this.getAllItems();
    const index = items.findIndex((item) => item._id === itemId);
    if (index === -1) return null;
    items[index] = reviveItem({ ...items[index], ...updates });
    await this.writeCollection(KEYS.items, items);
    return items[index];
  }

  async deleteItem(itemId: string): Promise<void> {
    const items = await this.getAllItems();
    await this.writeCollection(
      KEYS.items,
      items.filter((item) => item._id !== itemId)
    );
  }

  // ---- Receipts (stored for future use; no UI yet) --------------------------

  async createReceipt(receipt: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    const receipts = await this.readCollection<Receipt>(KEYS.receipts);
    const now = new Date();
    const newReceipt: Receipt = { ...receipt, _id: newId(), createdAt: now, updatedAt: now };
    receipts.push(newReceipt);
    await this.writeCollection(KEYS.receipts, receipts);
    return newReceipt;
  }

  async getReceiptsByUserId(userId: string): Promise<Receipt[]> {
    return (await this.readCollection<Receipt>(KEYS.receipts)).filter((r) => r.userId === userId);
  }

  // ---- Notifications (schema only; scheduling is on the roadmap) ------------

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return (await this.readCollection<Notification>(KEYS.notifications)).filter((n) => n.userId === userId);
  }
}

const databaseService = DatabaseService.getInstance();
export { databaseService };
export default DatabaseService;
