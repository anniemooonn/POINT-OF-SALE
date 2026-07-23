import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ActiveEmployee, EmployeeRole } from '../types/auth'

const ACTIVE_EMPLOYEE_KEY = 'pos.activeEmployee'

interface LocationRow {
  id: string
  name: string
}

interface AuthState {
  session: Session | null
  location: LocationRow | null
  activeEmployee: ActiveEmployee | null
  initializing: boolean

  init: () => Promise<void>
  signUpLocation: (params: {
    email: string
    password: string
    locationName: string
    adminName: string
    adminPin: string
  }) => Promise<{ error: string | null }>
  signInLocation: (email: string, password: string) => Promise<{ error: string | null }>
  signOutLocation: () => Promise<void>
  selectEmployee: (employeeId: string, pin: string) => Promise<{ error: string | null }>
  clearActiveEmployee: () => void
  requireManagerPin: (pin: string) => Promise<{ success: boolean; name?: string }>
}

async function loadLocation(ownerAuthId: string): Promise<LocationRow | null> {
  const { data } = await supabase
    .from('locations')
    .select('id, name')
    .eq('owner_auth_id', ownerAuthId)
    .maybeSingle()
  return data
}

function restoreActiveEmployee(): ActiveEmployee | null {
  const raw = sessionStorage.getItem(ACTIVE_EMPLOYEE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ActiveEmployee
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  location: null,
  activeEmployee: restoreActiveEmployee(),
  initializing: true,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    const location = session ? await loadLocation(session.user.id) : null
    set({ session, location, initializing: false })

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      const newLocation = newSession ? await loadLocation(newSession.user.id) : null
      set({ session: newSession, location: newLocation })
      if (!newSession) get().clearActiveEmployee()
    })
  },

  signUpLocation: async ({ email, password, locationName, adminName, adminPin }) => {
    // Nota: si el proyecto de Supabase tiene confirmación de email activada,
    // signUp no deja sesión activa de inmediato y el usuario debe confirmar
    // su correo antes de poder crear el local. Para desarrollo, desactivar
    // "Confirm email" en Auth > Providers del dashboard de Supabase.
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.session || !data.user) {
      return { error: error?.message ?? 'No se pudo crear la sesión. Revisa la confirmación de email.' }
    }

    const { data: locationRow, error: locationError } = await supabase
      .from('locations')
      .insert({ name: locationName, owner_auth_id: data.user.id })
      .select('id, name')
      .single()

    if (locationError || !locationRow) {
      return { error: locationError?.message ?? 'No se pudo crear el local' }
    }

    const { data: employeeRows, error: employeeError } = await supabase.rpc('create_employee', {
      p_location_id: locationRow.id,
      p_name: adminName,
      p_role: 'admin',
      p_pin: adminPin,
    })

    if (employeeError || !employeeRows?.[0]) {
      return { error: employeeError?.message ?? 'No se pudo crear el usuario administrador' }
    }

    const admin = employeeRows[0]
    const activeEmployee: ActiveEmployee = {
      id: admin.id,
      name: admin.name,
      role: admin.role as EmployeeRole,
    }
    sessionStorage.setItem(ACTIVE_EMPLOYEE_KEY, JSON.stringify(activeEmployee))

    set({ session: data.session, location: locationRow, activeEmployee })
    return { error: null }
  },

  signInLocation: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      return { error: error?.message ?? 'No se pudo iniciar sesión' }
    }
    const location = await loadLocation(data.session.user.id)
    set({ session: data.session, location })
    return { error: null }
  },

  signOutLocation: async () => {
    await supabase.auth.signOut()
    get().clearActiveEmployee()
    set({ session: null, location: null })
  },

  selectEmployee: async (employeeId, pin) => {
    const { data, error } = await supabase.rpc('verify_employee_pin', {
      p_employee_id: employeeId,
      p_pin: pin,
    })
    const result = data?.[0]
    if (error || !result?.success) {
      return { error: 'PIN incorrecto' }
    }
    const activeEmployee: ActiveEmployee = {
      id: result.employee_id,
      name: result.name,
      role: result.role as EmployeeRole,
    }
    sessionStorage.setItem(ACTIVE_EMPLOYEE_KEY, JSON.stringify(activeEmployee))
    set({ activeEmployee })
    return { error: null }
  },

  clearActiveEmployee: () => {
    sessionStorage.removeItem(ACTIVE_EMPLOYEE_KEY)
    set({ activeEmployee: null })
  },

  requireManagerPin: async (pin) => {
    const { data, error } = await supabase.rpc('verify_manager_pin', { p_pin: pin })
    const result = data?.[0]
    if (error || !result?.success) return { success: false }
    return { success: true, name: result.name }
  },
}))
