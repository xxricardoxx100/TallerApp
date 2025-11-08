// Storage abstraction: usa Supabase (Postgres + Storage) si están configuradas las variables de entorno
// IMPORTANTE: Usa el cliente singleton de lib/supabase para evitar múltiples instancias
import { supabase as supabaseClient, isSupabaseConfigured } from '../lib/supabase'

const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'public'
const useSupabase = isSupabaseConfigured()
const supabase = supabaseClient

// Exportar el cliente para uso en otros módulos
export { supabase }

// Helper: convertir dataURL a Blob
async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return await res.blob()
}

const initStorage = async () => {
  if (typeof window === 'undefined' || window.storage) return

  if (useSupabase && supabase) {
    // Comprobación: verificar si el bucket existe y es accesible; si falla, caer al fallback localStorage
    let supabaseAvailable = true
    try {
      await supabase.storage.from(bucket).list('', { limit: 1 })
      console.log(`Supabase storage: bucket "${bucket}" accesible`)
    } catch (err) {
      supabaseAvailable = false
      console.error(`Supabase storage: no se puede acceder al bucket "${bucket}". Comprueba que el bucket exista y que la variable NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET esté bien configurada. Detalle:`, err)
    }

    if (!supabaseAvailable) {
      // Fallback inmediato a localStorage para que la app no rompa
      window.storage = {
        async list(prefix = 'vehicle:') {
          try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
            return { keys }
          } catch (error) {
            console.error('Error listando storage local (fallback):', error)
            return { keys: [] }
          }
        },
        async get(key) {
          try {
            const value = localStorage.getItem(key)
            return value ? { value } : null
          } catch (error) {
            console.error('Error obteniendo storage local (fallback):', error)
            return null
          }
        },
        async set(key, value) {
          try {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
            return true
          } catch (error) {
            console.error('Error guardando storage local (fallback):', error)
            throw error
          }
        }
      }
      return
    }

    // Implementación usando Supabase (tabla `vehicles` con columnas: id text PK, data jsonb)
    window.storage = {
      async list(prefix = 'vehicle:', full = false) {
        try {
          // Si se solicita "full", traer también los datos para evitar N+1 queries
          const selectCols = full ? 'id,data' : 'id'
          const { data, error } = await supabase.from('vehicles').select(selectCols)
          if (error) throw error
          const rows = data || []
          const keys = rows.map(r => `${prefix}${r.id}`)
          if (full) {
            const items = rows.map(r => ({ key: `${prefix}${r.id}`, value: JSON.stringify(r.data) }))
            return { keys, items }
          }
          return { keys }
        } catch (error) {
          console.error('Error listando vehículos en Supabase:', error)
          return { keys: [] }
        }
      },

      async get(key) {
        try {
          const id = key.replace('vehicle:', '')
          const { data, error } = await supabase.from('vehicles').select('data').eq('id', id).single()
          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }
          // Asegurar que las URLs de imágenes sean accesibles (firmadas) si el bucket no es público
          const ensureAccessibleUrls = async (obj) => {
            if (!obj || typeof obj !== 'object') return obj
            const parseToPath = (url) => {
              try {
                if (typeof url !== 'string' || url.startsWith('data:')) return null
                const marker = `${bucket}/`
                const idx = url.indexOf(marker)
                if (idx === -1) return null
                return url.substring(idx + marker.length)
              } catch {
                return null
              }
            }
            const toSigned = async (url) => {
              const path = parseToPath(url)
              if (!path) return url
              try {
                const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30)
                if (signErr || !signed?.signedUrl) return url
                return signed.signedUrl
              } catch {
                return url
              }
            }
            if (Array.isArray(obj.imagenes)) {
              const out = []
              for (const u of obj.imagenes) {
                if (!u) continue
                out.push(await toSigned(u))
              }
              obj.imagenes = out
            }
            if (Array.isArray(obj.actualizaciones)) {
              for (const upd of obj.actualizaciones) {
                if (upd && Array.isArray(upd.imagenes)) {
                  const out = []
                  for (const u of upd.imagenes) {
                    if (!u) continue
                    out.push(await toSigned(u))
                  }
                  upd.imagenes = out
                }
              }
            }
            return obj
          }
          const valueObj = await ensureAccessibleUrls(data?.data)
          return data ? { value: JSON.stringify(valueObj) } : null
        } catch (error) {
          console.error('Error obteniendo vehículo desde Supabase:', error)
          return null
        }
      },

      async set(key, value) {
        try {
          const id = key.replace('vehicle:', '')
          let obj = typeof value === 'string' ? JSON.parse(value) : value

          const uploadDataUrl = async (dataUrl, path) => {
            const blob = await dataUrlToBlob(dataUrl)
            const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '3600' })
            if (uploadError) {
              // Mejora del mensaje para errores comunes (bucket no encontrado / permisos)
              const msg = uploadError.message || JSON.stringify(uploadError)
              if (msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')) {
                throw new Error(`Bucket no encontrado o sin permisos: ${bucket} — ${msg}`)
              }
              if (msg.toLowerCase().includes('row-level security')) {
                console.warn('RLS del Storage bloquea la subida; usando dataURL inline como fallback sólo para desarrollo.')
                // Fallback: devolver la misma dataUrl para que no falle el guardado (no óptimo en producción)
                return dataUrl
              }
              throw uploadError
            }
            const { data: publicData, error: urlError } = supabase.storage.from(bucket).getPublicUrl(path)
            if (urlError) throw urlError
            return publicData?.publicUrl || null
          }

          // Subir imágenes iniciales si son data URLs
          if (Array.isArray(obj.imagenes) && obj.imagenes.length > 0) {
            const urls = []
            for (let i = 0; i < obj.imagenes.length; i++) {
              const img = obj.imagenes[i]
              if (typeof img === 'string' && img.startsWith('data:')) {
                const path = `vehicles/${id}/initial/${Date.now()}_${i}.jpg`
                const url = await uploadDataUrl(img, path)
                urls.push(url)
              } else {
                urls.push(img)
              }
            }
            obj.imagenes = urls
          }

          // Subir imágenes en actualizaciones
          if (Array.isArray(obj.actualizaciones) && obj.actualizaciones.length > 0) {
            for (let u = 0; u < obj.actualizaciones.length; u++) {
              const upd = obj.actualizaciones[u]
              if (upd && Array.isArray(upd.imagenes) && upd.imagenes.length > 0) {
                const urls = []
                for (let j = 0; j < upd.imagenes.length; j++) {
                  const im = upd.imagenes[j]
                  if (typeof im === 'string' && im.startsWith('data:')) {
                    const updateId = upd.id || `update_${u}`
                    const path = `vehicles/${id}/updates/${updateId}/${Date.now()}_${j}.jpg`
                    const url = await uploadDataUrl(im, path)
                    urls.push(url)
                  } else {
                    urls.push(im)
                  }
                }
                upd.imagenes = urls
              }
            }
          }

          // Guardar objeto completo en la columna `data` (jsonb)
          // Estrategia sin upsert para evitar ambigüedades RLS: select → insert/update
          let exists = false
          try {
            const { data: sel, error: selError } = await supabase
              .from('vehicles')
              .select('id')
              .eq('id', id)
              .maybeSingle()  // Cambiar .single() por .maybeSingle() para manejar 0 o 1 resultados
            if (sel && sel.id) exists = true
            if (selError && selError.code !== 'PGRST116') {
              // Error real distinto a not found
              throw selError
            }
          } catch (selErr) {
            console.error('Supabase select-before-save error:', selErr)
          }

          let error = null
          if (!exists) {
            const res = await supabase.from('vehicles').insert([{ id, data: obj }])
            error = res.error || null
          } else {
            const res = await supabase.from('vehicles').update({ data: obj }).eq('id', id)
            error = res.error || null
          }

          if (error) {
            console.error('Supabase save error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            })
            throw new Error(`Supabase save falló: ${error.code || ''} ${error.message}`)
          }
          return true
        } catch (error) {
          console.error('Error guardando vehículo en Supabase:', error)
          throw error
        }
      }
    }
  } else {
    // Fallback simple a localStorage (para desarrollo sin Supabase)
    window.storage = {
      async list(prefix = 'vehicle:') {
        try {
          const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))
          return { keys }
        } catch (error) {
          console.error('Error listando storage local:', error)
          return { keys: [] }
        }
      },

      async get(key) {
        try {
          const value = localStorage.getItem(key)
          return value ? { value } : null
        } catch (error) {
          console.error('Error obteniendo storage local:', error)
          return null
        }
      },

      async set(key, value) {
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
          return true
        } catch (error) {
          console.error('Error guardando storage local:', error)
          throw error
        }
      }
    }
  }
}

// Inicializar al cargar el módulo
initStorage()

export default initStorage