/**
 * projectDB.ts
 *
 * IndexedDB wrapper for DeliverOps persistent data storage.
 * Version 2: Multi-store aggregate architecture with atomic transactions
 * for projects, global team members, task comments, audit logs, and migration snapshots.
 */

import { Project, TeamMember, TaskComment, AuditLogEntry } from '../types';

const DB_NAME = 'ClayGanttDB';
const DB_VERSION = 2;

export const STORE_PROJECTS = 'projects';
export const STORE_TEAM = 'team_members';
export const STORE_COMMENTS = 'task_comments';
export const STORE_AUDIT = 'audit_logs';
export const STORE_SNAPSHOTS = 'migration_snapshots';
export const STORE_META = 'meta';

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Projects Aggregate Store
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('code', 'code', { unique: false });
      }

      // 2. Global Team Directory Store
      if (!db.objectStoreNames.contains(STORE_TEAM)) {
        const store = db.createObjectStore(STORE_TEAM, { keyPath: 'id' });
        store.createIndex('department', 'department', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }

      // 3. Task Comments Store
      if (!db.objectStoreNames.contains(STORE_COMMENTS)) {
        const store = db.createObjectStore(STORE_COMMENTS, { keyPath: 'id' });
        store.createIndex('taskId', 'taskId', { unique: false });
      }

      // 4. Audit Trail Store
      if (!db.objectStoreNames.contains(STORE_AUDIT)) {
        const store = db.createObjectStore(STORE_AUDIT, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // 5. Migration Snapshots Store (Replaces localStorage limit)
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'snapshotKey' });
      }

      // 6. Meta Key-Value Store
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };
      resolve(_db);
    };

    request.onerror = () => reject(request.error);
  });
}

// ==========================================
// 1. PROJECTS OPERATIONS
// ==========================================

export async function dbSaveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const req = tx.objectStore(STORE_PROJECTS).put(project);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Atomic two-store mutation: saves project and audit log entry in one transaction */
export async function dbSaveProjectWithAudit(
  project: Project,
  auditEntry: AuditLogEntry
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_AUDIT], 'readwrite');
    tx.objectStore(STORE_PROJECTS).put(project);
    tx.objectStore(STORE_AUDIT).put(auditEntry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));
  });
}

export async function dbLoadAllProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).getAll();
    req.onsuccess = () => resolve(req.result as Project[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbLoadProject(id: string): Promise<Project | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => resolve(req.result as Project | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const req = tx.objectStore(STORE_PROJECTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveAllProjects(projects: Project[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let pending = projects.length;
      if (pending === 0) { resolve(); return; }
      for (const p of projects) {
        const putReq = store.put(p);
        putReq.onsuccess = () => {
          pending--;
          if (pending === 0) resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      }
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

// ==========================================
// 2. TEAM MEMBERS OPERATIONS
// ==========================================

export async function dbSaveTeamMember(member: TeamMember): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEAM, 'readwrite');
    const req = tx.objectStore(STORE_TEAM).put(member);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbLoadAllTeamMembers(): Promise<TeamMember[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEAM, 'readonly');
    const req = tx.objectStore(STORE_TEAM).getAll();
    req.onsuccess = () => resolve(req.result as TeamMember[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteTeamMember(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEAM, 'readwrite');
    const req = tx.objectStore(STORE_TEAM).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveAllTeamMembers(members: TeamMember[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEAM, 'readwrite');
    const store = tx.objectStore(STORE_TEAM);
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      let pending = members.length;
      if (pending === 0) { resolve(); return; }
      for (const m of members) {
        const putReq = store.put(m);
        putReq.onsuccess = () => {
          pending--;
          if (pending === 0) resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      }
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
}

// ==========================================
// 3. TASK COMMENTS OPERATIONS
// ==========================================

export async function dbSaveComment(comment: TaskComment): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMMENTS, 'readwrite');
    const req = tx.objectStore(STORE_COMMENTS).put(comment);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbLoadTaskComments(taskId: string): Promise<TaskComment[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMMENTS, 'readonly');
    const index = tx.objectStore(STORE_COMMENTS).index('taskId');
    const req = index.getAll(taskId);
    req.onsuccess = () => resolve(req.result as TaskComment[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDeleteComment(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_COMMENTS, 'readwrite');
    const req = tx.objectStore(STORE_COMMENTS).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 4. AUDIT LOGS OPERATIONS
// ==========================================

export async function dbLogAudit(entry: AuditLogEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT, 'readwrite');
    const req = tx.objectStore(STORE_AUDIT).put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbLoadAuditLogs(projectId?: string, limit = 100): Promise<AuditLogEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT, 'readonly');
    const store = tx.objectStore(STORE_AUDIT);
    let req: IDBRequest;

    if (projectId) {
      const index = store.index('projectId');
      req = index.getAll(projectId);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => {
      const results = (req.result as AuditLogEntry[]) || [];
      // Sort newest first
      results.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
      resolve(results.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 5. MIGRATION SNAPSHOTS OPERATIONS
// ==========================================

export interface MigrationSnapshot {
  snapshotKey: string;
  timestamp: string;
  projectsPayload: any[];
  teamPayload?: any[];
}

export async function dbSaveSnapshot(snapshot: MigrationSnapshot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
    const req = tx.objectStore(STORE_SNAPSHOTS).put(snapshot);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbLoadSnapshot(snapshotKey: string): Promise<MigrationSnapshot | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
    const req = tx.objectStore(STORE_SNAPSHOTS).get(snapshotKey);
    req.onsuccess = () => resolve(req.result as MigrationSnapshot | undefined);
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// 6. META OPERATIONS
// ==========================================

export async function dbGetMeta(key: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const req = tx.objectStore(STORE_META).get(key);
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
}

export async function dbSetMeta(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    const req = tx.objectStore(STORE_META).put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbProjectCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
