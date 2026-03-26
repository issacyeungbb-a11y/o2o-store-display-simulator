from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SourceType = Literal["futu", "ib", "crypto", "other"]
AssetType = Literal["stock", "etf", "fund", "cash", "crypto", "bond", "option", "other"]
CurrencyType = Literal["HKD", "USD", "USDT", "JPY", "CNY", "CNH", "SGD", "AUD", "CAD", "EUR"]


class AssetDraft(BaseModel):
    source: SourceType
    account_name: str = Field(min_length=1, max_length=120)
    symbol: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=120)
    asset_type: AssetType
    quantity: float = Field(ge=0)
    unit_cost: float = Field(ge=0)
    price: float = Field(ge=0)
    currency: CurrencyType
    notes: str = Field(default="", max_length=800)
    thesis: str = Field(default="", max_length=800)


class AssetCreate(AssetDraft):
    pass


class Asset(AssetDraft):
    id: str
    market_value: float
    cost_basis: float
    pnl: float
    pnl_pct: float
    updated_at: str


class PortfolioTotals(BaseModel):
    asset_count: int
    total_market_value_hkd: float
    total_market_value_usd: float
    total_cost_hkd: float
    total_cost_usd: float
    total_pnl_hkd: float
    total_pnl_usd: float


class SourceSummary(PortfolioTotals):
    source: SourceType
    label: str
    account_count: int


class AccountSummary(PortfolioTotals):
    source: SourceType
    label: str
    account_name: str


class PortfolioResponse(BaseModel):
    assets: list[Asset]
    sources: list[SourceSummary]
    accounts: list[AccountSummary]
    totals: PortfolioTotals
    generated_at: str


class AssistantConfigResponse(BaseModel):
    ai_enabled: bool
    model: str
    supported_inputs: list[str]
    required_data: list[str]
    recommendation: str


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class SuggestedAsset(AssetDraft):
    confidence: float = Field(default=0, ge=0, le=1)
    reason: str = Field(default="", max_length=400)


class AssistantResponse(BaseModel):
    reply: str
    insights: list[str]
    suggested_assets: list[SuggestedAsset]
    mode: Literal["openai", "fallback"]
    generated_at: str


class DailyBriefResponse(BaseModel):
    headline: str
    summary: str
    opportunities: list[str]
    risks: list[str]
    follow_ups: list[str]
    mode: Literal["openai", "fallback"]
    generated_at: str


class DeleteResponse(BaseModel):
    status: Literal["ok"]
    deleted_id: str
