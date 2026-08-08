import type { IModelClient, ProviderKind } from "../Repositories/IModelClient.js";

export interface ProviderSelection {
  client: IModelClient;
  model: string;
  provider: ProviderKind;
}
