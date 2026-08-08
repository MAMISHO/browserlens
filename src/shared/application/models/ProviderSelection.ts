import type { IModelClientService, ProviderKind } from "../Services/IModelClientService.js";

export interface ProviderSelection {
  client: IModelClientService;
  model: string;
  provider: ProviderKind;
}
