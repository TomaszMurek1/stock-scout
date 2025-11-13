import math
import numpy as np


def sanitize_numpy_types(obj):
    """
    Recursively convert numpy types into native types,
    and replace NaN/inf with None for JSON compliance.
    """
    if isinstance(obj, dict):
        return {k: sanitize_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_numpy_types(item) for item in obj)
    elif isinstance(obj, np.generic):
        val = obj.item()
        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
            return None
        return val
    elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj


def convert_value(value):
    """
    Convert numpy scalar to a native Python type if needed.
    """
    if hasattr(value, "item"):
        return value.item()
    return value
