import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Discord from "next-auth/providers/discord"
import Facebook from "next-auth/providers/facebook"
import Reddit from "next-auth/providers/reddit"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth/password"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

// Map provider name → Profile field that stores the provider's user ID
const PROVIDER_ID_FIELD: Record<string, string> = {
  google: "googleId",
  discord: "discordId",
  facebook: "facebookId",
  reddit: "redditId",
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
    Facebook({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
    }),
    Reddit({
      clientId: process.env.AUTH_REDDIT_ID,
      clientSecret: process.env.AUTH_REDDIT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const password = credentials.password as string

        const profile = await prisma.profile.findUnique({ where: { email } })
        if (!profile || !profile.password) return null

        const valid = await verifyPassword(password, profile.password)
        if (!valid) return null

        return {
          id: profile.id,
          email: profile.email,
          name: profile.displayName || profile.username,
          image: profile.avatarUrl,
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      const provider = account?.provider
      if (!provider || provider === "credentials") return true

      const idField = PROVIDER_ID_FIELD[provider]
      if (!idField) return true

      const email = user.email
      if (!email) return false

      try {
        const existing = await prisma.profile.findUnique({ where: { email } })

        if (!existing) {
          // Create new profile for OAuth user
          const baseUsername = email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() || "user"
          let username = baseUsername
          let attempt = 0
          while (await prisma.profile.findUnique({ where: { username } })) {
            attempt++
            username = `${baseUsername}${attempt}`
          }

          await prisma.profile.create({
            data: {
              email,
              username,
              displayName: user.name || username,
              password: "",
              avatarUrl: user.image,
              [idField]: user.id,
            },
          })
        } else if (!(existing as Record<string, unknown>)[idField]) {
          // Link provider to existing account
          await prisma.profile.update({
            where: { id: existing.id },
            data: {
              [idField]: user.id,
              avatarUrl: existing.avatarUrl || user.image,
            },
          })
        }
      } catch (err) {
        console.error(`${provider} sign-in profile error:`, err)
        return false
      }
      return true
    },

    async jwt({ token, user, account }) {
      if (user) {
        const provider = account?.provider
        if (provider && provider !== "credentials" && user.email) {
          const profile = await prisma.profile.findUnique({
            where: { email: user.email },
            select: { id: true },
          })
          token.profileId = profile?.id
        } else {
          // Credentials: user.id is already the profile.id
          token.profileId = user.id
        }
      }
      return token
    },

    async session({ session, token }) {
      if (token.profileId) {
        session.user.id = token.profileId as string
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
})
