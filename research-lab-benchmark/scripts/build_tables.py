"""Build the lookup tables for agent-instructions.md from three Looker pulls.

Inputs (JSON as returned by the Looker MCP query_explore tool, saved to ../data/,
which is gitignored because it holds per-vendor figures; or point BENCHMARK_DATA
at another folder):

  partnerships_per_vendor.json   partner_relationships/partnership
      dims: company.id, account.g2_industry   measure: partnership.count_distinct
  revenue_per_vendor_2025.json   partner_relationships/fct_vendor_roas
      dims: fct_vendor_roas.company_id, account.g2_industry
      measures: fct_vendor_roas.total_partner_revenue, fct_vendor_roas.commissions_total
      filter: fct_vendor_roas.month_year = 2025
  commissions_by_industry.json   commissions/reward
      dims: account.g2_industry, reward.created_year   measure: reward.sum_amount
      filter: reward.created_date = 2024/01/01 to 2026/01/01

Usage: python3 build_tables.py > tables.md
Then paste the output over the matching sections of agent-instructions.md.
"""
import json
import os
import statistics as st
from bisect import bisect_left, bisect_right
from pathlib import Path

DATA = Path(os.environ.get("BENCHMARK_DATA", Path(__file__).resolve().parent.parent / "data"))

# G2 industry -> quiz Q1 category. Unlisted industries fall into Services/Agency/Other;
# vendors with no industry are only counted network-wide.
CATEGORIES = {
    "Marketing/Sales/CRM": ["Marketing", "Sales", "Sales Tools", "Customer Service", "Digital Advertising",
                            "Digital Advertising Tech", "Content Management", "Marketing Services"],
    "ERP/Business Intelligence": ["ERP", "Analytics", "Analytics Tools & Software", "Supply Chain & Logistics",
                                  "Office", "Collaboration & Productivity", "IT Management"],
    "Commerce": ["Commerce", "B2B Marketplaces", "Marketplace Apps"],
    "HR/People Tech": ["HR", "Staffing Services"],
}
OTHER = "Services/Agency/Other"
CATEGORY_ORDER = list(CATEGORIES) + [OTHER]

# Quiz O3 options (plus the legacy "More than 100") and O4 options.
COUNT_BUCKETS = [("1-10", 1, 10), ("11-100", 11, 100), ("101-500", 101, 500),
                 ("501-2,000", 501, 2000), ("More than 2,000", 2001, 10**12)]
LEGACY_BUCKET = ("More than 100", 101, 10**12)
REVENUE_BUCKETS = [("None yet", -1, 0), ("Under $100K", 0.01, 99_999.99),
                   ("$100K-$1M", 100_000, 999_999.99), ("Over $1M", 1_000_000, 1e18)]

POSITIONS = [(10, "P1"), (25, "P2"), (50, "P3"), (75, "P4"), (90, "P5"), (101, "P6")]


def category(industry):
    if industry in (None, "N/A"):
        return None
    for name, industries in CATEGORIES.items():
        if industry in industries:
            return name
    return OTHER


def pct_below(values, x):
    return 100 * bisect_left(values, x) / len(values)


def pct_at_or_below(values, x):
    return 100 * bisect_right(values, x) / len(values)


def mid_rank(values, x):
    lo, hi = bisect_left(values, x), bisect_right(values, x)
    return 100 * (lo + 0.5 * (hi - lo)) / len(values)


def band(values, bucket):
    return pct_below(values, bucket[1]), pct_at_or_below(values, bucket[2])


def band_mid(values, bucket):
    return sum(band(values, bucket)) / 2


def ordinal(p):
    p = max(1, min(99, int(round(p))))
    suffix = "th" if 10 <= p % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(p % 10, "th")
    return f"{p}{suffix}"


def band_str(values, bucket):
    lo, hi = band(values, bucket)
    return f"{ordinal(max(1, lo))}–{ordinal(hi)}"


def bucket_of(x, buckets):
    return next(b for b in buckets if b[1] <= x <= b[2])


def position(score):
    return next(code for limit, code in POSITIONS if score < limit)


def load():
    partnerships = json.loads((DATA / "partnerships_per_vendor.json").read_text())["result"]
    revenue = json.loads((DATA / "revenue_per_vendor_2025.json").read_text())["result"]
    counts = {r["company.id"]: r["partnership.count_distinct"] for r in partnerships}
    count_cat = {r["company.id"]: category(r["account.g2_industry"]) for r in partnerships}
    rev = {}
    for r in revenue:
        amount = r["fct_vendor_roas.total_partner_revenue"] or 0
        commissions = r["fct_vendor_roas.commissions_total"] or 0
        if amount == 0 and commissions > 0:
            continue  # pays commissions but reports no revenue: revenue unknown, not zero
        rev[r["fct_vendor_roas.company_id"]] = amount
    return counts, count_cat, rev


def partner_count_table(counts, count_cat):
    print("### 2a. Partner count percentile (scope: the visitor's category)\n")
    buckets = COUNT_BUCKETS + [LEGACY_BUCKET]
    for name in CATEGORY_ORDER + ["network"]:
        values = sorted(v for k, v in counts.items() if name == "network" or count_cat[k] == name)
        label = "Fallback, network-wide" if name == "network" else name
        print(f"- {label} (n={len(values):,}, median {int(st.median(values))}):")
        print("  " + " · ".join(f"{b[0]}: {band_str(values, b)}" for b in buckets))
    print()


def results_rows(counts, rev, buckets):
    count_values = sorted(counts.values())
    rev_values = sorted(rev.values())
    both = [k for k in rev if k in counts]

    def score(cb, rb):
        return 0.5 * band_mid(count_values, cb) + 0.5 * band_mid(rev_values, rb)

    scores = sorted(score(bucket_of(counts[k], buckets), bucket_of(rev[k], REVENUE_BUCKETS)) for k in both)
    rpp_positive = sorted(rev[k] / counts[k] for k in both if rev[k] > 0)
    rev_median = {b[0]: st.median([v for v in rev_values if b[1] <= v <= b[2]]) for b in REVENUE_BUCKETS[1:]}
    count_median = {b[0]: st.median([v for v in count_values if b[1] <= v <= b[2]]) for b in buckets}

    lines = []
    for cb in buckets:
        known = []
        for rb in REVENUE_BUCKETS:
            s = mid_rank(scores, score(cb, rb))
            weight = sum(1 for k in both if bucket_of(counts[k], buckets) == cb and bucket_of(rev[k], REVENUE_BUCKETS) == rb)
            known.append((s, weight))
            if rb[0] == "None yet":
                rpp, rpp_text = 0, "no partner revenue yet"
            else:
                rpp = mid_rank(rpp_positive, rev_median[rb[0]] / count_median[cb[0]])
                rpp_text = ordinal(rpp)
            diff = band_mid(rev_values, rb) - band_mid(count_values, cb)
            if s >= 75:
                gap = "next_program"
            elif cb[0] == "1-10":
                gap = "recruiting"
            elif rb[0] == "None yet":
                gap = "revenue_per_partner"
            elif diff >= 10:
                gap = "recruiting"
            elif diff <= -10:
                gap = "revenue_per_partner"
            else:
                gap = "revenue_per_partner" if rpp < 50 else "recruiting"
            lines.append(f"- {cb[0]} + {rb[0]} → score {ordinal(s)} · revenue {band_str(rev_values, rb)} · "
                         f"revenue per partner {rpp_text} · gap {gap} · position {position(s)}")
        total = sum(w for _, w in known)
        unsure = sum(s * w for s, w in known) / total
        lines.append(f"- {cb[0]} + Not sure → score {ordinal(unsure)} · revenue not measured · "
                     f"revenue per partner not measured · gap measurement · position {position(unsure)}")
        lines.append("")
    return lines, len(scores)


def results_table(counts, rev):
    print("### 2b. Results row (scope: network-wide)\n")
    lines, scored = results_rows(counts, rev, COUNT_BUCKETS)
    print("\n".join(lines))
    legacy_buckets = [COUNT_BUCKETS[0], COUNT_BUCKETS[1], LEGACY_BUCKET]
    lines, _ = results_rows(counts, rev, legacy_buckets)
    print('Legacy option (only while the quiz still offers "More than 100"):')
    print("\n".join(l for l in lines if l.startswith("- More than 100")))
    print(f'\nScore scope label: "vs {scored:,} vendors, network-wide".\n')


def category_table():
    rows = json.loads((DATA / "commissions_by_industry.json").read_text())["result"]
    totals = {2024: 0.0, 2025: 0.0}
    by_cat = {}
    for r in rows:
        year, amount = r["reward.created_year"], r["reward.sum_amount"] or 0
        totals[year] += amount
        name = category(r["account.g2_industry"])
        if name:
            by_cat.setdefault(name, {2024: 0.0, 2025: 0.0})[year] += amount
    stats = sorted(((name, v[2025] / v[2024] - 1, v[2025] / totals[2025]) for name, v in by_cat.items()),
                   key=lambda t: -t[1])
    print("### 2d. Category momentum (scope: 2025 partner commissions, network-wide)\n")
    for rank, (name, yoy, share) in enumerate(stats, 1):
        print(f"- {name} → {yoy * 100:+.0f}% YoY · #{rank} of 5 by growth · {share * 100:.1f}% of network commissions")
    growth = totals[2025] / totals[2024] - 1
    print(f"\nNetwork total: ${totals[2025] / 1e6:.1f}M in partner commissions in 2025, {growth * 100:+.0f}% YoY.")


def main():
    counts, count_cat, rev = load()
    partner_count_table(counts, count_cat)
    results_table(counts, rev)
    category_table()


if __name__ == "__main__":
    main()
