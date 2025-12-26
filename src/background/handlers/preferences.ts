import { Preferences } from "../../shared/storage/schema";
import { readPreferences, writePreferences } from "../../shared/preferences";

export type PreferencesResponse =
  | { ok: true; preferences: Preferences }
  | { ok: false; error: "invalid-payload" | "unknown" };

export type SetHighlightPreferencePayload = {
  highlightEnabled: boolean;
};

export const handleGetHighlightPreference = async (): Promise<PreferencesResponse> => {
  try {
    const preferences = await readPreferences();
    return { ok: true, preferences };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export const handleSetHighlightPreference = async (
  payload: SetHighlightPreferencePayload
): Promise<PreferencesResponse> => {
  if (!payload || typeof payload.highlightEnabled !== "boolean") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const next: Preferences = { highlightEnabled: payload.highlightEnabled };
    await writePreferences(next);
    return { ok: true, preferences: next };
  } catch {
    return { ok: false, error: "unknown" };
  }
};
