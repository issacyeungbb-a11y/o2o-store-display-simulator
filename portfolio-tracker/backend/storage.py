from __future__ import annotations

import json
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from config import DATA_FILE, SOURCE_LABELS, USD_PER_CURRENCY
from models import AccountSummary, Asset, AssetCreate, PortfolioResponse, PortfolioTotals, SourceSummary, SuggestedAsset

_LOCK = Lock()

SEED_ASSETS = [
    {
        "id": "seed-futu-700",
        "source": "futu",
        "account_name": "富途 保證金綜合",
        "symbol": "HK.00700",
        "name": "騰訊控股",
        "asset_type": "stock",
        "quantity": 200,
        "unit_cost": 318.0,
        "price": 368.0,
        "currency": "HKD",
        "notes": "示範資產，可隨時刪除。",
        "thesis": "作為港股核心科技權重示範。",
        "updated_at": "2026-03-16T00:00:00+00:00",
    },
    {
        "id": "seed-futu-cash",
        "source": "futu",
        "account_name": "富途 現金綜合",
        "symbol": "CASH.HKD",
        "name": "港幣現金",
        "asset_type": "cash",
        "quantity": 85000,
        "unit_cost": 1,
        "price": 1,
        "currency": "HKD",
        "notes": "現金倉位示範。",
        "thesis": "保留流動性等待部署。",
        "updated_at": "2026-03-16T00:00:00+00:00",
    },
    {
        "id": "seed-ib-nvda",
        "source": "ib",
        "account_name": "IB 主賬戶",
        "symbol": "NVDA",
        "name": "NVIDIA",
        "asset_type": "stock",
        "quantity": 35,
        "unit_cost": 102.0,
        "price": 118.0,
        "currency": "USD",
        "notes": "美股示範持倉。",
        "thesis": "AI 基礎設施受惠股。",
        "updated_at": "2026-03-16T00:00:00+00:00",
    },
    {
        "id": "seed-ib-cash",
        "source": "ib",
        "account_name": "IB 主賬戶",
        "symbol": "CASH.USD",
        "name": "美元現金",
        "asset_type": "cash",
        "quantity": 12000,
        "unit_cost": 1,
        "price": 1,
        "currency": "USD",
        "notes": "美元現金部位。",
        "thesis": "方便等待美股機會。",
        "updated_at": "2026-03-16T00:00:00+00:00",
    },
    {
        "id": "seed-crypto-btc",
        "source": "crypto",
        "account_name": "Ledger 冷錢包",
        "symbol": "BTC",
        "name": "Bitcoin",
        "asset_type": "crypto",
        "quantity": 0.35,
        "unit_cost": 58200,
        "price": 69800,
        "currency": "USD",
        "notes": "長線配置示範。",
        "thesis": "視作數碼黃金倉位。",
        "updated_at": "2026-03-16T00:00:00+00:00",
    },
    {
        "id": "seed-crypto-eth",
        "source": "crypto",
        "account_name": "交易所 現貨",
        "symbol": "ETH",
        "name": "Ethereum",
        "asset_type": "crypto",
        "quantity": 4.5,
        "unit_cost": 2950,
        "price": 3320,
        "currency": "USD",
        "notes": "加密倉位示範。",
        "thesis": "以生態活躍度與質押收益為主。",
        "updated_at": "2026-03-16T00:00:00+00:00",
    },
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _convert_amount(value: float, from_currency: str, to_currency: str) -> float:
    if from_currency == to_currency:
        return value

    from_rate = USD_PER_CURRENCY.get(from_currency, 1.0)
    to_rate = USD_PER_CURRENCY.get(to_currency, 1.0)
    usd_value = value * from_rate
    return usd_value / to_rate


def _ensure_store() -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not DATA_FILE.exists():
        DATA_FILE.write_text(json.dumps({"assets": SEED_ASSETS}, ensure_ascii=False, indent=2))


def _load_raw_assets() -> list[dict]:
    _ensure_store()
    payload = json.loads(DATA_FILE.read_text())
    return payload.get("assets", [])


def _save_raw_assets(assets: list[dict]) -> None:
    _ensure_store()
    DATA_FILE.write_text(json.dumps({"assets": assets}, ensure_ascii=False, indent=2))


def _materialize_asset(record: dict) -> Asset:
    quantity = float(record.get("quantity", 0))
    unit_cost = float(record.get("unit_cost", 0))
    price = float(record.get("price", 0))
    market_value = quantity * price
    cost_basis = quantity * unit_cost
    pnl = market_value - cost_basis
    pnl_pct = (pnl / cost_basis * 100) if cost_basis else 0

    return Asset(
        id=record["id"],
        source=record["source"],
        account_name=record["account_name"],
        symbol=record["symbol"],
        name=record["name"],
        asset_type=record["asset_type"],
        quantity=quantity,
        unit_cost=unit_cost,
        price=price,
        currency=record["currency"],
        notes=record.get("notes", ""),
        thesis=record.get("thesis", ""),
        market_value=market_value,
        cost_basis=cost_basis,
        pnl=pnl,
        pnl_pct=pnl_pct,
        updated_at=record.get("updated_at", _now_iso()),
    )


def _build_totals(assets: list[Asset]) -> PortfolioTotals:
    total_market_value_hkd = sum(_convert_amount(asset.market_value, asset.currency, "HKD") for asset in assets)
    total_market_value_usd = sum(_convert_amount(asset.market_value, asset.currency, "USD") for asset in assets)
    total_cost_hkd = sum(_convert_amount(asset.cost_basis, asset.currency, "HKD") for asset in assets)
    total_cost_usd = sum(_convert_amount(asset.cost_basis, asset.currency, "USD") for asset in assets)
    total_pnl_hkd = total_market_value_hkd - total_cost_hkd
    total_pnl_usd = total_market_value_usd - total_cost_usd

    return PortfolioTotals(
        asset_count=len(assets),
        total_market_value_hkd=round(total_market_value_hkd, 2),
        total_market_value_usd=round(total_market_value_usd, 2),
        total_cost_hkd=round(total_cost_hkd, 2),
        total_cost_usd=round(total_cost_usd, 2),
        total_pnl_hkd=round(total_pnl_hkd, 2),
        total_pnl_usd=round(total_pnl_usd, 2),
    )


def load_assets() -> list[Asset]:
    with _LOCK:
        return [_materialize_asset(record) for record in _load_raw_assets()]


def load_portfolio() -> PortfolioResponse:
    assets = load_assets()
    sources: list[SourceSummary] = []
    accounts: list[AccountSummary] = []

    source_groups: dict[str, list[Asset]] = {}
    account_groups: dict[tuple[str, str], list[Asset]] = {}

    for asset in assets:
        source_groups.setdefault(asset.source, []).append(asset)
        account_groups.setdefault((asset.source, asset.account_name), []).append(asset)

    for source_key, grouped_assets in sorted(source_groups.items(), key=lambda item: item[0]):
        totals = _build_totals(grouped_assets)
        account_count = len({asset.account_name for asset in grouped_assets})
        sources.append(
            SourceSummary(
                source=source_key,
                label=SOURCE_LABELS.get(source_key, source_key),
                account_count=account_count,
                **totals.model_dump(),
            )
        )

    for (source_key, account_name), grouped_assets in sorted(account_groups.items(), key=lambda item: (item[0][0], item[0][1])):
        totals = _build_totals(grouped_assets)
        accounts.append(
            AccountSummary(
                source=source_key,
                label=SOURCE_LABELS.get(source_key, source_key),
                account_name=account_name,
                **totals.model_dump(),
            )
        )

    return PortfolioResponse(
        assets=assets,
        sources=sources,
        accounts=accounts,
        totals=_build_totals(assets),
        generated_at=_now_iso(),
    )


def create_asset(payload: AssetCreate) -> Asset:
    with _LOCK:
        raw_assets = _load_raw_assets()
        record = payload.model_dump()
        record["id"] = f"asset-{uuid4().hex[:12]}"
        record["updated_at"] = _now_iso()
        raw_assets.append(record)
        _save_raw_assets(raw_assets)
        return _materialize_asset(record)


def bulk_create_assets(items: list[AssetCreate | SuggestedAsset]) -> list[Asset]:
    created: list[Asset] = []
    with _LOCK:
        raw_assets = _load_raw_assets()
        for item in items:
            record = item.model_dump(exclude={"confidence", "reason"})
            record["id"] = f"asset-{uuid4().hex[:12]}"
            record["updated_at"] = _now_iso()
            raw_assets.append(record)
            created.append(_materialize_asset(record))
        _save_raw_assets(raw_assets)
    return created


def delete_asset(asset_id: str) -> bool:
    with _LOCK:
        raw_assets = _load_raw_assets()
        filtered = [asset for asset in raw_assets if asset.get("id") != asset_id]
        if len(filtered) == len(raw_assets):
            return False
        _save_raw_assets(filtered)
        return True
