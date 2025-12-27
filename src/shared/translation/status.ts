import { hasTranslationApiKey } from "./secrets";
import { readTranslationSettings } from "./settings";

export type TranslationAvailability = {
  enabled: boolean;
  configured: boolean;
};

export const getTranslationAvailability = async (): Promise<TranslationAvailability> => {
  const settings = await readTranslationSettings();
  const configured = await hasTranslationApiKey();
  return { enabled: settings.enabled, configured };
};
