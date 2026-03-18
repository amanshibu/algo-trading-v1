import sys, traceback
sys.path.insert(0, ".")

try:
    from app.ml.engine import detect_market_regime, generate_signal
    r = detect_market_regime()
    print("detect_market_regime OK:", r)
    sig = generate_signal()
    print("generate_signal OK:", sig.get("regime"), "| has signal:", sig.get("signal") is not None)
except Exception as e:
    traceback.print_exc()
