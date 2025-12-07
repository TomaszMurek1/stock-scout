# Change of Character (CHoCH) Analysis

## Overview
The **Change of Character (CHoCH)** scan identifies potential trend reversals from **Bearish to Bullish**. It detects when a stock in a confirmed downtrend breaks its market structure by closing above a significant **Lower High (LH)**.

This pattern is a core concept in "Smart Money Concepts" (SMC) and technical analysis, signaling that the supply (sellers) has been exhausted and demand (buyers) is taking control.

## Pattern Logic

The algorithm uses a strict, multi-step validation process to minimize false positives:

### 1. Identify Market Structure (Fractals)
The system identifies local "swings" (Highs and Lows) using a rolling window of **5 days**. This ensures it captures significant fractal points regardless of the broader scanning range.

### 2. Confirm Downtrend
A valid setup requires a confirmed downtrend structure:
*   **Previous Lower Low (Prev LL)**: A significant bottom.
*   **Lowest Low (Last LL)**: A subsequent bottom that is strictly *lower* than the Previous LL (`Last LL < Prev LL`).

### 3. Identify the "Intervening High"
The critical level to break is the **Lower High (LH)** that formed *between* the two Lows.
*   The algorithm scans the period between the *Previous LL* date and the *Lowest Low* date.
*   It identifies the highest price point (Swing High) within this range.
*   This point becomes the **Resistance Level (Break Level)**.

### 4. Signal Trigger (Breakout)
A signal is generated if:
*   The **Current Price** (latest close) is strictly **greater** than the **Intervening High**.

## Configuration Parameters

| Parameter | Default | Description |
| :--- | :--- | :--- |
| **Lookback Period** | `30` | The primary search window for finding the structure. (Note: Only defines the search scope; swing detection uses a fixed 5-day fractal). |
| **Days to Check** | `60` | The total historical range to analyze for context. Defines the "Scan Start" point. |
| **Basket/Market** | - | The universe of stocks to scan (e.g., S&P 500, NASDAQ). |
| **Min Market Cap** | `1B` | Filters out small-cap stocks to focus on liquid assets. |

## Visualization

The scan results are presented with "World Class" visualizations to aid rapid analysis:

### Chart Elements
*   **Premium Area Chart**: Displays price action with a professional blue gradient fill.
*   **Scan Start Line**: A vertical dotted grey line indicating the beginning of the analyzed "Days to Check" window.

### Key Markers
*   **RESISTANCE (LH)** (Red Dashed Line):
    *   Marks the price level of the *Intervening Lower High*.
    *   This is the level the price has successfully broken.
*   **SUPPORT (LL)** (Green Dashed Line):
    *   Marks the price level of the *Lowest Low*.
    *   This represents the bottom of the preceding downtrend (the "floor").

## Usage Guide
1.  **Select Universe**: Choose a market (e.g., "US Market") or a custom basket.
2.  **Set Range**: Adjust `Days to Check` if you want to find longer-term reversals (e.g., 200 days) vs. short-term shifts (e.g., 60 days).
3.  **Run Scan**: The system will filter thousands of stocks and present only those matching the strict criteria.
4.  **Analyze**:
    *   Look for the **Green +%** indicating how far the price has moved above the break level.
    *   Use the chart to verify the "V-shape" or rounding bottom formation relative to the markers.
