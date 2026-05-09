from decimal import Decimal, InvalidOperation


VALID_SIDES = {"BUY", "SELL"}
VALID_ORDER_TYPES = {"MARKET", "LIMIT"}


class ValidationError(ValueError):
    """Raised when CLI input is invalid."""


def normalize_symbol(symbol: str) -> str:
    value = symbol.strip().upper()
    if not value:
        raise ValidationError("Symbol is required.")
    if not value.endswith("USDT"):
        raise ValidationError("Only USDT-M futures symbols are supported, for example BTCUSDT.")
    if not value.replace("USDT", "").isalnum():
        raise ValidationError("Symbol must be alphanumeric, for example BTCUSDT.")
    return value


def normalize_side(side: str) -> str:
    value = side.strip().upper()
    if value not in VALID_SIDES:
        raise ValidationError("Side must be BUY or SELL.")
    return value


def normalize_order_type(order_type: str) -> str:
    value = order_type.strip().upper()
    if value not in VALID_ORDER_TYPES:
        raise ValidationError("Order type must be MARKET or LIMIT.")
    return value


def positive_decimal(value: str, field_name: str) -> str:
    try:
        parsed = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValidationError(f"{field_name} must be a valid number.") from exc

    if parsed <= 0:
        raise ValidationError(f"{field_name} must be greater than zero.")

    return format(parsed.normalize(), "f")


def validate_order_input(symbol: str, side: str, order_type: str, quantity: str, price: str | None) -> dict:
    normalized_type = normalize_order_type(order_type)
    normalized_price = None

    if normalized_type == "LIMIT":
        if price is None:
            raise ValidationError("Price is required for LIMIT orders.")
        normalized_price = positive_decimal(price, "Price")

    if normalized_type == "MARKET" and price is not None:
        raise ValidationError("Price must not be provided for MARKET orders.")

    return {
        "symbol": normalize_symbol(symbol),
        "side": normalize_side(side),
        "type": normalized_type,
        "quantity": positive_decimal(quantity, "Quantity"),
        "price": normalized_price,
    }

