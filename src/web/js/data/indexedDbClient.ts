/**
 *
 */
export class IndexedDbClient {
  dbName: string;
  storeNames: string[];
  db: IDBDatabase | null;

  /**
   *
   */
  constructor(dbName: string, storeNames: string[]) {
    this.dbName = dbName;
    this.storeNames = storeNames;
    this.db = null;
  }
  // Initialize the database
  /**
   *
   */
  async init(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.storeNames.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'db_id', autoIncrement: true });
          }
        });
      };
      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onerror = (event: Event) => {
        reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
      };
    });
  }
  /**
   *
   */
  async count(storeName: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event: Event) => reject(`Count error: ${(event.target as IDBRequest).error}`);
    });
  }
  /**
   *
   */
  async getAll<T = any>(storeName: string, mapFunction: ((item: any) => T) | null = null): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(mapFunction ? request.result.map(mapFunction) : request.result);
      };
      request.onerror = (event: Event) => reject(`Get all error: ${(event.target as IDBRequest).error}`);
    });
  }
  /**
   *
   */
  async hasItems(storeName: string): Promise<boolean> {
    try {
      const count = await this.count(storeName);
      return count > 0;
    } catch (error) {
      console.error(`Error checking items in ${storeName}:`, error);
      return false;
    }
  }
  /**
   *
   */
  async insertRange(storeName: string, items: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      items.forEach(item => {
        store.add(item);
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event: Event) => reject(`Transaction error: ${(event.target as IDBTransaction).error}`);
    });
  }
  /**
   *
   */
  async clear(storeName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (event: Event) => reject(`Clear error: ${(event.target as IDBRequest).error}`);
    });
  }
}

// Expose to window for console debugging and runtime access
window.IndexedDbClient = IndexedDbClient;
