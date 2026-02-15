"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Chrome, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface GoogleAuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GoogleAuthModal({ isOpen, onClose }: GoogleAuthModalProps) {
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      toast.success("Welcome to Clarify!")
      onClose()
      router.push("/notes")
    } catch (error: any) {
      console.error("Authentication error:", error)
      toast.error(error.message || "Failed to sign in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden mx-4">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div className="grid md:grid-cols-2 gap-0">
                {/* Left side - Branding */}
                <div className="hidden md:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 relative overflow-hidden">
                  {/* Decorative elements */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 90, 0],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -top-20 -left-20 w-40 h-40 bg-orange-200/30 rounded-full blur-3xl"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      rotate: [0, -90, 0],
                    }}
                    transition={{
                      duration: 15,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl"
                  />

                  <div className="relative z-10">
                    <h2 className="text-4xl font-serif italic mb-4 text-gray-900">
                      Clarify
                    </h2>
                    <p className="text-gray-700 text-center max-w-xs leading-relaxed">
                      Your personal space for ideas, notes, and inspiration. 
                      <span className="block mt-2 text-sm italic">
                        Organized. Private. Beautiful.
                      </span>
                    </p>

                    {/* Feature bullets */}
                    <div className="mt-8 space-y-3">
                      {[
                        "Rich text editing",
                        "Instant sync across devices",
                        "Secure & private",
                      ].map((feature, i) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          {feature}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side - Sign in */}
                <div className="flex flex-col justify-center p-8 md:p-12">
                  <div className="mb-8">
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                      Welcome back
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Sign in to continue to your notes
                    </p>
                  </div>

                  {/* Google Sign In Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <Chrome className="w-5 h-5 group-hover:text-orange-600 transition-colors" />
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">
                        Secure authentication
                      </span>
                    </div>
                  </div>

                  {/* Trust indicators */}
                  <div className="space-y-2 text-xs text-gray-500 text-center">
                    <p>🔒 Your data is encrypted and secure</p>
                    <p>We'll never share your information</p>
                  </div>

                  {/* Mobile branding */}
                  <div className="md:hidden mt-8 pt-8 border-t border-gray-100">
                    <p className="text-center text-sm text-gray-600 italic">
                      Simplify your mind, amplify your clarity
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
