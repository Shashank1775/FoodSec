/**
 * Expiry estimation.
 *
 * Strategy (per item name):
 *   1. If an Azure OpenAI deployment is configured via EXPO_PUBLIC_AZURE_OPENAI_*,
 *      ask it for a number of days. The FoodKeeper estimate is passed in the prompt as a
 *      hint so the model refines rather than guesses.
 *   2. Otherwise - or if the request fails / returns garbage - fall back to the offline
 *      USDA FoodKeeper lookup, which is what the app uses out of the box.
 */
import axios from 'axios';
import { AZURE_OPENAI_CONFIG, isLLMConfigured } from '../../../config/env';
import { foodKeeperService, ShelfLifeEstimate } from '../expiry/FoodKeeperService';

export interface ExpiryPrediction extends ShelfLifeEstimate {
  /** Which estimator produced the final number of days. */
  source: 'llm' | 'foodkeeper';
}

const MIN_DAYS = 1;
const MAX_DAYS = 365 * 2;

class LLMService {
  private static instance: LLMService;
  private readonly cache = new Map<string, ExpiryPrediction>();

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  public async predictExpiry(itemName: string): Promise<ExpiryPrediction> {
    const key = itemName.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return cached;

    const offline = foodKeeperService.estimateShelfLife(itemName);
    let prediction: ExpiryPrediction = { ...offline, source: 'foodkeeper' };

    if (isLLMConfigured()) {
      const days = await this.askLLM(itemName, offline);
      if (days !== null) {
        prediction = { ...offline, days, source: 'llm' };
      }
    }

    this.cache.set(key, prediction);
    return prediction;
  }

  /** Convenience wrapper returning only the day count. */
  public async predictExpiryDate(itemName: string): Promise<number> {
    return (await this.predictExpiry(itemName)).days;
  }

  /** Estimates several items; the offline path is synchronous so this stays fast without an LLM. */
  public async batchPredictExpiryDates(items: string[]): Promise<Map<string, number>> {
    const predictions = new Map<string, number>();
    // Sequential on purpose: keeps LLM calls under rate limits and preserves order.
    for (const item of items) {
      predictions.set(item, await this.predictExpiryDate(item));
    }
    return predictions;
  }

  private async askLLM(itemName: string, hint: ShelfLifeEstimate): Promise<number | null> {
    const { endpoint, apiKey, deployment, apiVersion } = AZURE_OPENAI_CONFIG;
    try {
      const hintText = hint.product
        ? `USDA FoodKeeper lists "${hint.product.name}${hint.product.subtitle ? ` (${hint.product.subtitle})` : ''}" as keeping about ${hint.days} days in the ${hint.storage}.`
        : 'No reference data is available for this item.';

      const response = await axios.post(
        `${endpoint!.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
        {
          messages: [
            {
              role: 'system',
              content:
                'You are a food safety expert. Given a grocery receipt line, reply with ONLY an integer: the number of days the item typically stays good after purchase when stored appropriately.',
            },
            { role: 'user', content: `Item: "${itemName}"\n${hintText}` },
          ],
          temperature: 0,
          max_tokens: 6,
        },
        { headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, timeout: 10000 }
      );

      const raw: string = response.data?.choices?.[0]?.message?.content ?? '';
      const days = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (Number.isNaN(days) || days < MIN_DAYS || days > MAX_DAYS) {
        console.warn(`LLM returned unusable expiry "${raw}" for "${itemName}"; using FoodKeeper estimate`);
        return null;
      }
      return days;
    } catch (error) {
      console.warn('LLM expiry prediction failed; using FoodKeeper estimate', error);
      return null;
    }
  }
}

export const llmService = LLMService.getInstance();
export default LLMService;
