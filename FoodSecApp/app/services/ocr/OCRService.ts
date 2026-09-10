/**
 * Receipt OCR.
 *
 * Text recognition runs through the OCR.space REST API: a pure-JS OCR engine
 * (tesseract.js) cannot run inside React Native, and native on-device OCR
 * (iOS Vision / Android ML Kit, see `native/`) needs a custom dev build. The cloud API
 * works in Expo Go with zero setup, at the cost of needing a network connection.
 *
 * Pipeline: image URI -> downscale/compress (expo-image-manipulator) -> multipart
 * upload -> raw text. Parsing the text into items lives in `ItemService`.
 */
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';
import { OCR_CONFIG } from '../../../config/env';

interface OCRSpaceResponse {
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: { ParsedText: string }[];
}

class OCRService {
  private static instance: OCRService;
  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /** Returns the raw text recognised in the image at `imageUri`. */
  public async recognizeText(imageUri: string): Promise<string> {
    // Shrinking the image keeps uploads under the free-tier 1 MB limit and speeds up OCR;
    // receipts are high-contrast so the loss in resolution rarely matters.
    const prepared = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: OCR_CONFIG.uploadWidth } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    const formData = new FormData();
    formData.append('apikey', OCR_CONFIG.apiKey);
    formData.append('language', OCR_CONFIG.language);
    formData.append('isOverlayRequired', 'false');
    formData.append('isTable', 'true'); // keeps receipt rows on separate lines
    formData.append('OCREngine', '2');
    // React Native's FormData accepts { uri, name, type } for file parts.
    formData.append('file', { uri: prepared.uri, name: 'receipt.jpg', type: 'image/jpeg' } as unknown as Blob);

    let data: OCRSpaceResponse;
    try {
      const response = await axios.post<OCRSpaceResponse>(OCR_CONFIG.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      data = response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error('Could not reach the OCR service. Check your internet connection.');
      }
      throw error;
    }

    if (data.IsErroredOnProcessing) {
      const message = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : data.ErrorMessage;
      throw new Error(`OCR failed: ${message ?? 'unknown error'}`);
    }

    const text = data.ParsedResults?.[0]?.ParsedText?.trim() ?? '';
    if (!text) {
      throw new Error('No text was recognised. Try better lighting or a flatter receipt.');
    }
    return text;
  }
}

export const ocrService = OCRService.getInstance();
export default OCRService;
