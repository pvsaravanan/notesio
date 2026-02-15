"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from "react"
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, googleProvider, db } from "@/lib/firebase"
import { UserProfile, DEFAULT_USER_PREFERENCES, DEFAULT_FEATURES, COLLECTIONS } from "@/lib/firestore-schema"

interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        })
        
        // Create or update user profile in Firestore
        await createOrUpdateUserProfile(firebaseUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      // User profile will be created in onAuthStateChanged
    } catch (error) {
      console.error("Error signing in with Google:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Helper function to create or update user profile
async function createOrUpdateUserProfile(firebaseUser: FirebaseUser) {
  const userRef = doc(db, COLLECTIONS.users, firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    // Create new user profile
    const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt' | 'lastLoginAt'> & {
      createdAt: any
      updatedAt: any
      lastLoginAt: any
    } = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      provider: (firebaseUser.providerData[0]?.providerId as any) || 'google.com',
      emailVerified: firebaseUser.emailVerified,
      preferences: DEFAULT_USER_PREFERENCES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      storageUsed: 0,
      noteCount: 0,
      features: DEFAULT_FEATURES,
    }

    await setDoc(userRef, newUserProfile)
  } else {
    // Update last login
    await setDoc(userRef, {
      lastLoginAt: serverTimestamp(),
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    }, { merge: true })
  }
}
