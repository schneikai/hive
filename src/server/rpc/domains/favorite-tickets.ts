import { Effect } from 'effect'
import { z } from 'zod'
import type {
  FavoriteTicket,
  FavoriteTicketCreate,
  FavoriteTicketUpdate
} from '../../../main/db'
import type { RpcHandler } from '../router'

export interface FavoriteTicketsRpcService {
  readonly list: () => Effect.Effect<FavoriteTicket[], unknown, never>
  readonly create: (data: FavoriteTicketCreate) => Effect.Effect<FavoriteTicket, unknown, never>
  readonly update: (
    id: string,
    data: FavoriteTicketUpdate
  ) => Effect.Effect<FavoriteTicket | null, unknown, never>
  readonly delete: (id: string) => Effect.Effect<boolean, unknown, never>
}

const emptyParamsSchema = z.union([z.object({}).strict(), z.undefined(), z.null()])

const favoriteTicketCreateSchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    goal_mode: z.boolean().optional(),
    goal_success_criteria: z.string().nullable().optional()
  })
  .strict() satisfies z.ZodType<FavoriteTicketCreate>

const favoriteTicketUpdateDataSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    goal_mode: z.boolean().optional(),
    goal_success_criteria: z.string().nullable().optional()
  })
  .strict() satisfies z.ZodType<FavoriteTicketUpdate>

const favoriteTicketUpdateParamsSchema = z
  .object({
    id: z.string().min(1),
    data: favoriteTicketUpdateDataSchema
  })
  .strict()

const favoriteTicketIdParamsSchema = z.object({ id: z.string().min(1) }).strict()

export const makeLiveFavoriteTicketsRpcService = (): FavoriteTicketsRpcService => ({
  list: () =>
    Effect.tryPromise({
      try: async () => {
        const { getDatabase } = await import('../../../main/db')
        return getDatabase().getFavoriteTickets()
      },
      catch: (cause) => cause
    }),
  create: (data) =>
    Effect.tryPromise({
      try: async () => {
        const { getDatabase } = await import('../../../main/db')
        return getDatabase().createFavoriteTicket(data)
      },
      catch: (cause) => cause
    }),
  update: (id, data) =>
    Effect.tryPromise({
      try: async () => {
        const { getDatabase } = await import('../../../main/db')
        return getDatabase().updateFavoriteTicket(id, data)
      },
      catch: (cause) => cause
    }),
  delete: (id) =>
    Effect.tryPromise({
      try: async () => {
        const { getDatabase } = await import('../../../main/db')
        return getDatabase().deleteFavoriteTicket(id)
      },
      catch: (cause) => cause
    })
})

export const makeFavoriteTicketsRpcHandlers = (
  service: FavoriteTicketsRpcService = makeLiveFavoriteTicketsRpcService()
): ReadonlyMap<string, RpcHandler> =>
  new Map<string, RpcHandler>([
    [
      'favoriteTickets.list',
      (params) =>
        Effect.gen(function* () {
          yield* Effect.try({
            try: () => emptyParamsSchema.parse(params),
            catch: (cause) => cause
          })
          return yield* service.list()
        })
    ],
    [
      'favoriteTickets.create',
      (params) =>
        Effect.gen(function* () {
          const data = yield* Effect.try({
            try: () => favoriteTicketCreateSchema.parse(params),
            catch: (cause) => cause
          })
          return yield* service.create(data)
        })
    ],
    [
      'favoriteTickets.update',
      (params) =>
        Effect.gen(function* () {
          const { id, data } = yield* Effect.try({
            try: () => favoriteTicketUpdateParamsSchema.parse(params),
            catch: (cause) => cause
          })
          return yield* service.update(id, data)
        })
    ],
    [
      'favoriteTickets.delete',
      (params) =>
        Effect.gen(function* () {
          const { id } = yield* Effect.try({
            try: () => favoriteTicketIdParamsSchema.parse(params),
            catch: (cause) => cause
          })
          return yield* service.delete(id)
        })
    ]
  ])
