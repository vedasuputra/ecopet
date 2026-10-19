import { supabase } from '../lib/supabase'
import { useAppStore } from './useAppStore'

// Keeps the CLIENT-owned part of the store (name, trip plan, active quests, chat history) in
// public.profiles.state for the signed-in user. Coins, quests done and coupons are NOT here:
// they live in server-only tables (see store/economy.ts). localStorage stays as an offline cache.

const pick = (s: ReturnType<typeof useAppStore.getState>) => ({
  user: s.user,
  activeQuestIds: s.activeQuestIds,
  chatHistory: s.chatHistory,
})

let timer: ReturnType<typeof setTimeout> | undefined
let unsub: (() => void) | undefined
let applying = false
let lastPushed = ''

/** Loads this user's saved profile into the store. Returns true if a saved profile existed. */
export async function loadRemote(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.from('profiles').select('state').eq('id', userId).maybeSingle()
  const s = data?.state as Partial<ReturnType<typeof pick>> | undefined
  if (error || !s || !Object.keys(s).length) return false
  applying = true
  // only the client-owned fields; any legacy coins/coupons in an old profile are ignored
  useAppStore.setState({
    ...(s.user ? { user: s.user } : {}),
    ...(s.activeQuestIds ? { activeQuestIds: s.activeQuestIds } : {}),
    ...(s.chatHistory ? { chatHistory: s.chatHistory } : {}),
  })
  applying = false
  lastPushed = JSON.stringify(pick(useAppStore.getState()))
  return true
}

async function push(userId: string) {
  if (!supabase) return
  const state = pick(useAppStore.getState())
  const json = JSON.stringify(state)
  if (json === lastPushed) return // the economy refreshes every few seconds; don't re-save an unchanged profile
  lastPushed = json
  await supabase.from('profiles').upsert({ id: userId, state, updated_at: new Date().toISOString() })
}

/** Saves every change (debounced) until stopSync(). */
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
  lastPushed = ''
}
