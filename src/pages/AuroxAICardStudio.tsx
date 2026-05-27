import React, { useState } from "react";

// ── Design tokens ────────────────────────────────────────────────
const C = {
  bg: "#F4F2EC",
  surface: "#FFFFFF",
  ink: "#0B0B10",
  ink2: "#1A1A20",
  muted: "#7A7A82",
  hairline: "rgba(11,11,16,0.08)",
  hairline2: "rgba(11,11,16,0.05)",
  green: "#1FB874",
  greenSoft: "#E4F6EC",
  purple: "#A972FF",
  purpleDeep: "#6A3FD8",
  purpleSoft: "#F0E7FF",
  gold: "#F2C14E",
  ice: "#B7D2F4",
  pink: "#FF7DD3",
};

// ── SVG Icons ────────────────────────────────────────────────────
function Icon({
  d, size = 20, stroke = "currentColor", fill = "none", sw = 1.7, d2,
}: {
  d: string; size?: number; stroke?: string; fill?: string; sw?: number; d2?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

const IconBack    = (p: any) => <Icon {...p} d="M15 18l-6-6 6-6" />;
const IconSearch  = (p: any) => <Icon {...p} d="M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35" />;
const IconBell    = (p: any) => <Icon {...p} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />;
const IconHome    = (p: any) => <Icon {...p} d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2v-9z" />;
const IconSwap    = (p: any) => <Icon {...p} d="M7 4l-4 4 4 4M3 8h14M17 20l4-4-4-4M21 16H7" />;
const IconCard    = (p: any) => <Icon {...p} d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zm0 4h20" />;
const IconGear    = (p: any) => <Icon {...p} d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm7.5-3.5l1.8-1.4-1.5-2.6-2.2.7a7.5 7.5 0 00-1.6-1l-.5-2.3h-3l-.5 2.3a7.5 7.5 0 00-1.6 1l-2.2-.7-1.5 2.6L6.5 12l-1.8 1.4 1.5 2.6 2.2-.7a7.5 7.5 0 001.6 1l.5 2.3h3l.5-2.3a7.5 7.5 0 001.6-1l2.2.7 1.5-2.6L19.5 12z" />;
const IconEye     = (p: any) => <Icon {...p} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" d2="M12 9a3 3 0 100 6 3 3 0 000-6z" />;
const IconShield  = (p: any) => <Icon {...p} d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" d2="M9 12l2 2 4-4" />;
const IconSpark   = (p: any) => <Icon {...p} fill="currentColor" stroke="none" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zm7 9l.9 2.4L22 15l-2.1.6L19 18l-.9-2.4L16 15l2.1-.6L19 12zM5 16l.6 1.6L7 18l-1.4.4L5 20l-.6-1.6L3 18l1.4-.4L5 16z" />;
const IconWand    = (p: any) => <Icon {...p} d="M15 4l2 2-9 9-3 1 1-3 9-9zm0 0l3-3 2 2-3 3M5 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zm14 11l.7 1.4L21 18l-1.3.6L19 20l-.7-1.4L17 18l1.3-.6L19 16z" />;
const IconDollar  = (p: any) => <Icon {...p} d="M12 3v18M16 7H10a3 3 0 100 6h4a3 3 0 110 6H8" />;
const IconPlus    = (p: any) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IconGallery = (p: any) => <Icon {...p} d="M3 7v12a2 2 0 002 2h12M7 3h12a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />;
const IconArrowDn = (p: any) => <Icon {...p} d="M12 5v14m-7-7l7 7 7-7" />;

// ── Gradient coin ────────────────────────────────────────────────
function Coin({ size = 44, from, to, via, children }: { size?: number; from: string; to: string; via?: string; children?: React.ReactNode; }) {
  const grad = via
    ? `radial-gradient(circle at 30% 25%, ${from}, ${via} 55%, ${to})`
    : `linear-gradient(135deg, ${from}, ${to})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: grad,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.28), inset 0 2px 4px rgba(255,255,255,0.3), 0 6px 14px -6px rgba(11,11,16,0.4)",
      color: "#fff", flexShrink: 0,
    }}>{children}</div>
  );
}

// ── Shrink-wrap card ─────────────────────────────────────────────
function WrapCard({ variant = "black", width = "100%", height = 200, label = "Revolut", sub = "FANCY.DESIGN", tilt = 0, style = {} }: {
  variant?: "black" | "purple" | "teal" | "orange" | "ivory";
  width?: number | string; height?: number | string;
  label?: string; sub?: string; tilt?: number; style?: React.CSSProperties;
}) {
  const bases: Record<string, string> = {
    black:  "linear-gradient(180deg,#1a1a20 0%,#070709 100%)",
    purple: "linear-gradient(180deg,#3a1a55 0%,#0a0413 100%)",
    teal:   "linear-gradient(180deg,#0e3a3a 0%,#04161a 100%)",
    orange: "linear-gradient(180deg,#4a1d10 0%,#180700 100%)",
    ivory:  "linear-gradient(180deg,#f4efe6 0%,#cdc4b5 100%)",
  };
  const base = bases[variant];
  const wrapText = variant === "ivory" ? "rgba(20,18,12,0.7)" : "rgba(255,255,255,0.92)";
  const subText  = variant === "ivory" ? "rgba(20,18,12,0.45)" : "rgba(255,255,255,0.55)";

  return (
    <div style={{ width, height, borderRadius: 18, position: "relative", transform: tilt ? `rotate(${tilt}deg)` : undefined, ...style }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden",
        background: base, color: "#fff",
        boxShadow: "0 22px 50px -22px rgba(11,11,16,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>
        {label && <div style={{ position: "absolute", left: 18, top: 22, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, color: wrapText, textShadow: variant === "ivory" ? "none" : "0 1px 2px rgba(0,0,0,0.5)" }}>{label}</div>}
        {sub && <div style={{ position: "absolute", left: 18, bottom: 14, fontSize: 10, fontWeight: 700, letterSpacing: 2.2, color: subText }}>{sub}</div>}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 80% 100%, rgba(0,0,0,0.5), transparent 60%)" }} />
      </div>
      {/* Gloss layers */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 18, overflow: "hidden", pointerEvents: "none", mixBlendMode: "screen", background: "radial-gradient(60% 24% at 30% 14%, rgba(255,255,255,0.55), transparent 70%), radial-gradient(45% 18% at 75% 18%, rgba(255,255,255,0.35), transparent 70%), radial-gradient(70% 28% at 50% 96%, rgba(255,255,255,0.42), transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 18, pointerEvents: "none", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(255,255,255,0.1)" }} />
    </div>
  );
}

// ── White tile card ──────────────────────────────────────────────
function Tile({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, borderRadius: 22, padding: 14, color: C.ink, boxShadow: "0 1px 0 rgba(11,11,16,0.04), 0 14px 28px -22px rgba(11,11,16,0.18)", ...style }}>
      {children}
    </div>
  );
}

// ── Icon button ──────────────────────────────────────────────────
const iconBtnStyle: React.CSSProperties = {
  position: "relative", width: 38, height: 38, borderRadius: 999,
  background: C.surface, border: `1px solid ${C.hairline}`,
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 1px 0 rgba(11,11,16,0.04), 0 6px 12px -8px rgba(11,11,16,0.18)",
  flexShrink: 0,
};

// ── Mini bar chart ───────────────────────────────────────────────
function MiniBars({ count = 22 }: { count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 56 }}>
      {Array.from({ length: count }).map((_, i) => {
        const h = Math.round(6 + (i / (count - 1)) ** 1.8 * 50);
        return <div key={i} style={{ width: 2.5, height: h, background: C.ink, borderRadius: 1, opacity: 0.92 - (count - i) * 0.022 }} />;
      })}
    </div>
  );
}

// ── Bottom nav ───────────────────────────────────────────────────
function BottomNav({ active }: { active: "home" | "swap" | "card" | "gear" }) {
  const items = [
    { id: "home" as const, Icon: IconHome },
    { id: "swap" as const, Icon: IconSwap },
    { id: "card" as const, Icon: IconCard },
    { id: "gear" as const, Icon: IconGear },
  ];
  return (
    <div style={{
      position: "absolute", left: "50%", bottom: 22, transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 4, padding: 5,
      background: "rgba(11,11,16,0.92)", borderRadius: 999,
      border: "1px solid rgba(11,11,16,0.06)",
      boxShadow: "0 18px 40px -10px rgba(11,11,16,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
      zIndex: 60,
    }}>
      {items.map(({ id, Icon }) => {
        const isActive = id === active;
        return (
          <div key={id} style={{
            width: 48, height: 48, borderRadius: 999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isActive ? "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))" : "transparent",
            border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
          }}>
            <Icon size={20} stroke={isActive ? "#fff" : "rgba(255,255,255,0.55)"} sw={1.8} />
          </div>
        );
      })}
    </div>
  );
}

// ── Transaction row ──────────────────────────────────────────────
function TxRow({ name, sub, amount, coin }: { name: string; sub: string; amount: string; coin: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {coin}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{amount}</div>
        <div style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>Completed</div>
      </div>
    </div>
  );
}

// ── iOS status bar ───────────────────────────────────────────────
function StatusBar() {
  return (
    <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "relative", zIndex: 20 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>9:41</span>
      <div style={{ width: 120, height: 30, borderRadius: 20, background: "#000", position: "absolute", left: "50%", transform: "translateX(-50%)", top: 8 }} />
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <svg width="17" height="11" viewBox="0 0 17 12"><rect x="0" y="7.5" width="3" height="4.5" rx="0.7" fill={C.ink} /><rect x="4.5" y="5" width="3" height="7" rx="0.7" fill={C.ink} /><rect x="9" y="2.5" width="3" height="9.5" rx="0.7" fill={C.ink} /><rect x="13.5" y="0" width="3" height="12" rx="0.7" fill={C.ink} /></svg>
        <svg width="25" height="12" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={C.ink} strokeOpacity="0.35" fill="none" /><rect x="2" y="2" width="20" height="9" rx="2" fill={C.ink} /></svg>
      </div>
    </div>
  );
}

// ── Home indicator ───────────────────────────────────────────────
function HomeIndicator() {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 34, display: "flex", justifyContent: "center", alignItems: "flex-end", paddingBottom: 8, zIndex: 60, pointerEvents: "none" }}>
      <div style={{ width: 139, height: 5, borderRadius: 100, background: "rgba(0,0,0,0.25)" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 1 — DASHBOARD
// ══════════════════════════════════════════════════════════════════
function ScreenDashboard() {
  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden", color: C.ink }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 40% at 100% 0%, rgba(169,114,255,0.10), transparent 70%)", pointerEvents: "none" }} />

      <StatusBar />

      {/* Header */}
      <div style={{ padding: "6px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 999, background: "radial-gradient(circle at 30% 25%, #d7c1ff, #6a3fd8 60%, #2a0c5c)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>T</div>
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Welcome back</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Hello, Tom</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={iconBtnStyle}><IconSearch size={18} stroke={C.ink} /></div>
          <div style={{ ...iconBtnStyle }}>
            <IconBell size={18} stroke={C.ink} />
            <div style={{ position: "absolute", top: 9, right: 9, width: 7, height: 7, borderRadius: 999, background: C.green, boxShadow: `0 0 0 2px ${C.bg}` }} />
          </div>
        </div>
      </div>

      {/* Card hero */}
      <div style={{ padding: "0 20px", position: "relative" }}>
        <WrapCard label="Revolut" sub="ACTIVE · TOTAL $32,620.4" height={210} />
        {/* AI CTA */}
        <div style={{ position: "absolute", left: 32, bottom: 18, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px 8px 10px", borderRadius: 999, background: "rgba(255,255,255,0.14)", backdropFilter: "blur(14px) saturate(160%)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", fontSize: 12, fontWeight: 600, boxShadow: "0 8px 22px rgba(0,0,0,0.45)" }}>
          <IconSpark size={14} stroke={C.purple} fill={C.purple} /> Personalize with AI
        </div>
        {/* Balance */}
        <div style={{ position: "absolute", right: 32, top: 18, textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: "rgba(255,255,255,0.6)" }}>TOTAL</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, letterSpacing: -0.3, color: "#fff" }}>$32,620.4</div>
        </div>
      </div>

      {/* Tooltip */}
      <div style={{ margin: "14px 20px 0", position: "relative" }}>
        <div style={{ position: "absolute", top: -7, left: 28, width: 12, height: 12, background: "#fff", transform: "rotate(45deg)", borderRadius: 2 }} />
        <Tile style={{ padding: 12, display: "flex", alignItems: "center", gap: 10, borderTop: `2px solid ${C.purple}` }}>
          <Coin size={32} from="#d7b5ff" to="#5a26c4" via={C.purple}><IconSpark size={14} stroke="#fff" fill="#fff" /></Coin>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Your card, your style.</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1, lineHeight: 1.35 }}>Tap the card to generate a unique design using AI.</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, padding: "6px 8px" }}>Skip</div>
        </Tile>
      </div>

      {/* 3 Action tiles */}
      <div style={{ padding: "12px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { coin: <Coin from="#d7b5ff" to="#5a26c4" via={C.purple}><IconEye size={20} stroke="#fff" /></Coin>, label: "Show details" },
          { coin: <Coin from="#ffe28a" to="#c98a17" via={C.gold}><IconShield size={20} stroke="#fff" fill="#fff" sw={1.4} /></Coin>, label: "Protected" },
          { coin: <Coin from="#e6f0ff" to="#5d8ed3" via={C.ice}><IconGear size={20} stroke="#fff" /></Coin>, label: "Settings" },
        ].map(({ coin, label }) => (
          <Tile key={label} style={{ height: 110, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 14 }}>
            <div>{coin}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          </Tile>
        ))}
      </div>

      {/* Revenue tile */}
      <div style={{ padding: "10px 20px 0" }}>
        <Tile style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Coin size={32} from="#ffe28a" to="#c98a17" via={C.gold}><IconDollar size={16} stroke="#fff" sw={2} /></Coin>
              <div>
                <div style={{ fontSize: 11, color: C.muted }}>Revenue</div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1, marginTop: 2 }}>42,220</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted, textAlign: "right", marginBottom: 6, fontWeight: 600 }}>See all</div>
              <MiniBars />
            </div>
          </div>
        </Tile>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: "10px 20px 0" }}>
        <Tile style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Recent transactions</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>See all</div>
          </div>
          <TxRow name="HugeArts" sub="Money receive" amount="+$739.65" coin={<Coin size={32} from="#ff9bd1" to="#9b3ee0" via={C.pink}><IconDollar size={14} stroke="#fff" sw={2} /></Coin>} />
          <div style={{ height: 1, background: C.hairline2, margin: "10px 0" }} />
          <TxRow name="K. Filatov" sub="Money receive" amount="+$943.65" coin={<Coin size={32} from="#c1d7ff" to="#3b5fc1" via="#7b9bea"><IconArrowDn size={14} stroke="#fff" sw={2} /></Coin>} />
        </Tile>
      </div>

      <BottomNav active="home" />
      <HomeIndicator />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 2 — TRANSACTIONS · CARDS TAB
// ══════════════════════════════════════════════════════════════════
function MiniCard({ variant, name, peek = false }: { variant: "black" | "purple" | "teal" | "ivory"; name: string; peek?: boolean }) {
  return (
    <div style={{ flex: peek ? "0 0 90px" : "0 0 112px" }}>
      <div style={{ height: 72 }}><WrapCard variant={variant} label="" sub="" height="100%" /></div>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6 }}>{name}</div>
      <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>AI · 2d ago</div>
    </div>
  );
}

function ScreenCards() {
  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden", color: C.ink }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 30% at 20% 0%, rgba(169,114,255,0.10), transparent 70%)", pointerEvents: "none" }} />
      <StatusBar />

      {/* Top bar */}
      <div style={{ padding: "6px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <div style={iconBtnStyle}><IconBack size={18} stroke={C.ink} /></div>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: 16, fontWeight: 600, pointerEvents: "none" }}>Cards</div>
        <div style={iconBtnStyle}><IconPlus size={18} stroke={C.ink} /></div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "4px 20px 0", display: "flex", gap: 8 }}>
        {(["Income", "Expenses", "Savings", "Cards"] as const).map((t) => {
          const on = t === "Cards";
          return (
            <div key={t} style={{ padding: "8px 14px", borderRadius: 999, background: on ? C.ink : C.surface, color: on ? "#fff" : C.muted, fontSize: 12, fontWeight: 600, border: on ? "none" : `1px solid ${C.hairline}`, display: "inline-flex", alignItems: "center", gap: 4, boxShadow: on ? "0 6px 14px -6px rgba(11,11,16,0.4)" : "none" }}>
              {t}
              {t === "Cards" && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: C.purple, color: "#fff", fontWeight: 700, letterSpacing: 0.3 }}>NEW</span>}
            </div>
          );
        })}
      </div>

      {/* My Card Designs header */}
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>My Card Designs</div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>2 active</div>
      </div>

      {/* Primary card */}
      <div style={{ padding: "0 20px", position: "relative" }}>
        <WrapCard label="Revolut" sub="FANCY.DESIGN" height={190} />
        <div style={{ position: "absolute", top: 14, right: 34, padding: "5px 9px", borderRadius: 999, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.28)", color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IconSpark size={10} stroke={C.purple} fill={C.purple} /> AI · Liquid Black
        </div>
      </div>

      {/* CTA + icon buttons */}
      <div style={{ padding: "12px 20px 0", display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 10 }}>
        <div style={{ height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 700, boxShadow: "0 14px 24px -10px rgba(169,114,255,0.5), inset 0 1px 0 rgba(255,255,255,0.25)" }}>
          <IconWand size={16} stroke="#fff" /> Edit Design with AI
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Tile style={{ height: 60, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><IconShield size={20} stroke={C.gold} fill={C.gold} sw={1.4} /></Tile>
          <Tile style={{ height: 60, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><IconGear size={20} stroke={C.ink} /></Tile>
        </div>
      </div>

      {/* Info panel */}
      <div style={{ padding: "12px 20px 0" }}>
        <Tile style={{ padding: 14, position: "relative", overflow: "hidden", background: C.purpleSoft }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 999, background: "radial-gradient(circle, rgba(169,114,255,0.32), transparent 70%)" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, position: "relative" }}>
            <Coin size={36} from="#d7b5ff" to="#5a26c4" via={C.purple}><IconSpark size={16} stroke="#fff" fill="#fff" /></Coin>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Customize your identity</div>
              <div style={{ fontSize: 11, color: "rgba(11,11,16,0.65)", marginTop: 4, lineHeight: 1.45 }}>From minimalist art to abstract patterns — describe your vision, and AI brings it to life on your physical and digital card.</div>
            </div>
          </div>
        </Tile>
      </div>

      {/* Recent creations */}
      <div style={{ padding: "14px 0 0" }}>
        <div style={{ padding: "0 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Recent creations</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>See all</div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "0 20px", overflow: "hidden" }}>
          <MiniCard variant="purple" name="Liquid Violet" />
          <MiniCard variant="teal"   name="Deep Lagoon" />
          <MiniCard variant="ivory"  name="Pearl White" peek />
        </div>
      </div>

      <BottomNav active="swap" />
      <HomeIndicator />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SCREEN 3 — ONBOARDING · AI CARD STUDIO
// ══════════════════════════════════════════════════════════════════
function ScreenOnboarding() {
  return (
    <div style={{ width: "100%", height: "100%", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden", color: C.ink }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 45% at 50% 0%, rgba(169,114,255,0.22), transparent 65%), radial-gradient(60% 40% at 100% 80%, rgba(255,125,211,0.10), transparent 70%)", pointerEvents: "none" }} />
      <StatusBar />

      {/* Top bar */}
      <div style={{ padding: "4px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
        <div style={iconBtnStyle}><IconBack size={18} stroke={C.ink} /></div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.muted }}>STEP 1 OF 3</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, padding: "8px 4px" }}>Skip</div>
      </div>

      {/* Card stack hero */}
      <div style={{ position: "relative", height: 270, margin: "8px 0 0" }}>
        <div style={{ position: "absolute", left: 28, top: 28, width: 160, height: 210 }}>
          <WrapCard variant="black" label="Revolut" sub="OBSIDIAN" tilt={-12} height="100%" />
        </div>
        <div style={{ position: "absolute", right: 24, top: 14, width: 160, height: 210 }}>
          <WrapCard variant="teal" label="Revolut" sub="LAGOON" tilt={12} height="100%" />
        </div>
        <div style={{ position: "absolute", left: "50%", top: 50, marginLeft: -88, width: 176, height: 224 }}>
          <WrapCard variant="purple" label="Revolut" sub="FANCY.DESIGN" tilt={-2} height="100%" />
          <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 8px", borderRadius: 999, background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 9, fontWeight: 700, backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", display: "inline-flex", alignItems: "center", gap: 4, zIndex: 4 }}>
            <IconSpark size={10} stroke={C.purple} fill={C.purple} /> AI Generated
          </div>
        </div>
      </div>

      {/* Heading */}
      <div style={{ padding: "8px 24px 0", position: "relative", zIndex: 2 }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.7, lineHeight: 1.05 }}>
          Finance in{" "}
          <span style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>your hand</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45, color: C.muted }}>Your accounts, cards, and transfers — all in one place.</div>
      </div>

      {/* AI Card Studio */}
      <div style={{ padding: "14px 20px 0", position: "relative", zIndex: 2 }}>
        <Tile style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Coin size={32} from="#d7b5ff" to="#5a26c4" via={C.purple}><IconSpark size={14} stroke="#fff" fill="#fff" /></Coin>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>AI Card Studio</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Beta · unlimited generations</div>
              </div>
            </div>
            <div style={{ padding: "3px 8px", borderRadius: 999, background: C.purpleSoft, color: C.purpleDeep, fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>NEW</div>
          </div>

          {/* Input */}
          <div style={{ background: "#FAF8F4", borderRadius: 14, padding: 12, border: `1px solid ${C.hairline}` }}>
            <div style={{ fontSize: 12, lineHeight: 1.45 }}>
              Matte black with gold marble accents
              <span style={{ display: "inline-block", width: 1.5, height: 12, background: C.purple, marginLeft: 2, verticalAlign: -1 }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" as const }}>
              {(["matte black", "gold marble", "aurora", "glitch"] as const).map((chip, i) => (
                <div key={chip} style={{ padding: "4px 10px", borderRadius: 999, background: i === 0 ? C.purpleSoft : "#fff", border: i === 0 ? `1px solid rgba(169,114,255,0.4)` : `1px solid ${C.hairline}`, fontSize: 10, fontWeight: 600, color: i === 0 ? C.purpleDeep : C.ink }}>{chip}</div>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div style={{ marginTop: 10, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleDeep})`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 700, boxShadow: "0 12px 24px -8px rgba(169,114,255,0.55), inset 0 1px 0 rgba(255,255,255,0.3)" }}>
            <IconWand size={16} stroke="#fff" /> Generate Design
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: C.muted, lineHeight: 1.4, textAlign: "center" }}>Transform your card into a unique canvas. Unlimited generations, instant preview.</div>
        </Tile>
      </div>

      {/* Footer */}
      <div style={{ position: "absolute", left: 20, right: 20, bottom: 28, zIndex: 2 }}>
        <div style={{ height: 54, borderRadius: 16, background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, letterSpacing: -0.1, boxShadow: "0 16px 30px -14px rgba(11,11,16,0.45)" }}>Open account</div>
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, fontWeight: 600 }}>
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", borderBottom: `1px solid ${C.hairline}`, paddingBottom: 2 }}>
            <IconGallery size={12} stroke={C.ink} /> View gallery of AI-generated cards
          </span>
        </div>
      </div>

      <HomeIndicator />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PHONE FRAME
// ══════════════════════════════════════════════════════════════════
function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, flexShrink: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(60,50,40,0.7)", letterSpacing: 0.2 }}>{label}</div>
      <div style={{ width: 390, height: 844, borderRadius: 48, overflow: "hidden", position: "relative", boxShadow: "0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)", background: C.bg }}>
        <div style={{ position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)", width: 126, height: 37, borderRadius: 24, background: "#000", zIndex: 50 }} />
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE EXPORT
// ══════════════════════════════════════════════════════════════════
export default function AuroxAICardStudio() {
  const [active, setActive] = useState<0 | 1 | 2 | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: "#F0EEE9", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "auto" }}>
      {/* Canvas header */}
      <div style={{ padding: "32px 60px 0" }}>
        <div style={{ fontSize: 26, fontWeight: 600, color: "rgba(40,30,20,0.85)", letterSpacing: -0.4, marginBottom: 6 }}>Aurox · AI Card Studio</div>
        <div style={{ fontSize: 15, color: "rgba(60,50,40,0.6)", marginBottom: 40 }}>Three connected flows: card personalization on the dashboard, design management in transactions, and a first-run onboarding with the AI Card Studio.</div>
      </div>

      {/* Three screens */}
      <div style={{ display: "flex", gap: 60, padding: "0 60px 80px", alignItems: "flex-start", width: "max-content" }}>
        <Phone label="01 · Dashboard — Personalize CTA">
          <ScreenDashboard />
        </Phone>
        <Phone label="02 · Transactions — Cards tab">
          <ScreenCards />
        </Phone>
        <Phone label="03 · Onboarding — AI Card Studio">
          <ScreenOnboarding />
        </Phone>
      </div>
    </div>
  );
}
