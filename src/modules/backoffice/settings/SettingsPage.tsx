import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fadeUp, layoutSpring, viewSwap } from '../../../lib/motion'
import { Spinner } from '../../../components/Spinner'
import { MISSING_MIGRATION_MSG, useSettingsStore } from '../../../stores/useSettingsStore'
import { CategoriesSection } from './CategoriesSection'
import { LocationProfileForm } from './LocationProfileForm'
import { SalesSettingsForm } from './SalesSettingsForm'

const TABS = [
  { id: 'local', label: 'Local', icon: 'storefront' },
  { id: 'menu', label: 'Menú', icon: 'restaurant_menu' },
  { id: 'ventas', label: 'Ventas', icon: 'payments' },
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsPage() {
  const loading = useSettingsStore((s) => s.loading)
  const missingMigration = useSettingsStore((s) => s.missingMigration)
  const [tab, setTab] = useState<TabId>('local')

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-secondary">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-gutter">
        <h2 className="text-headline-lg text-on-surface">Configuración</h2>
        <p className="mt-1 text-secondary">
          Ajustes del restaurante que usan el resto de las pantallas.
        </p>
      </div>

      <AnimatePresence>
        {missingMigration && (
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-gutter rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
          >
            {MISSING_MIGRATION_MSG}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mb-gutter flex space-x-2 border-b border-outline-variant pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`relative flex items-center gap-2 px-6 py-3 pb-[14px] text-button transition-colors ${
              tab === item.id
                ? 'text-primary'
                : 'text-secondary hover:bg-surface-container-lowest hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
            {tab === item.id && (
              <motion.span
                layoutId="settings-tab-underline"
                transition={layoutSpring}
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} variants={viewSwap} initial="hidden" animate="show" exit="exit">
          {tab === 'local' && <LocationProfileForm />}
          {tab === 'menu' && <CategoriesSection />}
          {tab === 'ventas' && <SalesSettingsForm />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
