/**
 * Camada extra de persistência pro arquivo do exame original (PDF/imagem).
 * O fileDataUrl (blob:) só vive na memória da aba que fez o upload — some em
 * qualquer reload. Aqui guardamos o File real em IndexedDB (assíncrono, sem
 * limite baixo tipo localStorage) pra poder reconstruir um blob novo depois.
 * Single-slot: só o exame ativo, sobrescrito a cada upload.
 */

const DB_NAME = 'voiston-hub-exam-files'
const STORE_NAME = 'files'
const RECORD_KEY = 'current'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB indisponível')); return }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveExamFile(file: File): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(file, RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Modo privado, quota estourada etc — é só uma camada extra, falha em silêncio
  }
}

export async function getExamFile(): Promise<File | null> {
  try {
    const db = await openDb()
    const file = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY)
      req.onsuccess = () => resolve((req.result as File) ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return file
  } catch {
    return null
  }
}

export async function clearExamFile(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(RECORD_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // noop
  }
}
