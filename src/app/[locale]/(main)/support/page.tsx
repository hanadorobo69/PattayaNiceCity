import type { Metadata } from "next"
import { ShoppingBag, Heart, Shirt, Coffee } from "lucide-react"

export const metadata: Metadata = {
  title: "Support Us - Pattaya Nice City",
}

const MERCH_ITEMS = [
  {
    id: 1,
    name: "Nice City Classic Tee",
    description: "Black t-shirt with the iconic PVC gradient logo",
    price: "฿890",
    image: null,
    badge: "Best Seller",
  },
  {
    id: 2,
    name: "Neon Nights Tee",
    description: "Glow-in-the-dark Pattaya skyline print",
    price: "฿990",
    image: null,
    badge: "New",
  },
  {
    id: 3,
    name: "Nice City Hoodie",
    description: "Premium hoodie with embroidered logo",
    price: "฿1,490",
    image: null,
    badge: null,
  },
  {
    id: 4,
    name: "PVC Snapback Cap",
    description: "Adjustable cap with neon gradient embroidery",
    price: "฿690",
    image: null,
    badge: null,
  },
  {
    id: 5,
    name: "Walking Street Tank Top",
    description: "Lightweight tank with Walking Street graphic",
    price: "฿690",
    image: null,
    badge: "Limited",
  },
  {
    id: 6,
    name: "Nice City Sticker Pack",
    description: "6 premium vinyl stickers, waterproof",
    price: "฿290",
    image: null,
    badge: null,
  },
]

export default function SupportPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10 py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(232,168,64,0.3)] bg-[rgba(232,168,64,0.06)]">
          <Heart className="h-4 w-4 text-[#e8a840]" />
          <span className="text-sm font-medium text-[#e8a840]">Support the community</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#e8a840] via-[#e07850] to-[#3db8a0] bg-clip-text text-transparent">
            Support Us
          </span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Rep the Nice City lifestyle. Every purchase helps us keep the community alive and the content flowing.
        </p>
      </div>

      {/* Merch Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {MERCH_ITEMS.map((item) => (
          <div
            key={item.id}
            className="group rounded-2xl border border-[rgba(232,168,64,0.2)] bg-[rgba(36,28,20,0.5)] overflow-hidden hover:border-[rgba(232,168,64,0.4)] transition-all hover:shadow-[0_0_30px_rgba(232,168,64,0.1)]"
          >
            {/* Image placeholder */}
            <div className="aspect-square bg-gradient-to-br from-[rgba(232,168,64,0.08)] via-[rgba(224,120,80,0.08)] to-[rgba(61,184,160,0.08)] flex items-center justify-center relative">
              <Shirt className="h-20 w-20 text-[rgba(232,168,64,0.2)] group-hover:text-[rgba(232,168,64,0.35)] transition-colors" />
              {item.badge && (
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white shadow-[0_0_12px_rgba(232,168,64,0.4)]">
                  {item.badge}
                </span>
              )}
            </div>
            {/* Info */}
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground group-hover:text-[#e8a840] transition-colors">
                {item.name}
              </h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-bold bg-gradient-to-r from-[#e8a840] to-[#3db8a0] bg-clip-text text-transparent">
                  {item.price}
                </span>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#e8a840] to-[#e07850] text-white hover:shadow-[0_0_15px_rgba(232,168,64,0.3)] transition-all cursor-pointer">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Support section */}
      <div className="rounded-2xl border border-[rgba(232,168,64,0.2)] bg-[rgba(36,28,20,0.5)] p-8 text-center space-y-4">
        <Coffee className="h-10 w-10 text-[#ff9f43] mx-auto" />
        <h2 className="text-xl font-bold font-[family-name:var(--font-orbitron)]">
          <span className="bg-gradient-to-r from-[#ff9f43] to-[#e8a840] bg-clip-text text-transparent">
            Buy Us a Beer
          </span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Not into merch? You can still support Pattaya Nice City by buying us a cold one. Every contribution keeps the servers running and the vibes going.
        </p>
        <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#ff9f43] to-[#e8a840] text-white hover:shadow-[0_0_20px_rgba(255,159,67,0.3)] transition-all cursor-pointer">
          <Coffee className="h-4 w-4" />
          Coming Soon
        </button>
      </div>
    </div>
  )
}
