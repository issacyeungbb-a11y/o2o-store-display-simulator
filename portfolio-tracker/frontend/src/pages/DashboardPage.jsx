import SectionHeader from "../components/ui/SectionHeader";
import StatCard from "../components/ui/StatCard";
import { dashboardSummary } from "../data/mockPortfolio";

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel card-surface">
        <p className="eyebrow">Overview</p>
        <h1>先把匿名投資組合的骨架搭好，再慢慢接上真資料。</h1>
        <p className="hero-copy">{dashboardSummary.intro}</p>

        <div className="hero-actions">
          <button className="button">新增資產</button>
          <button className="button button--ghost">查看截圖匯入</button>
        </div>
      </section>

      <section className="page-grid page-grid--stats">
        {dashboardSummary.metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="page-grid page-grid--main">
        <div className="card-surface">
          <SectionHeader
            eyebrow="Allocation"
            title="資產分布"
            description="先用簡單條形視覺化，方便之後換成真實數據或圖表元件。"
          />

          <div className="allocation-list">
            {dashboardSummary.allocation.map((item) => (
              <article key={item.label} className="allocation-row">
                <div className="allocation-row__header">
                  <strong>{item.label}</strong>
                  <span>{item.amount}</span>
                </div>
                <div className="allocation-track">
                  <span className="allocation-fill" style={{ width: `${item.value}%`, background: item.color }} />
                </div>
                <small>{item.value}% 組合比重</small>
              </article>
            ))}
          </div>
        </div>

        <div className="card-surface">
          <SectionHeader
            eyebrow="Accounts"
            title="帳戶快照"
            description="每個帳戶之後會對應 Firestore 的 `accounts` 文件。"
          />

          <div className="account-list">
            {dashboardSummary.accounts.map((account) => (
              <article key={account.name} className="account-card">
                <div className="account-card__header">
                  <div>
                    <h4>{account.name}</h4>
                    <p>{account.provider} · {account.currency}</p>
                  </div>
                  <span className="pill">{account.change}</span>
                </div>
                <strong>{account.value}</strong>
                <p>{account.holdings} 項持倉</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="card-surface">
        <SectionHeader
          eyebrow="Recent Activity"
          title="最近動作"
          description="這裡預留給之後的價格更新、匯入紀錄與 AI 分析紀錄。"
        />

        <div className="activity-list">
          {dashboardSummary.activity.map((item) => (
            <article key={item.title + item.time} className="activity-item">
              <div className="activity-dot" />
              <div>
                <h4>{item.title}</h4>
                <p>{item.detail}</p>
              </div>
              <span>{item.time}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
