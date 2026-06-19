# -*- coding: utf-8 -*-
"""Digest the parse-source-of-truth workflow output into a compact per-destination view."""
import json, html, os, sys
sys.stdout.reconfigure(encoding="utf-8")

OUT = r"C:\Users\ROG STRIX\AppData\Local\Temp\claude\C--Users-ROG-STRIX-Documents-alliance-travel\22e0843b-2fca-4c86-a101-df35152792d6\tasks\weblhniy4.output"
with open(OUT, encoding="utf-8") as f:
    blob = json.load(f)

records = blob["result"]["records"]

def u(s):
    if s is None: return ""
    return html.unescape(str(s))

# Build a clean, compact record per file, preferring verify.final* over parse.*
clean = []
for r in records:
    p = r.get("parse") or {}
    v = r.get("verify") or {}
    mapped = v.get("finalMappedPrices") or p.get("mappedPrices") or {}
    dates = v.get("finalDates") or p.get("dates") or []
    hotels = p.get("hotels") or []
    rec = {
        "file": u(r.get("file")),
        "country": u(p.get("country")),
        "tripTitle": u(p.get("tripTitle")),
        "variant": u(p.get("programVariant")),
        "transport": u(p.get("transportType")),
        "airline": u(p.get("airline")),
        "routing": u(p.get("routing")),
        "durBreak": u(p.get("durationBreakdown")),
        "board": u(p.get("board")),
        "hotels": [{"name": u(h.get("name")), "stars": h.get("stars"),
                    "city": u(h.get("city")), "nights": h.get("nights"),
                    "board": u(h.get("board"))} for h in hotels],
        "prices": {k: mapped.get(k) for k in ("double","triple","single","child1","child2","baby")},
        "dates": [u(d) for d in dates],
        "inclusN": len(p.get("inclus") or []),
        "exclusN": len(p.get("exclus") or []),
        "options": [u((o or {}).get("label")) for o in (p.get("options") or [])],
        "visa": u(p.get("visaInfo")),
        "gov": [u(g) for g in (p.get("governanceFlags") or [])],
        "conf": u(p.get("confidence")),
        "vPrices": v.get("pricesConfirmed"),
        "vDates": v.get("datesConfirmed"),
        "vHotels": v.get("hotelsConfirmed"),
        "vCorr": [(u(c.get("field")), u(c.get("shouldBe"))) for c in (v.get("corrections") or [])],
        "couldRead": p.get("couldRead"),
        # keep full parse/verify for the persisted file
        "_parse": p,
        "_verify": v,
    }
    clean.append(rec)

# Persist compact-ish full records for downstream enrichment (unescaped)
with open(r"C:\Users\ROG STRIX\Documents\alliance travel\data\_parsed-records.json", "w", encoding="utf-8") as f:
    json.dump(clean, f, ensure_ascii=False, indent=1)

# Group by country
from collections import OrderedDict
groups = OrderedDict()
for rec in clean:
    groups.setdefault(rec["country"] or "??", []).append(rec)

def fmt_price(p):
    parts = []
    for k in ("double","triple","single","child1","child2","baby"):
        val = p.get(k)
        parts.append(f"{k}={val}" if val is not None else f"{k}=–")
    return " ".join(parts)

print("="*90)
print(f"DIGEST — {len(clean)} records across {len(groups)} countries")
print("="*90)
for country, recs in groups.items():
    print(f"\n\n########## {country}  ({len(recs)} files) ##########")
    for rec in recs:
        flags = []
        if rec["couldRead"] is False: flags.append("!!COULD-NOT-READ")
        if rec["vPrices"] is False: flags.append("price-mismatch")
        if rec["vDates"] is False: flags.append("date-mismatch")
        if rec["vHotels"] is False: flags.append("hotel-mismatch")
        flagstr = ("  !! " + ",".join(flags)) if flags else ""
        print(f"\n  -- {rec['file']}{flagstr}")
        print(f"     title : {rec['tripTitle']}")
        if rec["variant"]: print(f"     variant: {rec['variant']}")
        print(f"     transport: {rec['transport']} · {rec['airline']} · {rec['routing'][:90]}")
        print(f"     duration: {rec['durBreak'][:120]}")
        print(f"     board : {rec['board'][:120]}")
        for h in rec["hotels"]:
            print(f"     hotel : {h['name']} {h['stars']}★ · {h['city']} · {h['nights']}N · {h['board']}")
        print(f"     PRICES: {fmt_price(rec['prices'])}   (conf={rec['conf']})")
        print(f"     dates : {len(rec['dates'])} → {rec['dates'][:6]}")
        if rec["vCorr"]:
            for fld, sb in rec["vCorr"]:
                print(f"     CORR  : {fld} → {sb[:120]}")
        if rec["options"]:
            print(f"     opts  : {rec['options'][:5]}")
        if rec["gov"]:
            for g in rec["gov"]:
                print(f"     GOV   : {g[:140]}")
print("\n\nWrote data/_parsed-records.json")
