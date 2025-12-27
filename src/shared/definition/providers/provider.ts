import type { DefinitionRequest, DefinitionResponse } from "../types";

export type DefinitionProvider = {
  id: string;
  generateDefinition: (
    request: DefinitionRequest,
    apiKey: string,
    options?: { signal?: AbortSignal }
  ) => Promise<DefinitionResponse>;
};

