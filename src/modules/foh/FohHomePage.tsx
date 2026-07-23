import { AppHeader } from '../../components/AppHeader'

export function FohHomePage() {
  return (
    <div className="min-h-full bg-slate-50">
      <AppHeader title="Mapa de mesas" />
      <div className="p-6 text-slate-500">
        Próximamente: mapa de mesas interactivo. Este módulo ya sabe quién eres
        ({' '}
        <span className="font-medium">acceso concedido</span>) — se conecta con la
        toma de órdenes en la siguiente tarea del backlog.
      </div>
    </div>
  )
}
