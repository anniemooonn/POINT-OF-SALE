import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Point } from '../lib/geometry'
import type { SectionRow, TableRow, TableShape, TableStatus } from '../types/tables'

const SECTION_COLUMNS = 'id, name, sort_order, boundary'
const TABLE_COLUMNS = 'id, section_id, name, capacity, shape, x, y, width, height, rotation'

export const MISSING_MIGRATION_MSG =
  'Las tablas del mapa de mesas todavía no existen en Supabase. Corre la migración ' +
  'supabase/migrations/0008_sections_and_tables.sql en el SQL Editor.'

interface SupabaseError {
  code?: string
  message: string
}

/** PostgREST responde PGRST205 ("no encuentro la tabla") o Postgres 42P01. */
function isMissingTable(error: SupabaseError | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

function describeError(error: SupabaseError): string {
  if (isMissingTable(error)) return MISSING_MIGRATION_MSG
  if (error.code === '23505') return 'Ya existe una sección con ese nombre.'
  return error.message
}

interface Result {
  error: string | null
}

interface TablesState {
  locationId: string | null
  sections: SectionRow[]
  tables: TableRow[]
  /** Estado operativo por mesa; vive aparte del layout (tabla `table_states`). */
  states: Record<string, TableStatus>
  loading: boolean
  /** true si falta correr la migración 0008; la pantalla lo explica en vez de fallar. */
  missingMigration: boolean

  load: (locationId: string) => Promise<void>
  addSection: (name: string) => Promise<Result & { id?: string }>
  renameSection: (id: string, name: string) => Promise<Result>
  deleteSection: (id: string) => Promise<Result>
  saveBoundary: (sectionId: string, boundary: Point[] | null) => Promise<Result>
  addTable: (params: {
    sectionId: string
    shape: TableShape
    x: number
    y: number
    width: number
    height: number
  }) => Promise<Result>
  updateTable: (id: string, patch: Partial<Omit<TableRow, 'id' | 'section_id'>>) => Promise<Result>
  deleteTable: (id: string) => Promise<Result>
  setTableStatus: (tableId: string, status: TableStatus) => Promise<Result>
  /** Suscripción Realtime a cambios de estado; devuelve la función de limpieza. */
  subscribeStates: () => () => void
}

export const useTablesStore = create<TablesState>((set, get) => ({
  locationId: null,
  sections: [],
  tables: [],
  states: {},
  loading: true,
  missingMigration: false,

  load: async (locationId) => {
    set({ loading: true, locationId })

    const [sectionsResult, tablesResult, statesResult] = await Promise.all([
      supabase
        .from('sections')
        .select(SECTION_COLUMNS)
        .eq('location_id', locationId)
        .order('sort_order')
        .order('name'),
      supabase
        .from('restaurant_tables')
        .select(TABLE_COLUMNS)
        .eq('location_id', locationId)
        .order('created_at'),
      supabase.from('table_states').select('table_id, status').eq('location_id', locationId),
    ])

    const states: Record<string, TableStatus> = {}
    for (const row of statesResult.data ?? []) {
      states[row.table_id] = row.status as TableStatus
    }

    set({
      sections: sectionsResult.data ?? [],
      tables: tablesResult.data ?? [],
      states,
      loading: false,
      missingMigration:
        isMissingTable(sectionsResult.error) || isMissingTable(tablesResult.error),
    })
  },

  addSection: async (name) => {
    const { locationId, sections } = get()
    if (!locationId) return { error: 'No hay un local activo' }

    const trimmed = name.trim()
    if (!trimmed) return { error: 'Escribe un nombre para la sección' }

    const nextOrder = sections.reduce((max, s) => Math.max(max, s.sort_order), 0) + 1
    const { data, error } = await supabase
      .from('sections')
      .insert({ location_id: locationId, name: trimmed, sort_order: nextOrder })
      .select(SECTION_COLUMNS)
      .single()

    if (error || !data) return { error: describeError(error ?? { message: 'No se pudo crear' }) }

    set({ sections: [...sections, data] })
    return { error: null, id: data.id }
  },

  renameSection: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'El nombre no puede quedar vacío' }

    const { error } = await supabase.from('sections').update({ name: trimmed }).eq('id', id)
    if (error) return { error: describeError(error) }

    set({ sections: get().sections.map((s) => (s.id === id ? { ...s, name: trimmed } : s)) })
    return { error: null }
  },

  deleteSection: async (id) => {
    // El delete arrastra las mesas por FK on delete cascade; la UI ya pidió
    // confirmación mostrando cuántas mesas se lleva.
    const { error } = await supabase.from('sections').delete().eq('id', id)
    if (error) return { error: describeError(error) }

    const { sections, tables, states } = get()
    const removedTables = new Set(tables.filter((t) => t.section_id === id).map((t) => t.id))
    const nextStates = { ...states }
    for (const tableId of removedTables) delete nextStates[tableId]

    set({
      sections: sections.filter((s) => s.id !== id),
      tables: tables.filter((t) => !removedTables.has(t.id)),
      states: nextStates,
    })
    return { error: null }
  },

  saveBoundary: async (sectionId, boundary) => {
    const previous = get().sections
    set({ sections: previous.map((s) => (s.id === sectionId ? { ...s, boundary } : s)) })

    const { error } = await supabase.from('sections').update({ boundary }).eq('id', sectionId)
    if (error) {
      set({ sections: previous })
      return { error: describeError(error) }
    }
    return { error: null }
  },

  addTable: async ({ sectionId, shape, x, y, width, height }) => {
    const { locationId, tables, states } = get()
    if (!locationId) return { error: 'No hay un local activo' }

    // "Mesa N" con el primer número libre en todo el local, no por sección:
    // los tickets y el KDS nombran mesas sin decir sección, y dos "Mesa 3"
    // en salas distintas serían ambigüedad pura.
    const used = new Set(
      tables
        .map((t) => /^Mesa (\d+)$/.exec(t.name)?.[1])
        .filter(Boolean)
        .map(Number),
    )
    let n = 1
    while (used.has(n)) n++

    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        location_id: locationId,
        section_id: sectionId,
        name: `Mesa ${n}`,
        shape,
        x,
        y,
        width,
        height,
      })
      .select(TABLE_COLUMNS)
      .single()

    if (error || !data) return { error: describeError(error ?? { message: 'No se pudo crear' }) }

    // El trigger de la 0008 siembra el estado 'libre' del lado del servidor.
    set({ tables: [...tables, data], states: { ...states, [data.id]: 'libre' } })
    return { error: null }
  },

  updateTable: async (id, patch) => {
    const previous = get().tables
    set({ tables: previous.map((t) => (t.id === id ? { ...t, ...patch } : t)) })

    const { error } = await supabase.from('restaurant_tables').update(patch).eq('id', id)
    if (error) {
      set({ tables: previous })
      return { error: describeError(error) }
    }
    return { error: null }
  },

  deleteTable: async (id) => {
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', id)
    if (error) return { error: describeError(error) }

    const { tables, states } = get()
    const nextStates = { ...states }
    delete nextStates[id]
    set({ tables: tables.filter((t) => t.id !== id), states: nextStates })
    return { error: null }
  },

  setTableStatus: async (tableId, status) => {
    const previous = get().states
    set({ states: { ...previous, [tableId]: status } })

    const { error } = await supabase
      .from('table_states')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('table_id', tableId)

    if (error) {
      set({ states: previous })
      return { error: describeError(error) }
    }
    return { error: null }
  },

  subscribeStates: () => {
    const { locationId } = get()
    if (!locationId) return () => {}

    const channel = supabase
      .channel(`table-states-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_states',
          filter: `location_id=eq.${locationId}`,
        },
        (payload) => {
          const row = payload.new as { table_id?: string; status?: TableStatus }
          if (!row?.table_id || !row.status) return
          set({ states: { ...get().states, [row.table_id]: row.status } })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  },
}))
