import { useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { Spinner } from '../../../components/Spinner'

const BUCKET = 'product-photos'
const MAX_BYTES = 5 * 1024 * 1024

/** crypto.randomUUID no existe fuera de contextos seguros: probar la app
 *  desde el celular por http://192.168.x.x cae en ese caso. */
function randomId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

interface PhotoFieldProps {
  locationId: string
  value: string
  onChange: (url: string) => void
}

/**
 * Foto del producto por dos vías: subir un archivo desde el dispositivo
 * (en celular el selector ofrece cámara o galería) o pegar un enlace.
 * El archivo se sube al momento de elegirlo, así el formulario solo
 * guarda una URL y el submit sigue siendo una sola escritura.
 */
export function PhotoField({ locationId, value, onChange }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brokenImage, setBrokenImage] = useState(false)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Se limpia el input para que elegir el mismo archivo dos veces seguidas
    // vuelva a disparar el evento change.
    e.target.value = ''
    if (!file) return

    setError(null)

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen no debe pesar más de 5 MB.')
      return
    }

    setUploading(true)
    const extension =
      file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    // La primera carpeta debe ser el location_id: las policies del bucket
    // autorizan la escritura a partir de ella.
    const path = `${locationId}/${randomId()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      setUploading(false)
      setError(uploadError.message)
      return
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    setBrokenImage(false)
    onChange(data.publicUrl)
    setUploading(false)
  }

  function updateUrl(url: string) {
    setBrokenImage(false)
    setError(null)
    onChange(url)
  }

  return (
    <div className="space-y-2">
      <span className="block font-label text-label-caps text-secondary uppercase">Foto</span>

      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-surface-variant bg-surface-container-low text-secondary">
          {value && !brokenImage ? (
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBrokenImage(true)}
            />
          ) : (
            <span className="material-symbols-outlined text-3xl">
              {brokenImage ? 'broken_image' : 'add_photo_alternate'}
            </span>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/70 text-primary">
              <Spinner className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-start gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-surface-variant px-4 py-2 text-button text-primary transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">upload</span>
            {uploading ? 'Subiendo...' : 'Subir imagen'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => updateUrl('')}
              className="rounded-lg px-4 py-1 text-button text-secondary transition-colors hover:text-error"
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-body-md text-secondary">O pega un enlace</span>
        <input
          type="url"
          value={value}
          onChange={(e) => updateUrl(e.target.value)}
          className="input"
          placeholder="https://..."
        />
      </label>

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container">
          {error}
        </p>
      )}
    </div>
  )
}
