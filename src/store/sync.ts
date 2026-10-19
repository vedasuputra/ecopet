import { supabase } from '../lib/supabase'
import { useAppStore } from './useAppStore'

// Keeps the zustand store and public.profiles.state in sync for the signed-in user.
// localStorage (zustand persist) stays as an offline cache.

const pick = (s: ReturnType<typeof useAppStore.getState>) => ({
  user: s.user,
  coins: s.coins,
  activeQuestIds: s.activeQuestIds,
  questStatus: s.questStatus,
  ownedCoupons: s.ownedCoupons,
  chatHistory: s.chatHistory,
  adWatch: s.adWatch,
  commissionEvents: s.commissionEvents,
})

let timer: ReturnType<typeof setTimeout> | undefined
let unsub: (() => void) | undefined
let applying = false

/** Loads this user's saved state into the store. Returns true if a saved profile existed. */
export async function loadRemote(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.from('profiles').select('state').eq('id', userId).maybeSingle()
  if (error || !data || !data.state || !Object.keys(data.state).length) return false
  applying = true
  useAppStore.setState(data.state)
  applying = false
  return true
}

async function push(userId: string) {
  if (!supabase) return
  await supabase.from('profiles').upsert({ id: userId, state: pick(useAppStore.getState()), updated_at: new Date().toISOString() })
}

/** Saves every store change (debounced) until stopSync(). */
export function startSync(userId: string) {
  stopSync()
  void push(userId)
  unsub = useAppStore.subscribe(() => {
    if (applying) return
    clearTimeout(timer)
    timer = setTimeout(() => void push(userId), 800)
  })
}

export function stopSync() {
  clearTimeout(timer)
  unsub?.()
  unsub = undefined
}
