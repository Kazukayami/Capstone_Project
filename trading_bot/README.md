# Simplified Binance Futures Testnet Trading Bot

Small Python CLI app for placing USDT-M Futures orders on Binance Futures Testnet.

Base URL used by the app:

```text
https://testnet.binancefuture.com
```

## Features

- Places `MARKET` and `LIMIT` orders.
- Supports `BUY` and `SELL`.
- Validates CLI input before sending requests.
- Uses signed Binance Futures REST requests.
- Logs API requests, responses, and errors to `logs/trading_bot.log`.
- Includes dry-run mode for safe testing without sending an order.

## Project Structure

```text
trading_bot/
  bot/
    __init__.py
    client.py
    logging_config.py
    orders.py
    validators.py
  logs/
    sample_limit_order.log
    sample_market_order.log
  cli.py
  README.md
  requirements.txt
  .env.example
```

## Setup

1. Create and activate a Binance Futures Testnet account.
2. Generate testnet API key and secret.
3. Open this folder in VS Code:

```powershell
cd C:\Users\NISHCHAY\Documents\Codex\2026-05-09\what-is-a-capstone-project-a\trading_bot
```

4. Create a virtual environment:

```powershell
python -m venv .venv
```

5. Activate it:

```powershell
.venv\Scripts\activate
```

If PowerShell blocks activation, run this instead:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

6. Install dependencies:

```powershell
pip install -r requirements.txt
```

7. Create your environment file:

```powershell
copy .env.example .env
```

8. Edit `.env` and add your real Binance Futures Testnet credentials:

```text
BINANCE_TESTNET_API_KEY=your_api_key_here
BINANCE_TESTNET_API_SECRET=your_api_secret_here
```

## Run Examples

### Dry-run MARKET order

This validates input and logs the request without sending it to Binance.

```powershell
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001 --dry-run
```

### Real MARKET order

```powershell
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001
```

### Dry-run LIMIT order

```powershell
python cli.py --symbol BTCUSDT --side SELL --type LIMIT --quantity 0.001 --price 120000 --dry-run
```

### Real LIMIT order

```powershell
python cli.py --symbol BTCUSDT --side SELL --type LIMIT --quantity 0.001 --price 120000
```

## CLI Options

```text
--symbol      Trading pair, for example BTCUSDT
--side        BUY or SELL
--type        MARKET or LIMIT
--quantity    Positive order quantity
--price       Required for LIMIT orders
--dry-run     Validate and log without sending an order
```

## Output

The CLI prints:

- order request summary
- order response details
- success or failure message

For Binance responses, it displays:

- `orderId`
- `status`
- `executedQty`
- `avgPrice`, if available

## Logs

Runtime logs are written to:

```text
logs/trading_bot.log
```

Sample dry-run logs are included:

```text
logs/sample_market_order.log
logs/sample_limit_order.log
```

## Assumptions

- This app is for Binance Futures Testnet only.
- It uses USDT-M Futures REST endpoints.
- LIMIT orders use `timeInForce=GTC`.
- Credentials are loaded from environment variables or `.env`.
- No real money is used on testnet.

## Safety

Never commit your `.env` file or real API secret to GitHub.

