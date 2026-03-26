from __future__ import annotations

import base64
import json
import logging
from datetime import datetime, timezone

from config import OPENAI_API_KEY, OPENAI_MODEL, REQUIRED_AI_DATA, SOURCE_LABELS, SUPPORTED_INPUTS
from models import AssistantConfigResponse, AssistantResponse, ChatTurn, DailyBriefResponse, PortfolioResponse, SuggestedAsset

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_assistant_config() -> AssistantConfigResponse:
    return AssistantConfigResponse(
        ai_enabled=bool(OPENAI_API_KEY and OpenAI),
        model=OPENAI_MODEL,
        supported_inputs=SUPPORTED_INPUTS,
        required_data=REQUIRED_AI_DATA,
        recommendation="建議提供 OpenAI API Key、最新持倉截圖或文字描述，以及你想分析的焦點。",
    )


def _portfolio_context(portfolio: PortfolioResponse) -> str:
    lines = [
        "目前投資組合摘要：",
        f"- 資產總數：{portfolio.totals.asset_count}",
        f"- 總市值：HKD {portfolio.totals.total_market_value_hkd:,.2f} / USD {portfolio.totals.total_market_value_usd:,.2f}",
        f"- 總盈虧：HKD {portfolio.totals.total_pnl_hkd:,.2f} / USD {portfolio.totals.total_pnl_usd:,.2f}",
        "- 來源分佈：",
    ]
    for source in portfolio.sources:
        lines.append(
            f"  - {source.label}: {source.asset_count} 項資產, HKD {source.total_market_value_hkd:,.2f}, "
            f"USD {source.total_market_value_usd:,.2f}"
        )
    lines.append("- 目前資產清單：")
    for asset in portfolio.assets:
        lines.append(
            f"  - {SOURCE_LABELS.get(asset.source, asset.source)} / {asset.account_name} / {asset.symbol} / {asset.name} / "
            f"{asset.asset_type} / 數量 {asset.quantity} / 成本 {asset.unit_cost} / 現價 {asset.price} / "
            f"貨幣 {asset.currency} / 市值 {asset.market_value:,.2f}"
        )
    return "\n".join(lines)


def _history_context(history: list[ChatTurn]) -> str:
    if not history:
        return "沒有歷史對話。"
    return "\n".join([f"{turn.role}: {turn.content}" for turn in history[-8:]])


def _suggested_asset_schema() -> dict:
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "source": {"type": "string", "enum": ["futu", "ib", "crypto", "other"]},
            "account_name": {"type": "string"},
            "symbol": {"type": "string"},
            "name": {"type": "string"},
            "asset_type": {"type": "string", "enum": ["stock", "etf", "fund", "cash", "crypto", "bond", "option", "other"]},
            "quantity": {"type": "number"},
            "unit_cost": {"type": "number"},
            "price": {"type": "number"},
            "currency": {"type": "string", "enum": ["HKD", "USD", "USDT", "JPY", "CNY", "CNH", "SGD", "AUD", "CAD", "EUR"]},
            "notes": {"type": "string"},
            "thesis": {"type": "string"},
            "confidence": {"type": "number"},
            "reason": {"type": "string"},
        },
        "required": [
            "source",
            "account_name",
            "symbol",
            "name",
            "asset_type",
            "quantity",
            "unit_cost",
            "price",
            "currency",
            "notes",
            "thesis",
            "confidence",
            "reason",
        ],
    }


def _extract_structured_lines(message: str) -> list[SuggestedAsset]:
    suggestions: list[SuggestedAsset] = []
    for raw_line in message.splitlines():
        line = raw_line.strip()
        if not line or line.count(",") < 7:
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) < 9:
            continue
        source, account_name, symbol, name, asset_type, quantity, unit_cost, price, currency = parts[:9]
        notes = parts[9] if len(parts) > 9 else ""
        try:
            suggestions.append(
                SuggestedAsset(
                    source=source if source in {"futu", "ib", "crypto", "other"} else "other",
                    account_name=account_name or "未命名帳戶",
                    symbol=symbol or "UNKNOWN",
                    name=name or symbol or "未命名資產",
                    asset_type=asset_type if asset_type in {"stock", "etf", "fund", "cash", "crypto", "bond", "option", "other"} else "other",
                    quantity=float(quantity),
                    unit_cost=float(unit_cost),
                    price=float(price),
                    currency=currency if currency in {"HKD", "USD", "USDT", "JPY", "CNY", "CNH", "SGD", "AUD", "CAD", "EUR"} else "HKD",
                    notes=notes,
                    thesis="",
                    confidence=0.74,
                    reason="根據你貼上的結構化文字自動整理。",
                )
            )
        except ValueError:
            continue
    return suggestions


def _fallback_insights(portfolio: PortfolioResponse) -> list[str]:
    if not portfolio.assets:
        return ["目前資產庫是空的，先輸入或讓 AI 協助整理持倉後，分析會更有意義。"]

    by_source = sorted(portfolio.sources, key=lambda item: item.total_market_value_hkd, reverse=True)
    largest_assets = sorted(portfolio.assets, key=lambda item: item.market_value, reverse=True)[:3]

    insights = []
    if by_source:
        top_source = by_source[0]
        insights.append(
            f"你目前最大來源是{top_source.label}，約佔總資產 HKD {top_source.total_market_value_hkd:,.0f}。"
        )
    if largest_assets:
        formatted = "、".join([f"{asset.symbol}({asset.currency} {asset.market_value:,.0f})" for asset in largest_assets])
        insights.append(f"目前最大資產集中在：{formatted}。")

    cash_assets = [asset for asset in portfolio.assets if asset.asset_type == "cash"]
    if cash_assets:
        cash_value = sum(asset.market_value for asset in cash_assets)
        insights.append(f"現金類資產合計約 {cash_assets[0].currency} {cash_value:,.0f}，可用來衡量再部署空間。")
    else:
        insights.append("目前資產庫裡沒有明確的現金倉位，建議補入現金部位方便評估流動性。")
    return insights


def ask_assistant(
    message: str,
    history: list[ChatTurn],
    portfolio: PortfolioResponse,
    image_bytes: bytes | None = None,
    image_mime_type: str | None = None,
) -> AssistantResponse:
    structured_suggestions = _extract_structured_lines(message)
    if not OPENAI_API_KEY or OpenAI is None:
        reply = (
            "我而家以本地 fallback 模式回覆。若你想 AI 直接睇截圖並自動提取資產，請提供 OpenAI API Key。"
            " 你可以直接貼結構化文字，每行格式：source, account, symbol, name, type, quantity, unit_cost, price, currency。"
        )
        if structured_suggestions:
            reply += " 我已經先根據你貼上的文字幫你整理出可匯入的資產。"
        return AssistantResponse(
            reply=reply,
            insights=_fallback_insights(portfolio),
            suggested_assets=structured_suggestions,
            mode="fallback",
            generated_at=_now_iso(),
        )

    client = OpenAI(api_key=OPENAI_API_KEY)
    prompt = "\n\n".join(
        [
            "你是一位繁體中文投資組合助理，任務是：",
            "1. 根據用戶目前資產與問題，提供務實、具體、非保證式分析。",
            "2. 如果用戶提供截圖或文字中可辨識到持倉，整理成 suggested_assets。",
            "3. 不要捏造看不到的資產；不確定時就不要加入 suggested_assets。",
            "4. 建議要具體，例如集中度、現金比例、來源分散、幣種風險、研究方向。",
            _portfolio_context(portfolio),
            f"歷史對話：\n{_history_context(history)}",
            f"用戶最新訊息：\n{message}",
        ]
    )

    user_content: list[dict] = [{"type": "input_text", "text": prompt}]
    if image_bytes and image_mime_type:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
        user_content.append(
            {
                "type": "input_image",
                "image_url": f"data:{image_mime_type};base64,{encoded}",
            }
        )

    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=[{"role": "user", "content": user_content}],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "portfolio_ai_response",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "reply": {"type": "string"},
                            "insights": {"type": "array", "items": {"type": "string"}},
                            "suggested_assets": {"type": "array", "items": _suggested_asset_schema()},
                        },
                        "required": ["reply", "insights", "suggested_assets"],
                    },
                }
            },
        )
        payload = json.loads(response.output_text)
        suggestions = [SuggestedAsset(**item) for item in payload.get("suggested_assets", [])]
        return AssistantResponse(
            reply=payload.get("reply", ""),
            insights=payload.get("insights", []),
            suggested_assets=suggestions,
            mode="openai",
            generated_at=_now_iso(),
        )
    except Exception as exc:  # pragma: no cover
        logger.exception("OpenAI assistant call failed: %s", exc)
        return AssistantResponse(
            reply="OpenAI 回覆暫時失敗，我先用本地分析頂住。請檢查 API Key、模型設定或稍後再試。",
            insights=_fallback_insights(portfolio),
            suggested_assets=structured_suggestions,
            mode="fallback",
            generated_at=_now_iso(),
        )


def generate_daily_brief(portfolio: PortfolioResponse) -> DailyBriefResponse:
    if not OPENAI_API_KEY or OpenAI is None:
        return _fallback_daily_brief(portfolio)

    client = OpenAI(api_key=OPENAI_API_KEY)
    prompt = "\n\n".join(
        [
            "你是一位繁體中文投資組合研究助理。",
            "請根據以下資產清單，輸出簡潔但具體的每日投資簡報，重點是風險、機會、今日應追蹤事項。",
            _portfolio_context(portfolio),
        ]
    )

    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            input=prompt,
            text={
                "format": {
                    "type": "json_schema",
                    "name": "portfolio_daily_brief",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "headline": {"type": "string"},
                            "summary": {"type": "string"},
                            "opportunities": {"type": "array", "items": {"type": "string"}},
                            "risks": {"type": "array", "items": {"type": "string"}},
                            "follow_ups": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["headline", "summary", "opportunities", "risks", "follow_ups"],
                    },
                }
            },
        )
        payload = json.loads(response.output_text)
        return DailyBriefResponse(
            headline=payload["headline"],
            summary=payload["summary"],
            opportunities=payload["opportunities"],
            risks=payload["risks"],
            follow_ups=payload["follow_ups"],
            mode="openai",
            generated_at=_now_iso(),
        )
    except Exception as exc:  # pragma: no cover
        logger.exception("OpenAI daily brief failed: %s", exc)
        return _fallback_daily_brief(portfolio)


def _fallback_daily_brief(portfolio: PortfolioResponse) -> DailyBriefResponse:
    source_lines = [f"{source.label}: HKD {source.total_market_value_hkd:,.0f}" for source in portfolio.sources]
    opportunities = [
        "檢查最大持倉的基本面與短期催化劑，有沒有值得加減倉的事件。",
        "比較現金比例與風險資產比例，決定今天是否需要保留更多彈性。",
    ]
    risks = [
        "留意來源是否過度集中在單一券商或單一市場。",
        "如果加密貨幣佔比偏高，今日波動可能會明顯放大整體組合變化。",
    ]
    follow_ups = [
        "把最新成交、轉倉或現金變動更新到資產庫。",
        "告訴 AI 今天最想研究的 1 至 2 個標的，系統就可以聚焦分析。",
    ]
    return DailyBriefResponse(
        headline="今日資產簡報已準備好",
        summary="；".join(source_lines) if source_lines else "目前資產庫仍然是空的，先新增資產再生成每日簡報。",
        opportunities=opportunities,
        risks=risks,
        follow_ups=follow_ups,
        mode="fallback",
        generated_at=_now_iso(),
    )
