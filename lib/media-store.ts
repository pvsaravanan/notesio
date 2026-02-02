type StoredMedia = {
  id: string
  name: string
  mimeType: string
  blob: Blob
  createdAt: number
}

const DB_NAME = "notesio"
const DB_VERSION = 1
const STORE_NAME = "media"

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putImage(file: File, id: string): Promise<StoredMedia> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)

  const record: StoredMedia = {
    id,
    name: file.name,
    mimeType: file.type,
    blob: file,
    createdAt: Date.now(),
  }

  await promisifyRequest(store.put(record))

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

  return record
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readonly")
  const store = tx.objectStore(STORE_NAME)
  const result = await promisifyRequest(store.get(id))

  return (result as StoredMedia | undefined) ?? null
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  await promisifyRequest(store.delete(id))

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}
