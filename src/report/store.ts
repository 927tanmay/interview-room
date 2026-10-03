import { useEffect, useState } from 'react'
import type { InterviewReport } from './report'

// Finished interviews, kept on this device in IndexedDB so the report and the
// candidate's marks survive a reload. Nothing is sent anywhere.
//
// Every report is also kept in memory, so the report screen has it at once
// and still works where IndexedDB is unavailable (a private window, blocked
// storage); then it lasts until the tab closes, and `saveReport` says so.

const DB_NAME = 'interview-room'
const DB_VERSION = 1
const STORE = 'reports'

const memory = new Map<string, InterviewReport>()
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'))
  }).catch((e: unknown) => {
    dbPromise = null
    throw e
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

// True when saved on the device; false when it is only in memory.
export async function saveReport(report: InterviewReport): Promise<boolean> {
  memory.set(report.id, report)
  notify(report.id)
  try {
    await run('readwrite', (s) => s.put(report))
    return true
  } catch (e) {
    console.warn('[report] could not save on this device:', e)
    return false
  }
}

export async function getReport(id: string): Promise<InterviewReport | null> {
  const kept = memory.get(id)
  if (kept) return kept
  try {
    const found = (await run<InterviewReport | undefined>('readonly', (s) => s.get(id))) ?? null
    if (found) memory.set(id, found)
    return found
  } catch {
    return null
  }
}

// Newest first.
export async function listReports(): Promise<InterviewReport[]> {
  let saved: InterviewReport[] = []
  try {
    saved = await run<InterviewReport[]>('readonly', (s) => s.getAll())
  } catch {
    // Only what is in memory.
  }
  const byId = new Map(saved.map((r) => [r.id, r]))
  memory.forEach((r, id) => byId.set(id, r))
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt)
}

// --- For React: the report with this id, kept up to date as it is saved.

const listeners = new Set<(id: string) => void>()

function notify(id: string) {
  listeners.forEach((l) => l(id))
}

export function useReport(id: string | null): { report: InterviewReport | null; loading: boolean } {
  const [state, setState] = useState<{ id: string | null; report: InterviewReport | null; loading: boolean }>({
    id,
    report: id ? (memory.get(id) ?? null) : null,
    loading: !!id && !memory.has(id),
  })
  if (state.id !== id) {
    setState({ id, report: id ? (memory.get(id) ?? null) : null, loading: !!id && !memory.has(id) })
  }

  useEffect(() => {
    if (!id) return
    let live = true
    if (!memory.has(id)) {
      void getReport(id).then((report) => live && setState({ id, report, loading: false }))
    }
    const onSaved = (saved: string) => {
      if (saved === id && live) setState({ id, report: memory.get(id) ?? null, loading: false })
    }
    listeners.add(onSaved)
    return () => {
      live = false
      listeners.delete(onSaved)
    }
  }, [id])

  return { report: state.report, loading: state.loading }
}
