import { Shield } from "lucide-react"

export function AdminBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] shadow-[0_0_8px_rgba(232,168,64,0.30)] ${className}`}
      title="Admin"
    >
      <Shield className="h-2.5 w-2.5" />
      <span>Admin</span>
    </span>
  );
}
