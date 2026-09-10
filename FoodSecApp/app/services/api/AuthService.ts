/**
 * Local authentication.
 *
 * There is no server yet, so "accounts" live on the device: registration stores a
 * salted PBKDF2-SHA256 hash of the password (never the password itself) and login
 * verifies against it. The "session" is simply the signed-in user's id persisted in
 * AsyncStorage; when a backend arrives this is where a JWT would be requested and
 * stored instead. Because the hash and the data share the same device, this is about
 * hygiene (no plaintext secrets on disk), not protection against a hostile device owner.
 */
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { databaseService } from './DatabaseService';
import { User } from './models';

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_KEY_SIZE_WORDS = 256 / 32;
const SALT_BYTES = 16;

export const DEFAULT_USER_SETTINGS: User['settings'] = {
  notificationPreferences: { expiringSoon: true, expired: true, customReminders: false },
  defaultCategories: ['Produce', 'Dairy', 'Meat', 'Bakery', 'Pantry'],
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

class AuthService {
  private static instance: AuthService;
  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(email: string, password: string): Promise<User> {
    const normalisedEmail = email.trim().toLowerCase();
    if (await databaseService.getUserByEmail(normalisedEmail)) {
      throw new Error('An account with this email already exists');
    }

    const user = await databaseService.createUser({
      email: normalisedEmail,
      password: this.hashPassword(password),
      settings: DEFAULT_USER_SETTINGS,
    });
    await databaseService.setSessionUserId(user._id);
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await databaseService.getUserByEmail(email);
    // Same message for unknown email and wrong password so the UI can't leak which emails exist.
    if (!user || !this.verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password');
    }
    await databaseService.setSessionUserId(user._id);
    return user;
  }

  async logout(): Promise<void> {
    await databaseService.clearSession();
  }

  /** Restores the user for a persisted session, clearing the session if the user is gone. */
  async restoreSession(): Promise<User | null> {
    const userId = await databaseService.getSessionUserId();
    if (!userId) return null;
    const user = await databaseService.getUserById(userId);
    if (!user) await databaseService.clearSession();
    return user;
  }

  /** Produces `pbkdf2$<iterations>$<saltHex>$<hashHex>`; self-describing so parameters can change later. */
  hashPassword(password: string): string {
    const salt = toHex(Crypto.getRandomBytes(SALT_BYTES));
    const hash = this.derive(password, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
  }

  verifyPassword(password: string, stored: string): boolean {
    const [scheme, iterations, salt, hash] = stored.split('$');
    if (scheme !== 'pbkdf2' || !iterations || !salt || !hash) return false;
    return this.derive(password, salt, parseInt(iterations, 10)) === hash;
  }

  private derive(password: string, saltHex: string, iterations: number): string {
    return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), {
      keySize: PBKDF2_KEY_SIZE_WORDS,
      iterations,
      hasher: CryptoJS.algo.SHA256,
    }).toString(CryptoJS.enc.Hex);
  }
}

export const authService = AuthService.getInstance();
export default AuthService;
