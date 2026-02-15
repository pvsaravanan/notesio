/**
 * FIRESTORE SCHEMA - PRODUCTION READY
 * 
 * This schema is designed to be clean, precise, and adaptable for multiple purposes.
 * It follows best practices for Firestore data modeling with proper indexing and scalability.
 * 
 * COLLECTION STRUCTURE:
 * 
 * /users/{userId}
 *   - Core user profile and settings
 * 
 * /users/{userId}/notes/{noteId}
 *   - User's personal notes (subcollection for better organization and security)
 * 
 * /users/{userId}/workspaces/{workspaceId}
 *   - User's workspaces for organizing notes
 * 
 * /users/{userId}/activity/{activityId}
 *   - User activity log (optional, for analytics)
 * 
 * /shared-notes/{shareId}
 *   - Publicly shared notes (future feature)
 */

import { Timestamp, FieldValue } from "firebase/firestore"

// ==================== USER PROFILE ====================

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  
  // Auth metadata
  provider: 'google.com' | 'email' | 'anonymous'
  emailVerified: boolean
  
  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'system'
    defaultWorkspace: string | null
    editorFontSize: number
    editorFontFamily: string
  }
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt: Timestamp
  
  // Storage & limits
  storageUsed: number // bytes
  noteCount: number
  
  // Feature flags (for gradual rollouts)
  features: {
    betaAccess: boolean
    aiAssistant: boolean
  }
}

// ==================== NOTE DOCUMENT ====================

export interface Note {
  id: string
  userId: string
  
  // Content
  title: string
  content: string // TipTap JSON or HTML
  contentPlainText: string // For search indexing
  
  // Organization
  workspaceId: string | null
  tags: string[]
  color: string | null // Hex color for note card
  isPinned: boolean
  isArchived: boolean
  isFavorite: boolean
  
  // Collaboration (future)
  isShared: boolean
  shareId: string | null
  permissions: {
    publicRead: boolean
    publicWrite: boolean
    allowedUsers: string[] // Array of UIDs
  }
  
  // Metadata
  wordCount: number
  readingTime: number // minutes
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
  lastViewedAt: Timestamp
  
  // Version control (future)
  version: number
  
  // Search optimization
  searchKeywords: string[] // Auto-generated from title and content
}

// ==================== WORKSPACE ====================

export interface Workspace {
  id: string
  userId: string
  
  // Basic info
  name: string
  description: string
  icon: string | null // emoji or icon identifier
  color: string | null
  
  // Organization
  noteCount: number
  isDefault: boolean
  order: number
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==================== ACTIVITY LOG ====================

export interface ActivityLog {
  id: string
  userId: string
  
  // Activity details
  action: 'note_created' | 'note_updated' | 'note_deleted' | 'note_shared' | 'workspace_created' | 'login'
  resourceType: 'note' | 'workspace' | 'user'
  resourceId: string | null
  
  // Metadata
  metadata: Record<string, any>
  
  // Timestamp
  timestamp: Timestamp
  
  // Device info (optional)
  userAgent: string | null
  ipAddress: string | null
}

// ==================== SHARED NOTE (PUBLIC) ====================

export interface SharedNote {
  id: string // shareId
  noteId: string
  userId: string
  
  // Content snapshot (denormalized for performance)
  title: string
  content: string
  
  // Access control
  isPublic: boolean
  password: string | null // hashed
  expiresAt: Timestamp | null
  viewCount: number
  
  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==================== TYPE GUARDS ====================

export const isUserProfile = (data: any): data is UserProfile => {
  return data && typeof data.uid === 'string' && typeof data.email === 'string'
}

export const isNote = (data: any): data is Note => {
  return data && typeof data.id === 'string' && typeof data.title === 'string'
}

// ==================== HELPER TYPES ====================

export type NoteCreateInput = Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastViewedAt' | 'version'>
export type NoteUpdateInput = Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>

export type WorkspaceCreateInput = Omit<Workspace, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'noteCount'>
export type WorkspaceUpdateInput = Partial<Omit<Workspace, 'id' | 'userId' | 'createdAt'>>

// ==================== FIRESTORE PATHS ====================

export const COLLECTIONS = {
  users: 'users',
  notes: (userId: string) => `users/${userId}/notes`,
  workspaces: (userId: string) => `users/${userId}/workspaces`,
  activity: (userId: string) => `users/${userId}/activity`,
  sharedNotes: 'shared-notes',
} as const

// ==================== DEFAULT VALUES ====================

export const DEFAULT_USER_PREFERENCES = {
  theme: 'system' as const,
  defaultWorkspace: null,
  editorFontSize: 16,
  editorFontFamily: 'Inter',
}

export const DEFAULT_NOTE_PERMISSIONS = {
  publicRead: false,
  publicWrite: false,
  allowedUsers: [],
}

export const DEFAULT_FEATURES = {
  betaAccess: false,
  aiAssistant: false,
}

// ==================== INDEXES NEEDED (Firestore Console) ====================
/*
REQUIRED COMPOSITE INDEXES:

1. Notes - List by user with filters:
   Collection: users/{userId}/notes
   Fields: userId (Ascending), updatedAt (Descending)
   
2. Notes - Search by workspace:
   Collection: users/{userId}/notes
   Fields: workspaceId (Ascending), updatedAt (Descending)
   
3. Notes - Pinned first:
   Collection: users/{userId}/notes
   Fields: isPinned (Descending), updatedAt (Descending)
   
4. Notes - Search with tags:
   Collection: users/{userId}/notes
   Fields: tags (Array-contains), updatedAt (Descending)

5. Activity - User timeline:
   Collection: users/{userId}/activity
   Fields: userId (Ascending), timestamp (Descending)
*/
