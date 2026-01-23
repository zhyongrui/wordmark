import { hasTranslationApiKey } from "./secrets";
import { readTranslationSettings } from "./settings";
import { getDeepSeekConfig } from "./deepseek";
import { getMoonshotConfig } from "./moonshot";
import { getOpenAIConfig } from "./openai";
import { getQwenConfig } from "./qwen";
import { getVolcengineConfig } from "./volcengine";
import { getZhipuConfig } from "./zhipu";

export type TranslationAvailability = {
  enabled: boolean;
  configured: boolean;
};

export const getTranslationAvailability = async (): Promise<TranslationAvailability> => {
  const settings = await readTranslationSettings();
  const hasKey = await hasTranslationApiKey(settings.providerId);
  let configured = hasKey;

  if (settings.providerId === "volcengine") {
    const config = await getVolcengineConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "deepseek") {
    const config = await getDeepSeekConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "moonshot") {
    const config = await getMoonshotConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "openai") {
    const config = await getOpenAIConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "qwen") {
    const config = await getQwenConfig();
    configured = hasKey && config != null;
  }
  if (settings.providerId === "zhipu") {
    const config = await getZhipuConfig();
    configured = hasKey && config != null;
  }
  return { enabled: settings.enabled, configured };
};
