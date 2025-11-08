import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'public';
const useSupabase = !!supabaseUrl && !!supabaseKey;

let supabase: ReturnType<typeof createClient> | null = null;
if (useSupabase) {
  try { supabase = createClient(supabaseUrl, supabaseKey); } catch (err) { console.error('Error inicializando Supabase:', err); }
}

async function dataUrlToBlob(dataUrl: string) { const res = await fetch(dataUrl); return await res.blob(); }

const initStorage = async () => {
  if (typeof window === 'undefined' || (window as any).storage) return;
  if (useSupabase && supabase) {
    let supabaseAvailable = true;
    try { await supabase.storage.from(bucket).list('', { limit: 1 }); console.log(`Supabase storage: bucket "${bucket}" accesible`); }
    catch (err) { supabaseAvailable = false; console.error(`Supabase storage inaccesible: ${bucket}`, err); }
    if (!supabaseAvailable) {
      (window as any).storage = {
        async list(prefix = 'vehicle:') { try { const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix)); return { keys }; } catch { return { keys: [] }; } },
        async get(key: string) { try { const value = localStorage.getItem(key); return value ? { value } : null; } catch { return null; } },
        async set(key: string, value: any) { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; }
      }; return;
    }
    (window as any).storage = {
      async list(prefix = 'vehicle:', full = false) {
        try {
          const selectCols = full ? 'id,data' : 'id';
          const { data, error } = await supabase!.from('vehicles').select(selectCols);
          if (error) throw error; const rows: any[] = (data as any[]) || []; const keys = rows.map((r: any) => `${prefix}${r.id}`);
          if (full) { const items = rows.map((r: any) => ({ key: `${prefix}${r.id}`, value: JSON.stringify(r.data) })); return { keys, items }; }
          return { keys };
        } catch (e) { console.error('Error listando vehículos:', e); return { keys: [] }; }
      },
      async get(key: string) {
        try {
          const id = key.replace('vehicle:', '');
          const { data, error } = await supabase!.from('vehicles').select('data').eq('id', id).single();
          if (error) { if ((error as any).code === 'PGRST116') return null; throw error; }
          const ensureAccessibleUrls = async (obj: any) => {
            if (!obj || typeof obj !== 'object') return obj;
            const parseToPath = (url: string) => { try { if (!url || url.startsWith('data:')) return null; const marker = `${bucket}/`; const idx = url.indexOf(marker); if (idx === -1) return null; return url.substring(idx + marker.length); } catch { return null; } };
            const toSigned = async (url: string) => { const path = parseToPath(url); if (!path) return url; try { const { data: signed } = await supabase!.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 30); return signed?.signedUrl || url; } catch { return url; } };
            if (Array.isArray(obj.imagenes)) { obj.imagenes = await Promise.all(obj.imagenes.filter(Boolean).map(toSigned)); }
            if (Array.isArray(obj.actualizaciones)) { for (const upd of obj.actualizaciones) { if (upd && Array.isArray(upd.imagenes)) { upd.imagenes = await Promise.all(upd.imagenes.filter(Boolean).map(toSigned)); } } }
            return obj;
          };
          const valueObj = await ensureAccessibleUrls((data as any)?.data);
          return data ? { value: JSON.stringify(valueObj) } : null;
        } catch (e) { console.error('Error obteniendo vehículo:', e); return null; }
      },
      async set(key: string, value: any) {
        try {
          const id = key.replace('vehicle:', '');
          let obj = typeof value === 'string' ? JSON.parse(value) : value;
          const uploadDataUrl = async (dataUrl: string, path: string) => {
            const blob = await dataUrlToBlob(dataUrl);
            const { error: uploadError } = await supabase!.storage.from(bucket).upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '3600' });
            if (uploadError) { const msg = uploadError.message || JSON.stringify(uploadError); if (/bucket|not found/i.test(msg)) throw new Error(`Bucket error: ${bucket} — ${msg}`); if (/row-level security/i.test(msg)) { console.warn('RLS bloquea subida; usando dataURL inline'); return dataUrl; } throw uploadError; }
            const { data: publicData } = supabase!.storage.from(bucket).getPublicUrl(path); return publicData?.publicUrl || null;
          };
          if (Array.isArray(obj.imagenes)) { obj.imagenes = await Promise.all(obj.imagenes.map((img: string, i: number) => img.startsWith('data:') ? uploadDataUrl(img, `vehicles/${id}/initial/${Date.now()}_${i}.jpg`) : img)); }
          if (Array.isArray(obj.actualizaciones)) { for (const upd of obj.actualizaciones) { if (upd && Array.isArray(upd.imagenes)) { upd.imagenes = await Promise.all(upd.imagenes.map((im: string, j: number) => im.startsWith('data:') ? uploadDataUrl(im, `vehicles/${id}/updates/${upd.id || `update_${j}`}/${Date.now()}_${j}.jpg`) : im)); } } }
          
          // Usar upsert en lugar de select + insert/update para evitar error 406
          const { error } = await (supabase!.from('vehicles') as any).upsert(
            { id, data: obj },
            { onConflict: 'id' }
          );
          
          if (error) { console.error('Save error details:', error); throw new Error(`Supabase save falló: ${(error as any).code || ''} ${(error as any).message}`); }
          return true;
        } catch (e) { console.error('Error guardando vehículo:', e); throw e; }
      }
    };
  } else {
    (window as any).storage = {
      async list(prefix = 'vehicle:') { try { const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix)); return { keys }; } catch { return { keys: [] }; } },
      async get(key: string) { try { const value = localStorage.getItem(key); return value ? { value } : null; } catch { return null; } },
      async set(key: string, value: any) { localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value)); return true; }
    };
  }
};

initStorage();
export default initStorage;
