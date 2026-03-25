import SectionHeader from "../components/ui/SectionHeader";
import { positions } from "../data/mockPortfolio";

const filters = ["全部", "股票", "ETF", "加密貨幣", "現金"];

export default function AssetsPage() {
  return (
    <div className="page-stack">
      <section className="card-surface">
        <SectionHeader
          eyebrow="Positions"
          title="資產清單"
          description="手機先看卡片，平板和桌面再拉成兩欄與更寬的資訊密度。"
          action={<button className="button">手動新增</button>}
        />

        <div className="filter-row">
          {filters.map((filter, index) => (
            <button key={filter} className={`filter-chip${index === 0 ? " is-active" : ""}`}>
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="position-grid">
        {positions.map((position) => (
          <article key={position.id} className="card-surface position-card">
            <div className="position-card__header">
              <div>
                <p className="eyebrow">{position.type}</p>
                <h3>{position.name}</h3>
                <p className="section-copy">{position.symbol} · {position.account}</p>
              </div>
              <span className={`pill${position.pnl.startsWith("+") ? " pill--positive" : ""}`}>{position.pnl}</span>
            </div>

            <div className="detail-grid">
              <div>
                <span>持有數量</span>
                <strong>{position.quantity}</strong>
              </div>
              <div>
                <span>平均成本</span>
                <strong>{position.avgCost}</strong>
              </div>
              <div>
                <span>最新價格</span>
                <strong>{position.lastPrice}</strong>
              </div>
              <div>
                <span>市值</span>
                <strong>{position.value}</strong>
              </div>
            </div>

            <p className="position-card__note">{position.note}</p>

            <div className="position-card__actions">
              <button className="button button--ghost">編輯</button>
              <button className="button button--ghost">更新價格</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
