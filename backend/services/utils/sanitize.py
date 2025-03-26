import numpy as np

def sanitize_numpy_types(obj):
    """
    Recursively convert numpy types (e.g., np.bool_, np.int64, etc.) 
    into native Python types for JSON serialization.
    """
    if isinstance(obj, dict):
        return {k: sanitize_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_numpy_types(item) for item in obj)
    elif isinstance(obj, np.generic):
        return obj.item()
    return obj