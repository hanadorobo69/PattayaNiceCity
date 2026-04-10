"use client"

import { useState, useTransition } from "react"
import { adminDeleteUser, getUsers } from "@/actions/admin"
import { Search, Trash2, Crown, BadgeCheck, FileText, MessageSquare } from "lucide-react"
import { formatRelativeDate } from "@/lib/utils"

interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  isAdmin: boolean
  isVerified: boolean
  nationality: string | null
  createdAt: string
  _count: { posts: number; comments: number }
}

interface AdminUserListProps {
  users: User[]
  currentUserId: string
}

export function AdminUserList({ users: initialUsers, currentUserId }: AdminUserListProps) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState("")
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = search
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.displayName?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : users

  function handleDelete(userId: string) {
    setError(null)
    startTransition(async () => {
      const result = await adminDeleteUser(userId)
      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        setConfirmId(null)
      } else {
        setError(result.error || "Failed to delete user")
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username, email, or name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ background: "var(--input)", border: "1px solid var(--border)" }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} users</p>

      {error && (
        <div className="bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] text-destructive text-sm rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        {filtered.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border satine-border bg-card p-4 flex items-center gap-4"
          >
            {/* Avatar */}
            <div className="h-10 w-10 rounded-full bg-[rgba(232,168,64,0.10)] flex items-center justify-center shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{user.displayName || user.username}</span>
                {user.isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-400">
                    <Crown className="h-3 w-3" /> Admin
                  </span>
                )}
                {user.isVerified && !user.isAdmin && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary">
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">@{user.username} · {user.email}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {user._count.posts} posts
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {user._count.comments} comments
                </span>
                <span>Joined {formatRelativeDate(new Date(user.createdAt), "en")}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="shrink-0">
              {user.id !== currentUserId && !user.isAdmin && (
                <>
                  {confirmId === user.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {isPending ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => { setConfirmId(null); setError(null) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border satine-border hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(user.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-[rgba(239,68,68,0.10)] transition-colors cursor-pointer"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
