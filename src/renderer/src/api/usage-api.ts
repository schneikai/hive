import type {
  FetchForAccountResult,
  OpenAIUsageResult,
  RefreshAllResultItem,
  UsageResult,
  UsageProvider
} from '@shared/types/usage'
import { getRendererRpcClient } from './rpc-client'

export const usageApi = {
  fetch: async (): Promise<UsageResult> =>
    getRendererRpcClient().request<UsageResult>('usageOps.fetch', {}),
  fetchOpenai: async (): Promise<OpenAIUsageResult> =>
    getRendererRpcClient().request<OpenAIUsageResult>('usageOps.fetchOpenai', {}),
  refreshAllForProvider: async (
    provider: UsageProvider,
    excludeAccountIds?: string[]
  ): Promise<RefreshAllResultItem[]> =>
    getRendererRpcClient().request<RefreshAllResultItem[]>('usageOps.refreshAllForProvider', {
      provider,
      ...(excludeAccountIds ? { excludeAccountIds } : {})
    }),
  fetchForAccount: async (
    accountId: string,
    userInitiated?: boolean
  ): Promise<FetchForAccountResult> =>
    getRendererRpcClient().request<FetchForAccountResult>('usageOps.fetchForAccount', {
      accountId,
      userInitiated
    })
}
