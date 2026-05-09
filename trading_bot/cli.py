import argparse
import sys

from bot.client import BinanceAPIError, BinanceFuturesClient, BinanceNetworkError
from bot.logging_config import configure_logging
from bot.orders import OrderService, extract_order_summary
from bot.validators import ValidationError, validate_order_input


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Place Binance Futures Testnet USDT-M orders."
    )
    parser.add_argument("--symbol", required=True, help="Trading symbol, for example BTCUSDT")
    parser.add_argument("--side", required=True, help="BUY or SELL")
    parser.add_argument("--type", required=True, help="MARKET or LIMIT")
    parser.add_argument("--quantity", required=True, help="Order quantity, for example 0.001")
    parser.add_argument("--price", required=False, help="Required for LIMIT orders")
    parser.add_argument("--dry-run", action="store_true", help="Validate and log without sending order")
    return parser


def print_request_summary(order: dict, dry_run: bool) -> None:
    print("\nOrder Request Summary")
    print("---------------------")
    print(f"Symbol     : {order['symbol']}")
    print(f"Side       : {order['side']}")
    print(f"Type       : {order['type']}")
    print(f"Quantity   : {order['quantity']}")
    print(f"Price      : {order['price'] or '-'}")
    print(f"Dry run    : {'YES' if dry_run else 'NO'}")


def print_response_summary(response: dict) -> None:
    summary = extract_order_summary(response)
    print("\nOrder Response Details")
    print("----------------------")
    print(f"Order ID    : {summary['orderId']}")
    print(f"Status      : {summary['status']}")
    print(f"Executed Qty: {summary['executedQty']}")
    print(f"Avg Price   : {summary['avgPrice']}")


def main() -> int:
    logger = configure_logging()
    parser = build_parser()
    args = parser.parse_args()

    try:
        order = validate_order_input(
            symbol=args.symbol,
            side=args.side,
            order_type=args.type,
            quantity=args.quantity,
            price=args.price,
        )

        print_request_summary(order, args.dry_run)

        client = BinanceFuturesClient(logger=logger)
        service = OrderService(client=client, logger=logger)
        response = service.place(order, dry_run=args.dry_run)

        print_response_summary(response)
        print("\nSUCCESS: Order processed successfully." if not args.dry_run else "\nSUCCESS: Dry-run order validated successfully.")
        return 0

    except ValidationError as exc:
        logger.error("Validation error | error=%s", exc)
        print(f"\nFAILURE: Invalid input: {exc}")
        return 2
    except BinanceAPIError as exc:
        logger.error("Binance API error | error=%s", exc)
        print(f"\nFAILURE: Binance API error: {exc}")
        return 3
    except BinanceNetworkError as exc:
        logger.error("Network error | error=%s", exc)
        print(f"\nFAILURE: Network error: {exc}")
        return 4
    except Exception as exc:
        logger.exception("Unexpected error")
        print(f"\nFAILURE: Unexpected error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

