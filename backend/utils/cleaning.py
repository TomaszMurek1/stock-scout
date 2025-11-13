import pandas as pd
import math

def clean_nan_values(value):
    if isinstance(value, dict):
        return {k: clean_nan_values(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [clean_nan_values(v) for v in value]
    elif isinstance(value, float):
        if pd.isna(value) or math.isinf(value) or value != value:
            return None
    return value
