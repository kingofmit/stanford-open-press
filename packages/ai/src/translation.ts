import type { TranslationResult } from "./types";

/**
 * Language codes supported for abstract translation.
 */
export const SUPPORTED_LANGUAGES = [
  "en", "es", "fr", "de", "pt", "zh", "ja", "ko", "ar", "ru",
  "it", "nl", "sv", "pl", "tr", "hi", "th", "vi", "id", "uk",
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language display names.
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  ru: "Russian",
  it: "Italian",
  nl: "Dutch",
  sv: "Swedish",
  pl: "Polish",
  tr: "Turkish",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  uk: "Ukrainian",
};

/**
 * Translate an abstract for multilingual discoverability.
 *
 * In production, this would call an AI model or translation API.
 * This implementation provides the interface and placeholder logic.
 */
export async function translateAbstract(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode,
  translator?: (text: string, from: string, to: string) => Promise<string>,
): Promise<TranslationResult> {
  if (sourceLanguage === targetLanguage) {
    return {
      sourceLanguage,
      targetLanguage,
      translatedText: text,
      confidence: 100,
    };
  }

  if (translator) {
    const translatedText = await translator(text, sourceLanguage, targetLanguage);
    return {
      sourceLanguage,
      targetLanguage,
      translatedText,
      confidence: 85, // Confidence from external service
    };
  }

  // Placeholder: in production, integrate with Vercel AI SDK or similar
  return {
    sourceLanguage,
    targetLanguage,
    translatedText: `[Translation to ${LANGUAGE_NAMES[targetLanguage]} pending]`,
    confidence: 0,
  };
}

/**
 * Generate multilingual abstract metadata for a submission.
 * Returns translations for all supported target languages.
 */
export async function generateMultilingualAbstracts(
  abstract: string,
  sourceLanguage: LanguageCode,
  targetLanguages: LanguageCode[],
  translator?: (text: string, from: string, to: string) => Promise<string>,
): Promise<TranslationResult[]> {
  const results = await Promise.all(
    targetLanguages
      .filter((lang) => lang !== sourceLanguage)
      .map((lang) => translateAbstract(abstract, sourceLanguage, lang, translator)),
  );
  return results;
}
