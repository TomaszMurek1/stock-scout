from decimal import Decimal as D

# Manual TTWR verification for 3M period
# The key question: Is +5.99% TTWR with -2.41% Simple Return mathematically possible?

print("=== MANUAL TTWR VERIFICATION ===\n")

# Scenario from user's data:
start_invested = D("12891.59")
end_invested = D("151536.89")
deposits = D("142380.00")

simple_return = (end_invested - start_invested - deposits) / (start_invested + deposits)
print(f"Simple Return: {simple_return * 100:.2f}%")
print(f"  = ({end_invested} - {start_invested} - {deposits}) / ({start_invested} + {deposits})")
print(f"  = {end_invested - start_invested - deposits} / {start_invested + deposits}")
print()

# Now let's trace what TTWR means:
# TTWR asks: "If I invested $1 at the start, what would it grow to by the end?"

print("TTWR Logic:")
print("  If TTWR = +5.99%, then $1 → $1.0599")
print(f"  So {start_invested} → {start_invested * D('1.0599'):.2f}")
print()

# But we also added deposits mid-period
# Key dates from debug:
# Sep 15: 12,891.59 (start)
# Nov 14: 13,829.54 (before deposits)
# Nov 15-18: Added 142,380
# Dec 14: 151,536.89 (end)

print("Timeline breakdown:")
print("  Sep 15 → Nov 14: 12,891.59 → 13,829.54")
growth_before_deposits = (D("13829.54") / D("12891.59") - 1) * 100
print(f"    Growth: {growth_before_deposits:.2f}%")
print()

print("  Nov 15-18: Added 142,380 in deposits")
print("    Expected value: 13,829.54 + 142,380 = 156,209.54")
print()

print("  Nov 19 → Dec 14: 156,212.34 → 151,536.89")
growth_after_deposits = (D("151536.89") / D("156212.34") - 1) * 100  
print(f"    Growth: {growth_after_deposits:.2f}%")
print()

print("Combined TTWR:")
total_twr = (D("1") + growth_before_deposits/100) * (D("1") + growth_after_deposits/100) - 1
print(f"  (1.{growth_before_deposits:.2f}) × (1.{growth_after_deposits:.2f}) - 1 = {total_twr * 100:.2f}%")
print()

print("="*60)
print("CONCLUSION:")
print(f"  TTWR: Shows stocks went UP {growth_before_deposits:.1f}%, then DOWN {abs(growth_after_deposits):.1f}%")
print(f"  Net TTWR: Slightly positive because up-period was larger")
print()
print(f"  Simple Return: -2.41% because you LOST money")
print(f"  Why different? You had ${start_invested:.0f} during the UP period")
print(f"               and ${start_invested + deposits:.0f} during the DOWN period")
print()
print("  Result: Stock picks were OK (small gain), but TIMING was terrible")
print("          (added huge money right before drop)")
