import numpy as np
import pandas as pd

def build_risk_metrics(company, stock_history, db):
    df = pd.DataFrame(stock_history, columns=["date", "close"])
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df.dropna(inplace=True)
    df["returns"] = df["close"].pct_change()

    # Volatility (annualized std dev of daily returns)
    volatility = df["returns"].std() * np.sqrt(252)

    # Max drawdown
    cumulative = (1 + df["returns"]).cumprod()
    running_max = cumulative.cummax()
    drawdowns = (cumulative - running_max) / running_max
    max_drawdown = drawdowns.min()

    # Beta placeholder (later could be computed vs market index)
    beta = None
    try:
        import yfinance as yf
        sp500 = yf.download("^GSPC", period="1y")
        sp500["returns"] = sp500["Adj Close"].pct_change()
        combined = pd.DataFrame({
            "stock": df["returns"].values,
            "market": sp500["returns"].values[-len(df["returns"]):]
        }).dropna()
        beta = combined.cov().iloc[0, 1] / combined["market"].var()
    except:
        beta = None

    return {
        "beta": round(beta, 2) if beta else None,
        "annual_volatility": round(volatility, 4) if volatility else None,
        "max_drawdown": round(max_drawdown, 4) if max_drawdown else None,
    }