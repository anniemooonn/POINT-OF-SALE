import { AppHeader } from '../../components/AppHeader'

export function KdsPage() {
  return (
    <div className="min-h-full bg-slate-50">
      <AppHeader title="Cocina (KDS)" />
      <div className="p-6 text-slate-500">
        Próximamente: comandas entrantes ordenadas por tiempo.
      </div>
    </div>
  )
}
