import EmptyState from "../components/ui/EmptyState";
import SectionHeader from "../components/ui/SectionHeader";
import { importDraft } from "../data/mockPortfolio";

export default function ImportPage() {
  return (
    <div className="page-stack">
      <section className="page-grid page-grid--main">
        <div className="card-surface upload-panel">
          <SectionHeader
            eyebrow="Screenshot Import"
            title="上傳截圖，先進入草稿審核"
            description="正式接 Gemini 前，這裡先模擬整個匯入流程與審核體驗。"
          />

          <div className="mock-dropzone">
            <p>拖曳券商截圖到這裡，或者用手機相機直接拍。</p>
            <strong>{importDraft.imageName}</strong>
            <span>上傳時間：{importDraft.uploadedAt}</span>
          </div>

          <div className="highlight-list">
            {importDraft.highlights.map((item) => (
              <div key={item} className="highlight-item">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface">
          <SectionHeader
            eyebrow="Draft Status"
            title={importDraft.parsingStatus}
            description={`完成度：${importDraft.completion}`}
          />

          <div className="checklist">
            <div className="checklist__item">
              <strong>步驟 1</strong>
              <span>圖片已上傳，但尚未連接真實 API。</span>
            </div>
            <div className="checklist__item">
              <strong>步驟 2</strong>
              <span>AI 提取結果先以假資料顯示，之後才換成 Gemini Flash。</span>
            </div>
            <div className="checklist__item">
              <strong>步驟 3</strong>
              <span>確認無誤後才寫入 `positions`。</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface">
        <SectionHeader
          eyebrow="Draft Items"
          title="待確認資產"
          description="匯入頁的核心是把不確定的資訊留給用戶最後確認。"
        />

        <div className="draft-list">
          {importDraft.items.map((item) => (
            <article key={item.name + item.symbol} className="draft-item">
              <div>
                <h4>{item.name}</h4>
                <p>{item.symbol} · {item.type}</p>
              </div>
              <div>
                <span>數量</span>
                <strong>{item.quantity}</strong>
              </div>
              <div>
                <span>均價</span>
                <strong>{item.avgCost}</strong>
              </div>
              <span className={`pill${item.confidence === "48%" ? "" : " pill--positive"}`}>{item.confidence}</span>
            </article>
          ))}
        </div>
      </section>

      <EmptyState
        title="原始圖片暫時不落地保存"
        description="這樣可以先把隱私和安全邊界縮小，之後如果真的需要歷史追查，再考慮 Firebase Storage。"
        actionLabel="保留這個方向"
      />
    </div>
  );
}
