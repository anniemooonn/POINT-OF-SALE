import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useTablesStore } from '../../../stores/useTablesStore'
import { Modal } from '../../../components/Modal'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Spinner } from '../../../components/Spinner'
import { LayoutEditor } from './LayoutEditor'
import { placementValid } from './placement'
import { TableInspector } from './TableInspector'
import type { TableRow } from '../../../types/tables'

type SectionModal = { kind: 'new' } | { kind: 'rename'; id: string; current: string } | null
type PendingDelete = { kind: 'section'; id: string } | { kind: 'table'; id: string } | null

export function TableLayoutPage() {
  const locationId = useAuthStore((s) => s.location?.id)
  const {
    sections,
    tables,
    loading,
    missingMigration,
    load,
    addSection,
    renameSection,
    deleteSection,
    saveBoundary,
    addTable,
    updateTable,
    deleteTable,
  } = useTablesStore()

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [sectionModal, setSectionModal] = useState<SectionModal>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (locationId) void load(locationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  // Los avisos se van solos; no ameritan que el admin los cierre a mano.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0] ?? null
  const sectionTables = activeSection
    ? tables.filter((t) => t.section_id === activeSection.id)
    : []
  const selectedTable = sectionTables.find((t) => t.id === selectedTableId) ?? null

  async function handlePatchTable(
    table: TableRow,
    patch: Pick<TableRow, 'name' | 'capacity' | 'shape' | 'width' | 'height'>,
  ) {
    // Cambiar el tamaño puede sacar la mesa del límite o encimarla con otra:
    // se revalida la colocación completa antes de guardar.
    const box = {
      x: table.x,
      y: table.y,
      width: patch.width,
      height: patch.height,
      rotation: table.rotation,
    }
    if (!placementValid(box, activeSection?.boundary ?? null, sectionTables, table.id)) {
      return { error: 'Con ese tamaño la mesa no cabe en su posición actual. Muévela primero.' }
    }
    return updateTable(table.id, patch)
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    const result =
      pendingDelete.kind === 'section'
        ? await deleteSection(pendingDelete.id)
        : await deleteTable(pendingDelete.id)
    setDeleting(false)
    setPendingDelete(null)
    if (result.error) setNotice(result.error)
    if (pendingDelete.kind === 'section') setActiveSectionId(null)
    else setSelectedTableId(null)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-secondary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (missingMigration) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-body-md text-secondary">
        Las tablas del mapa de mesas todavía no existen en Supabase. Corre la migración{' '}
        <code className="rounded bg-surface-container px-1.5 py-0.5 text-sm">
          supabase/migrations/0008_sections_and_tables.sql
        </code>{' '}
        en el SQL Editor y recarga esta pantalla.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de secciones */}
      <div className="flex flex-wrap items-center gap-2">
        {sections.map((section) => {
          const active = activeSection?.id === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                setActiveSectionId(section.id)
                setSelectedTableId(null)
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary-container text-on-primary-container'
                  : 'border border-outline-variant text-secondary hover:bg-surface-container-high'
              }`}
            >
              {section.name}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setSectionModal({ kind: 'new' })}
          className="flex items-center gap-1 rounded-full border border-dashed border-outline px-4 py-1.5 text-sm font-semibold text-secondary hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Nueva sección
        </button>

        {activeSection && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSectionModal({ kind: 'rename', id: activeSection.id, current: activeSection.name })
              }
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-secondary hover:bg-surface-container-high"
            >
              Renombrar
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete({ kind: 'section', id: activeSection.id })}
              className="rounded-lg border border-error/40 px-3 py-1.5 text-sm text-error hover:bg-error-container/40"
            >
              Eliminar sección
            </button>
          </div>
        )}
      </div>

      {/* Aviso no bloqueante */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-error/30 bg-error-container/60 px-4 py-2 text-sm text-on-error-container"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {activeSection ? (
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <LayoutEditor
              section={activeSection}
              tables={sectionTables}
              selectedTableId={selectedTableId}
              onSelectTable={setSelectedTableId}
              onGeometryChange={(id, patch) => {
                void updateTable(id, patch).then((r) => {
                  if (r.error) setNotice(r.error)
                })
              }}
              onAddTable={(shape, x, y, width, height) => {
                void addTable({ sectionId: activeSection.id, shape, x, y, width, height }).then(
                  (r) => {
                    if (r.error) setNotice(r.error)
                  },
                )
              }}
              onSaveBoundary={(points) => {
                void saveBoundary(activeSection.id, points).then((r) => {
                  if (r.error) setNotice(r.error)
                })
              }}
              onNotice={setNotice}
            />
          </div>

          {selectedTable && (
            <TableInspector
              table={selectedTable}
              onSave={(patch) => handlePatchTable(selectedTable, patch)}
              onDelete={() => setPendingDelete({ kind: 'table', id: selectedTable.id })}
              onClose={() => setSelectedTableId(null)}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant p-12 text-center">
          <p className="text-headline-md text-on-surface">Arma la distribución de tu restaurante</p>
          <p className="mx-auto mt-2 max-w-md text-body-md text-secondary">
            Crea la primera sección (salón, terraza, barra...), dibuja el límite de su espacio y
            arrastra las mesas dentro.
          </p>
          <button
            type="button"
            onClick={() => setSectionModal({ kind: 'new' })}
            className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-button text-on-primary shadow-sm"
          >
            Crear sección
          </button>
        </div>
      )}

      {/* Alta / renombrado de sección */}
      <Modal open={sectionModal !== null} onClose={() => setSectionModal(null)}>
        {sectionModal && (
          <SectionForm
            title={sectionModal.kind === 'new' ? 'Nueva sección' : 'Renombrar sección'}
            initialName={sectionModal.kind === 'rename' ? sectionModal.current : ''}
            onCancel={() => setSectionModal(null)}
            onSubmit={async (name) => {
              if (sectionModal.kind === 'new') {
                const result = await addSection(name)
                if (result.error) return result.error
                if (result.id) setActiveSectionId(result.id)
              } else {
                const result = await renameSection(sectionModal.id, name)
                if (result.error) return result.error
              }
              setSectionModal(null)
              return null
            }}
          />
        )}
      </Modal>

      {/* Confirmaciones de borrado */}
      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        {pendingDelete && (
          <ConfirmDialog
            title={pendingDelete.kind === 'section' ? 'Eliminar sección' : 'Eliminar mesa'}
            message={
              pendingDelete.kind === 'section'
                ? `Se eliminará la sección junto con sus ${
                    tables.filter((t) => t.section_id === pendingDelete.id).length
                  } mesa(s). Esta acción no se puede deshacer.`
                : 'La mesa desaparecerá del mapa. Esta acción no se puede deshacer.'
            }
            loading={deleting}
            onConfirm={() => void handleConfirmDelete()}
            onCancel={() => setPendingDelete(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function SectionForm({
  title,
  initialName,
  onSubmit,
  onCancel,
}: {
  title: string
  initialName: string
  onSubmit: (name: string) => Promise<string | null>
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await onSubmit(name)
    setSaving(false)
    if (result) setError(result)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <h2 className="text-headline-md text-on-surface">{title}</h2>
      <label className="block space-y-1">
        <span className="font-label text-label-caps text-secondary">Nombre</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Salón principal, Terraza..."
          autoFocus
        />
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-button text-secondary hover:bg-surface-container-high"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
