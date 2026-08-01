import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { applyFormatSettings } from '../lib/format'
import {
  DEFAULT_SETTINGS,
  type LocationProfile,
  type LocationSettings,
  type MenuCategoryRow,
} from '../types/settings'

const SETTINGS_COLUMNS = 'currency_code, locale, timezone, tax_rate, prices_include_tax'
const PROFILE_COLUMNS = 'name, address, phone, tax_id'
const CATEGORY_COLUMNS = 'id, name, sort_order, active'

export const MISSING_MIGRATION_MSG =
  'Las tablas de configuración todavía no existen en Supabase. Corre la migración ' +
  'supabase/migrations/0007_location_settings_and_categories.sql en el SQL Editor.'

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
  if (error.code === '23505') return 'Ya existe una categoría con ese nombre.'
  return error.message
}

interface Result {
  error: string | null
}

interface SettingsState {
  locationId: string | null
  profile: LocationProfile | null
  settings: LocationSettings
  categories: MenuCategoryRow[]
  loading: boolean
  /** true si falta correr la migración 0007; la pantalla lo explica en vez de fallar. */
  missingMigration: boolean

  load: (locationId: string) => Promise<void>
  saveProfile: (patch: Partial<LocationProfile>) => Promise<Result>
  saveSettings: (patch: Partial<LocationSettings>) => Promise<Result>
  addCategory: (name: string) => Promise<Result>
  renameCategory: (id: string, name: string) => Promise<Result>
  setCategoryActive: (id: string, active: boolean) => Promise<Result>
  moveCategory: (id: string, direction: -1 | 1) => Promise<Result>
  deleteCategory: (id: string) => Promise<Result>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  locationId: null,
  profile: null,
  settings: DEFAULT_SETTINGS,
  categories: [],
  loading: true,
  missingMigration: false,

  load: async (locationId) => {
    set({ loading: true, locationId })

    const [profileResult, settingsResult, categoriesResult] = await Promise.all([
      supabase.from('locations').select(PROFILE_COLUMNS).eq('id', locationId).maybeSingle(),
      supabase
        .from('location_settings')
        .select(SETTINGS_COLUMNS)
        .eq('location_id', locationId)
        .maybeSingle(),
      supabase
        .from('menu_categories')
        .select(CATEGORY_COLUMNS)
        .eq('location_id', locationId)
        .order('sort_order')
        .order('name'),
    ])

    // Si la fila de ajustes todavía no existe (local creado antes de la 0007),
    // se opera con los valores por defecto hasta que el dueño guarde.
    const settings = settingsResult.data ?? DEFAULT_SETTINGS
    applyFormatSettings(settings)

    set({
      profile: profileResult.data ?? null,
      settings,
      categories: categoriesResult.data ?? [],
      loading: false,
      missingMigration:
        isMissingTable(settingsResult.error) || isMissingTable(categoriesResult.error),
    })
  },

  saveProfile: async (patch) => {
    const { locationId, profile } = get()
    if (!locationId) return { error: 'No hay un local activo' }

    const { data, error } = await supabase
      .from('locations')
      .update(patch)
      .eq('id', locationId)
      .select(PROFILE_COLUMNS)
      .single()

    if (error) return { error: describeError(error) }

    set({ profile: data ?? (profile ? { ...profile, ...patch } : null) })
    return { error: null }
  },

  saveSettings: async (patch) => {
    const { locationId, settings } = get()
    if (!locationId) return { error: 'No hay un local activo' }

    const next = { ...settings, ...patch }
    // upsert y no update: los locales creados antes de la 0007 se sembraron en
    // la migración, pero un local restaurado a mano podría no tener su fila.
    const { error } = await supabase
      .from('location_settings')
      .upsert({ location_id: locationId, ...next, updated_at: new Date().toISOString() })

    if (error) return { error: describeError(error) }

    applyFormatSettings(next)
    set({ settings: next })
    return { error: null }
  },

  addCategory: async (name) => {
    const { locationId, categories } = get()
    if (!locationId) return { error: 'No hay un local activo' }

    const trimmed = name.trim()
    if (!trimmed) return { error: 'Escribe un nombre para la categoría' }

    const nextOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({ location_id: locationId, name: trimmed, sort_order: nextOrder })
      .select(CATEGORY_COLUMNS)
      .single()

    if (error || !data) return { error: describeError(error ?? { message: 'No se pudo crear' }) }

    set({ categories: [...categories, data] })
    return { error: null }
  },

  renameCategory: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'El nombre no puede quedar vacío' }

    // El rename va por RPC porque además de la categoría hay que mover los
    // productos que la usan, y ambas cosas deben pasar en la misma transacción.
    const { error } = await supabase.rpc('rename_menu_category', {
      p_category_id: id,
      p_new_name: trimmed,
    })

    if (error) return { error: describeError(error) }

    set({
      categories: get().categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
    })
    return { error: null }
  },

  setCategoryActive: async (id, active) => {
    const previous = get().categories
    set({ categories: previous.map((c) => (c.id === id ? { ...c, active } : c)) })

    const { error } = await supabase.from('menu_categories').update({ active }).eq('id', id)
    if (error) {
      set({ categories: previous })
      return { error: describeError(error) }
    }
    return { error: null }
  },

  moveCategory: async (id, direction) => {
    const previous = get().categories
    const index = previous.findIndex((c) => c.id === id)
    const target = index + direction
    if (index === -1 || target < 0 || target >= previous.length) return { error: null }

    const reordered = [...previous]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]

    // Se reescribe la posición de toda la lista (1..n) en lugar de intercambiar
    // dos valores: el seed de la 0007 deja empatados en 99 los que venían de
    // productos, y con empates un intercambio simple no cambia nada visible.
    const normalized = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }))
    set({ categories: normalized })

    const changed = normalized.filter(
      (c) => previous.find((p) => p.id === c.id)?.sort_order !== c.sort_order,
    )
    const results = await Promise.all(
      changed.map((c) =>
        supabase.from('menu_categories').update({ sort_order: c.sort_order }).eq('id', c.id),
      ),
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) {
      set({ categories: previous })
      return { error: describeError(failed.error) }
    }
    return { error: null }
  },

  deleteCategory: async (id) => {
    // Igual que el rename: el servidor decide, porque tiene que contar los
    // productos que la usan antes de permitir el borrado.
    const { error } = await supabase.rpc('delete_menu_category', { p_category_id: id })
    if (error) return { error: describeError(error) }

    set({ categories: get().categories.filter((c) => c.id !== id) })
    return { error: null }
  },
}))
