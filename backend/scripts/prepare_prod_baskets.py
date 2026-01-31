import sys
import os

# Ensure we can import from backend root
sys.path.append(os.getcwd())

try:
    from backend.database.base import SessionLocal
    from backend.database.baskets import Basket, BasketCompany
except ImportError:
    # Fallback if run from different directory context
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from backend.database.base import SessionLocal
    from backend.database.baskets import Basket, BasketCompany

def cleanup_and_prepare():
    db = SessionLocal()
    try:
        print("--- 1. Checking for Duplicates ---")
        # 1. Deduplicate
        baskets = db.query(Basket).all()
        grouped = {}
        for b in baskets:
            key = (b.name, b.type, b.owner_id)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(b)
            
        duplicates = {k: v for k, v in grouped.items() if len(v) > 1}
        
        if not duplicates:
            print("No duplicates found.")
        else:
            print(f"Found {len(duplicates)} sets of duplicates. Cleaning up...")
            for key, group in duplicates.items():
                # Enrich with company count
                enriched = []
                for b in group:
                    count = db.query(BasketCompany).filter(BasketCompany.basket_id == b.id).count()
                    enriched.append((b, count))
                
                # Sort: priority to higher company count, then lower ID (older)
                enriched.sort(key=lambda x: (-x[1], x[0].id))
                
                to_keep = enriched[0][0]
                to_delete = [x[0] for x in enriched[1:]]
                
                print(f"Keeping '{to_keep.name}' (ID: {to_keep.id}, Companies: {enriched[0][1]})")
                for b in to_delete:
                    print(f" -> Deleting duplicate (ID: {b.id})")
                    db.delete(b)
            
            db.commit()
            print("Duplicates removed.")

        print("\n--- 2. Hiding 'Delisted / OTC' ---")
        # 2. Hide Basket
        target_name = "Delisted / OTC"
        basket = db.query(Basket).filter(Basket.name == "Delisted / OTC").first()
        if basket:
            if basket.is_visible:
                basket.is_visible = False
                db.commit()
                print(f"Basket '{target_name}' is now HIDDEN.")
            else:
                print(f"Basket '{target_name}' was already hidden.")
        else:
            print(f"Basket '{target_name}' not found.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_and_prepare()
