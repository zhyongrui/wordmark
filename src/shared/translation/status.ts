import { hasTranslationApiKey } from "./secrets";
import { readTranslationSettings } from "./settings";
import { getOpenAIConfig } from "./openai";
import { getVolcengineConfig } from "./volcengine";
import { getZhipuConfig } from "./zhipu";

export type TranslationAvailability = {
  enabled: boolean;
  configured: boolean;
};

export const getTranslationAvailability = async (): Promise<TranslationAvailability> => {
  const settings = await readTranslationSettings();
  const hasKey = await hasTranslationApiKey();
  let configured = hasKey;

  if (settings.providerId === "volcengine") {
    const config = await getVolcengineConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "openai") {
    const config = await getOpenAIConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "zhipu") {
    const config = await getZhipuConfig();
    configured = hasKey && config != null;
  }
  return { enabled: settings.enabled, configured };
};
