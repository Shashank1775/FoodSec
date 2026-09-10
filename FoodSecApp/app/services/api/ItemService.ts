/**
 * Item use-cases that sit between the screens and the persistence layer.
 * The interesting part is `extractItemsFromOCR`, which glues the receipt parser
 * to the expiry estimator: OCR text -> parsed lines -> items with an estimated expiry.
 */
import { databaseService } from './DatabaseService';
import { Item } from './models';
import { llmService } from '../ml/LLMService';
import { parseReceipt, ParsedReceiptLine } from '../receipt/ReceiptParser';

/** An item proposed from a receipt scan; not persisted until the user confirms. */
export type DraftItem = Omit<Item, '_id' | 'userId' | 'status'>;

class ItemService {
  private static instance: ItemService;
  private constructor() {}

  public static getInstance(): ItemService {
    if (!ItemService.instance) {
      ItemService.instance = new ItemService();
    }
    return ItemService.instance;
  }

  public getItemsByUserId(userId: string): Promise<Item[]> {
    return databaseService.getItemsByUserId(userId);
  }

  public getItemById(itemId: string): Promise<Item | null> {
    return databaseService.getItemById(itemId);
  }

  public createItem(userId: string, item: DraftItem): Promise<Item> {
    return databaseService.createItem({ ...item, userId });
  }

  public saveDrafts(userId: string, drafts: DraftItem[]): Promise<Item[]> {
    return databaseService.createItems(drafts.map((draft) => ({ ...draft, userId })));
  }

  public async updateItem(itemId: string, updates: Partial<DraftItem>): Promise<Item> {
    const updated = await databaseService.updateItem(itemId, updates);
    if (!updated) throw new Error('Item not found');
    return updated;
  }

  public deleteItem(itemId: string): Promise<void> {
    return databaseService.deleteItem(itemId);
  }

  /**
   * Converts raw OCR text into draft items with estimated expiry dates.
   * Parsing is synchronous; expiry estimation is async because it may call an LLM.
   */
  public async extractItemsFromOCR(text: string, purchaseDate: Date = new Date()): Promise<DraftItem[]> {
    const lines = parseReceipt(text);
    const drafts: DraftItem[] = [];
    for (const line of lines) {
      drafts.push(await this.draftFromLine(line, purchaseDate));
    }
    return drafts;
  }

  private async draftFromLine(line: ParsedReceiptLine, purchaseDate: Date): Promise<DraftItem> {
    const prediction = await llmService.predictExpiry(line.name);
    const estimatedExpiry = new Date(purchaseDate);
    estimatedExpiry.setDate(estimatedExpiry.getDate() + prediction.days);

    const matched = prediction.product;
    const expiryNote = matched
      ? `${prediction.source === 'llm' ? 'LLM' : 'USDA FoodKeeper'}: ${matched.name}${matched.subtitle ? ` (${matched.subtitle})` : ''}, ${prediction.storage}`
      : 'No reference match; default shelf life used';

    return {
      name: line.name,
      dateAdded: purchaseDate,
      estimatedExpiry,
      quantity: line.quantity,
      category: matched?.category ?? 'Uncategorised',
      store: 'Unknown',
      receiptTotal: line.price ?? 0,
      receiptId: '',
      expirySource: prediction.source,
      expiryNote,
    };
  }
}

export const itemService = ItemService.getInstance();
export default ItemService;
