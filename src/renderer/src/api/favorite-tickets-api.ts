import { getRendererRpcClient } from './rpc-client'

export const favoriteTicketsApi = {
  list: async <TResult>(): Promise<TResult[]> =>
    getRendererRpcClient().request<TResult[]>('favoriteTickets.list', {}),
  create: async <TResult, TData extends object>(data: TData): Promise<TResult> =>
    getRendererRpcClient().request<TResult>('favoriteTickets.create', data),
  update: async <TResult, TData extends object>(id: string, data: TData): Promise<TResult | null> =>
    getRendererRpcClient().request<TResult | null>('favoriteTickets.update', { id, data }),
  delete: async (id: string): Promise<boolean> =>
    getRendererRpcClient().request<boolean>('favoriteTickets.delete', { id })
}
