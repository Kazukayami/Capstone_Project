import hashlib
import hmac
import os
import time
from typing import Any
from urllib.parse import urlencode

import requests

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv() -> bool:
        return False


class BinanceAPIError(Exception):
    """Raised when Binance returns an API error."""


class BinanceNetworkError(Exception):
    """Raised when a network request fails."""


class BinanceFuturesClient:
    def __init__(self, api_key: str | None = None, api_secret: str | None = None, base_url: str | None = None, logger=None):
        load_dotenv()
        self.api_key = api_key or os.getenv("BINANCE_TESTNET_API_KEY", "")
        self.api_secret = api_secret or os.getenv("BINANCE_TESTNET_API_SECRET", "")
        self.base_url = (base_url or os.getenv("BINANCE_TESTNET_BASE_URL") or "https://testnet.binancefuture.com").rstrip("/")
        self.logger = logger
        self.session = requests.Session()

        if self.api_key:
            self.session.headers.update({"X-MBX-APIKEY": self.api_key})

    def validate_credentials(self) -> None:
        if not self.api_key or not self.api_secret:
            raise BinanceAPIError("Missing Binance API credentials. Add them to .env or environment variables.")

    def _sign(self, params: dict[str, Any]) -> str:
        query = urlencode(params, doseq=True)
        return hmac.new(
            self.api_secret.encode("utf-8"),
            query.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _request(self, method: str, path: str, params: dict[str, Any] | None = None, signed: bool = False) -> dict:
        params = params or {}

        if signed:
            self.validate_credentials()
            params["timestamp"] = int(time.time() * 1000)
            params.setdefault("recvWindow", 5000)
            params["signature"] = self._sign(params)

        url = f"{self.base_url}{path}"
        safe_params = {key: value for key, value in params.items() if key != "signature"}

        if self.logger:
            self.logger.info("API request | method=%s path=%s params=%s", method, path, safe_params)

        try:
            response = self.session.request(method=method, url=url, params=params, timeout=15)
        except requests.RequestException as exc:
            if self.logger:
                self.logger.exception("Network failure | method=%s path=%s", method, path)
            raise BinanceNetworkError(f"Network request failed: {exc}") from exc

        try:
            payload = response.json()
        except ValueError:
            payload = {"raw": response.text}

        if self.logger:
            self.logger.info("API response | status_code=%s payload=%s", response.status_code, payload)

        if response.status_code >= 400:
            message = payload.get("msg") if isinstance(payload, dict) else response.text
            raise BinanceAPIError(f"Binance API error {response.status_code}: {message}")

        return payload

    def ping(self) -> dict:
        return self._request("GET", "/fapi/v1/ping")

    def place_order(self, order: dict[str, Any]) -> dict:
        params = {
            "symbol": order["symbol"],
            "side": order["side"],
            "type": order["type"],
            "quantity": order["quantity"],
        }

        if order["type"] == "LIMIT":
            params["price"] = order["price"]
            params["timeInForce"] = "GTC"

        return self._request("POST", "/fapi/v1/order", params=params, signed=True)
