import { NavLink, Outlet } from "react-router-dom";

const navigationItems = [
  { to: "/dashboard", label: "總覽", hint: "Dashboard" },
  { to: "/assets", label: "資產", hint: "Assets" },
  { to: "/import", label: "匯入", hint: "Import" },
  { to: "/analysis", label: "分析", hint: "AI" },
  { to: "/settings", label: "設定", hint: "Settings" },
];

function NavItems({ compact = false }) {
  return navigationItems.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        `${compact ? "mobile-nav__link" : "sidebar__link"}${isActive ? " is-active" : ""}`
      }
    >
      <span>{item.label}</span>
      {!compact ? <small>{item.hint}</small> : null}
    </NavLink>
  ));
}

export default function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Portfolio Tracker</p>
          <h1>匿名投資組合</h1>
          <p className="brand-copy">先用假資料跑通頁面、流程與手機版版面，之後再接 Firebase、Gemini 和 Vercel。</p>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          <NavItems />
        </nav>

        <div className="sidebar__footer card-surface">
          <p className="sidebar__footer-label">目前模式</p>
          <strong>Mock Data Only</strong>
          <span>不會連接真實帳戶、資料庫或 AI。</span>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Mobile First</p>
            <div className="topbar__title-row">
              <h2>個人投資組合工作台</h2>
              <span className="status-badge">Demo</span>
            </div>
          </div>

          <div className="topbar__meta">
            <div className="metric-chip">
              <span>同步模式</span>
              <strong>本地假資料</strong>
            </div>
            <div className="metric-chip">
              <span>身份</span>
              <strong>匿名訪客</strong>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Bottom navigation">
        <NavItems compact />
      </nav>
    </div>
  );
}
