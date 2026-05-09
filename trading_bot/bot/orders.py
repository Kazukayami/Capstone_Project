from typing import Any

from bot.client import BinanceFuturesClient


class OrderService:
    def __init__(self, client: BinanceFuturesClient, logger=None):
        self.client = client
        self.logger = logger

    def place(self, order: dict[str, Any], dry_run: bool = False) -> dict[str, Any]:
        if self.logger:
            self.logger.info("Order request summary | dry_run=%s order=%s", dry_run, order)

        if dry_run:
            response = {
                "dryRun": True,
                "orderId": "DRY-RUN",
                "status": "VALIDATED",
                "executedQty": "0",
                "avgPrice": "0",
                "request": order,
            }
            if self.logger:
                self.logger.info("Dry-run order response | response=%s", response)
            return response

        return self.client.place_order(order)


def extract_order_summary(response: dict[str, Any]) -> dict[str, Any]:
    return {
        "orderId": response.get("orderId", "-"),
        "status": response.get("status", "-"),
        "executedQty": response.get("executedQty", "-"),
        "avgPrice": response.get("avgPrice") or response.get("averagePrice") or "-",
    }

