import { modelRegistry, type ModelStatus } from './monaco-model-registry';

export function useModelStatus(uri: string): ModelStatus {
  return modelRegistry.modelStatus.get(uri) ?? 'loading';
}
