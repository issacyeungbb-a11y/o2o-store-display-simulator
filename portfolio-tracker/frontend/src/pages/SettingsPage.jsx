import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import StatCard from "../components/ui/StatCard";
import { settingsMock } from "../data/mockPortfolio";

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <section className="page-grid page-grid--stats">
        <StatCard
          label={settingsMock.identity.label}
          value={settingsMock.identity.value}
          detail={settingsMock.identity.detail}
        />
        <StatCard
          label={settingsMock.storage.label}
          value={settingsMock.storage.value}
          detail={settingsMock.storage.detail}
        />
      </section>

      <section className="page-grid page-grid--main">
        <div className="card-surface">
          <SectionHeader
            eyebrow="Safety"
            title="安全預設"
            description="即使只是假資料版，先把安全流程放進資訊架構最重要。"
          />

          <div className="stack-list">
            {settingsMock.safety.map((item) => (
              <div key={item} className="stack-list__item">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface">
          <SectionHeader
            eyebrow="Build Path"
            title="下一步落地順序"
            description="保持對新手友善，先做基礎資料流，再加 AI。"
          />

          <div className="stack-list">
            {settingsMock.nextSteps.map((item) => (
              <div key={item} className="stack-list__item">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <EmptyState
        title="匯出 / 匯入備份按鈕先留位"
        description="匿名模式最需要的是備份策略。接 Firebase 之前，這個區塊會很有價值。"
        actionLabel="設計備份流程"
      />
    </div>
  );
}
