import SectionHeader from "../components/ui/SectionHeader";
import StatCard from "../components/ui/StatCard";
import { analysisMock } from "../data/mockPortfolio";

export default function AnalysisPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel card-surface">
        <p className="eyebrow">AI Analysis</p>
        <h1>先預留分析工作流，再把模型按成本與能力分層接上。</h1>
        <p className="hero-copy">{analysisMock.headline}</p>

        <div className="hero-actions">
          <button className="button">分析整體組合</button>
          <button className="button button--ghost">分析單一持倉</button>
        </div>
      </section>

      <section className="page-grid page-grid--stats">
        <StatCard
          label="組合健康分"
          value={analysisMock.score}
          delta={`最近更新：${analysisMock.lastGeneratedAt}`}
          detail="這裡之後會來自 Gemini 強模型的結構化輸出。"
          tone="neutral"
        />
      </section>

      <section className="insight-grid">
        {analysisMock.cards.map((card) => (
          <article key={card.title} className={`card-surface insight-card tone-${card.tone}`}>
            <p className="eyebrow">Insight</p>
            <h3>{card.title}</h3>
            <p className="section-copy">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="card-surface">
        <SectionHeader
          eyebrow="Prompt Seeds"
          title="建議分析問題"
          description="正式接 AI 後，這些問題可以成為快速按鈕。"
        />

        <div className="prompt-list">
          {analysisMock.prompts.map((prompt) => (
            <button key={prompt} className="prompt-card">
              {prompt}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
