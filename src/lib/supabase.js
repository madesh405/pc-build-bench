import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function fromDatabaseComponent(row) {
  return {
    ...row,
    id: String(row.id),
    price: Number(row.price) || 0,
    power: Number(row.power) || 0,
    specs: row.specs && typeof row.specs === 'object' ? row.specs : {},
    sourceUrl: row.source_url || '',
    priceCheckedAt: row.price_checked_at || ''
  };
}

export function toDatabaseComponent(item) {
  return {
    id: String(item.id),
    category: item.category,
    name: item.name,
    brand: item.brand,
    price: Number(item.price) || 0,
    power: Number(item.power) || 0,
    specs: item.specs && typeof item.specs === 'object' ? item.specs : {},
    source_url: item.sourceUrl || item.source_url || null,
    price_checked_at: item.priceCheckedAt || item.price_checked_at || null,
    is_active: item.is_active !== false
  };
}
