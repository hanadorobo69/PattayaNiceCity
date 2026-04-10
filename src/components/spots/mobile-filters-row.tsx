interface MobileFiltersRowProps {
  children: React.ReactNode
  hasActive?: boolean
}

export function MobileFiltersRow({ children }: MobileFiltersRowProps) {
  return (
    <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
      {children}
    </div>
  )
}
