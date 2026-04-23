"""
Synthetic data seed script for AI over BI demo.

Generates FY2024 data for 100 QuickBite fast food stores across 5 US regions.
Run with: uv run ai-over-bi-seed

Tables created:
  stores          — 100 store master records
  daily_sales     — 36,600 rows (100 stores x 366 days)
  quarterly_sales — 400 rows (100 stores x 4 quarters, pre-aggregated)

Design goals (v2):
- Pronounced seasonality: Q3 peak ~1.6x Q1 trough so quarterly bars read clearly.
- Regional differentiation: Southwest growth, Midwest lag, with regional-seasonal
  interactions (Northeast Q1 weather drag, Southwest Q3 heat dip, West Q4 lift).
- Wide store-tier spread (0.48x – 1.75x) for sharp ranking contrast.
- Higher daily noise so line/area charts show realistic jitter.
- Monotonic annual growth trend so YoY / sequential comparisons are non-flat.
- Promo/event day spikes on known dates (Super Bowl, July 4, Black Friday, ...).
- Per-store avg-check premium so traffic-vs-check correlations are non-trivial.

guest_count is ALWAYS an integer count of orders/visits — never a currency.
"""

import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

# ── Store master data ──────────────────────────────────────────────────────────

_STORES: list[tuple[int, str, str, str, str]] = [
    # (store_id, store_name, city, state, region)
    # Northeast (1–20)
    (1,  "QuickBite Manhattan #1",   "New York",       "NY", "Northeast"),
    (2,  "QuickBite Manhattan #2",   "New York",       "NY", "Northeast"),
    (3,  "QuickBite Brooklyn",       "New York",       "NY", "Northeast"),
    (4,  "QuickBite Queens",         "New York",       "NY", "Northeast"),
    (5,  "QuickBite Bronx",          "New York",       "NY", "Northeast"),
    (6,  "QuickBite Back Bay",       "Boston",         "MA", "Northeast"),
    (7,  "QuickBite Downtown",       "Boston",         "MA", "Northeast"),
    (8,  "QuickBite Cambridge",      "Cambridge",      "MA", "Northeast"),
    (9,  "QuickBite Center City",    "Philadelphia",   "PA", "Northeast"),
    (10, "QuickBite South Philly",   "Philadelphia",   "PA", "Northeast"),
    (11, "QuickBite Downtown",       "Pittsburgh",     "PA", "Northeast"),
    (12, "QuickBite Newark",         "Newark",         "NJ", "Northeast"),
    (13, "QuickBite Jersey City",    "Jersey City",    "NJ", "Northeast"),
    (14, "QuickBite Downtown",       "Hartford",       "CT", "Northeast"),
    (15, "QuickBite Bridgeport",     "Bridgeport",     "CT", "Northeast"),
    (16, "QuickBite Downtown",       "Providence",     "RI", "Northeast"),
    (17, "QuickBite Cranston",       "Cranston",       "RI", "Northeast"),
    (18, "QuickBite Downtown",       "Albany",         "NY", "Northeast"),
    (19, "QuickBite Old Port",       "Portland",       "ME", "Northeast"),
    (20, "QuickBite Church Street",  "Burlington",     "VT", "Northeast"),
    # Southeast (21–40)
    (21, "QuickBite Midtown",        "Atlanta",        "GA", "Southeast"),
    (22, "QuickBite Buckhead",       "Atlanta",        "GA", "Southeast"),
    (23, "QuickBite Downtown",       "Atlanta",        "GA", "Southeast"),
    (24, "QuickBite Historic",       "Savannah",       "GA", "Southeast"),
    (25, "QuickBite Brickell",       "Miami",          "FL", "Southeast"),
    (26, "QuickBite South Beach",    "Miami",          "FL", "Southeast"),
    (27, "QuickBite I-Drive",        "Orlando",        "FL", "Southeast"),
    (28, "QuickBite Uptown",         "Charlotte",      "NC", "Southeast"),
    (29, "QuickBite South End",      "Charlotte",      "NC", "Southeast"),
    (30, "QuickBite Glenwood",       "Raleigh",        "NC", "Southeast"),
    (31, "QuickBite Broadway",       "Nashville",      "TN", "Southeast"),
    (32, "QuickBite Midtown",        "Nashville",      "TN", "Southeast"),
    (33, "QuickBite Beale Street",   "Memphis",        "TN", "Southeast"),
    (34, "QuickBite Ybor City",      "Tampa",          "FL", "Southeast"),
    (35, "QuickBite Riverside",      "Jacksonville",   "FL", "Southeast"),
    (36, "QuickBite Carytown",       "Richmond",       "VA", "Southeast"),
    (37, "QuickBite Oceanfront",     "Virginia Beach", "VA", "Southeast"),
    (38, "QuickBite Five Points",    "Columbia",       "SC", "Southeast"),
    (39, "QuickBite Main Street",    "Greenville",     "SC", "Southeast"),
    (40, "QuickBite French Quarter", "New Orleans",    "LA", "Southeast"),
    # Midwest (41–60)
    (41, "QuickBite The Loop",       "Chicago",        "IL", "Midwest"),
    (42, "QuickBite Lincoln Park",   "Chicago",        "IL", "Midwest"),
    (43, "QuickBite Wicker Park",    "Chicago",        "IL", "Midwest"),
    (44, "QuickBite Wrigleyville",   "Chicago",        "IL", "Midwest"),
    (45, "QuickBite Oak Park",       "Oak Park",       "IL", "Midwest"),
    (46, "QuickBite Midtown",        "Detroit",        "MI", "Midwest"),
    (47, "QuickBite Corktown",       "Detroit",        "MI", "Midwest"),
    (48, "QuickBite Main Street",    "Ann Arbor",      "MI", "Midwest"),
    (49, "QuickBite Short North",    "Columbus",       "OH", "Midwest"),
    (50, "QuickBite Downtown",       "Columbus",       "OH", "Midwest"),
    (51, "QuickBite Ohio City",      "Cleveland",      "OH", "Midwest"),
    (52, "QuickBite Mass Ave",       "Indianapolis",   "IN", "Midwest"),
    (53, "QuickBite Broadripple",    "Indianapolis",   "IN", "Midwest"),
    (54, "QuickBite Nicollet Mall",  "Minneapolis",    "MN", "Midwest"),
    (55, "QuickBite Uptown",         "Minneapolis",    "MN", "Midwest"),
    (56, "QuickBite Cathedral Hill", "St. Paul",       "MN", "Midwest"),
    (57, "QuickBite Third Ward",     "Milwaukee",      "WI", "Midwest"),
    (58, "QuickBite State Street",   "Madison",        "WI", "Midwest"),
    (59, "QuickBite Soulard",        "St. Louis",      "MO", "Midwest"),
    (60, "QuickBite Old Market",     "Omaha",          "NE", "Midwest"),
    # Southwest (61–80)
    (61, "QuickBite Uptown",         "Dallas",         "TX", "Southwest"),
    (62, "QuickBite Oak Lawn",       "Dallas",         "TX", "Southwest"),
    (63, "QuickBite Deep Ellum",     "Dallas",         "TX", "Southwest"),
    (64, "QuickBite Sundance Sq",    "Fort Worth",     "TX", "Southwest"),
    (65, "QuickBite Collins St",     "Arlington",      "TX", "Southwest"),
    (66, "QuickBite Montrose",       "Houston",        "TX", "Southwest"),
    (67, "QuickBite Midtown",        "Houston",        "TX", "Southwest"),
    (68, "QuickBite Heights",        "Houston",        "TX", "Southwest"),
    (69, "QuickBite First Colony",   "Sugar Land",     "TX", "Southwest"),
    (70, "QuickBite Midtown",        "Phoenix",        "AZ", "Southwest"),
    (71, "QuickBite Old Town",       "Scottsdale",     "AZ", "Southwest"),
    (72, "QuickBite Mill Ave",       "Tempe",          "AZ", "Southwest"),
    (73, "QuickBite Main St",        "Mesa",           "AZ", "Southwest"),
    (74, "QuickBite River Walk",     "San Antonio",    "TX", "Southwest"),
    (75, "QuickBite Alamo Heights",  "San Antonio",    "TX", "Southwest"),
    (76, "QuickBite Stone Oak",      "San Antonio",    "TX", "Southwest"),
    (77, "QuickBite South Congress", "Austin",         "TX", "Southwest"),
    (78, "QuickBite The Domain",     "Austin",         "TX", "Southwest"),
    (79, "QuickBite Sixth Street",   "Austin",         "TX", "Southwest"),
    (80, "QuickBite Nob Hill",       "Albuquerque",    "NM", "Southwest"),
    # West (81–100)
    (81, "QuickBite Hollywood",      "Los Angeles",    "CA", "West"),
    (82, "QuickBite Santa Monica",   "Los Angeles",    "CA", "West"),
    (83, "QuickBite Downtown",       "Los Angeles",    "CA", "West"),
    (84, "QuickBite Koreatown",      "Los Angeles",    "CA", "West"),
    (85, "QuickBite Pine Ave",       "Long Beach",     "CA", "West"),
    (86, "QuickBite Capitol Hill",   "Seattle",        "WA", "West"),
    (87, "QuickBite Fremont",        "Seattle",        "WA", "West"),
    (88, "QuickBite Bellevue",       "Bellevue",       "WA", "West"),
    (89, "QuickBite The Castro",     "San Francisco",  "CA", "West"),
    (90, "QuickBite SOMA",           "San Francisco",  "CA", "West"),
    (91, "QuickBite Temescal",       "Oakland",        "CA", "West"),
    (92, "QuickBite Pearl District", "Portland",       "OR", "West"),
    (93, "QuickBite Hawthorne",      "Portland",       "OR", "West"),
    (94, "QuickBite LoDo",           "Denver",         "CO", "West"),
    (95, "QuickBite Capitol Hill",   "Denver",         "CO", "West"),
    (96, "QuickBite The Strip",      "Las Vegas",      "NV", "West"),
    (97, "QuickBite Green Valley",   "Henderson",      "NV", "West"),
    (98, "QuickBite Gaslamp",        "San Diego",      "CA", "West"),
    (99, "QuickBite Midtown",        "Sacramento",     "CA", "West"),
    (100,"QuickBite University",     "Tucson",         "AZ", "West"),
]

# ── Sales generation parameters ────────────────────────────────────────────────

# Day-of-week multipliers (0=Monday … 6=Sunday). Widened vs v1.
_DOW = {0: 0.78, 1: 0.82, 2: 0.90, 3: 0.96, 4: 1.22, 5: 1.38, 6: 1.18}

# Monthly seasonality (1=Jan … 12=Dec). Widened for sharper quarterly contrast.
# Q1 trough ~0.80, Q3 peak ~1.27 → ~1.6x Q3/Q1 ratio.
_MONTH = {
    1: 0.80, 2: 0.76, 3: 0.90,    # Q1 — post-holiday trough, Feb weather drag
    4: 1.00, 5: 1.10, 6: 1.18,    # Q2 — spring ramp
    7: 1.32, 8: 1.27, 9: 1.15,    # Q3 — summer peak (travel, longer days)
    10: 1.02, 11: 1.10, 12: 1.22, # Q4 — holiday lift (Dec strongest)
}

# Per-region multiplier — captures market-level differentiation.
# Widened spread: Southwest dominant (~1.55x) vs Midwest lagging (~0.62x).
# That's a ~2.5x gap top-to-bottom so regional charts read with clear hierarchy.
_REGION_BASE = {
    "Southwest": 1.55,   # Texas/AZ growth story — leads the chain
    "West":      1.28,   # strong CA/PNW urban markets
    "Northeast": 0.98,   # premium check but smaller guest volume
    "Southeast": 0.82,   # softer markets, value-heavy
    "Midwest":   0.62,   # clearly lagging — urban decline, weather drag
}

# Regional-seasonal interaction. Shape: (region, quarter) -> multiplier.
# Applied on top of base region x monthly seasonality — drives divergent
# quarterly curves per region.
_REGION_QUARTER: dict[tuple[str, str], float] = {
    # Northeast — punished by winter, modest summer, decent holiday lift.
    ("Northeast", "Q1"): 0.78,   # severe winter storms
    ("Northeast", "Q2"): 1.02,
    ("Northeast", "Q3"): 1.04,
    ("Northeast", "Q4"): 1.10,
    # Midwest — worst Q1 of any region, flat summer, weak holiday.
    ("Midwest",   "Q1"): 0.72,   # polar vortex, blizzards
    ("Midwest",   "Q2"): 0.95,
    ("Midwest",   "Q3"): 1.00,
    ("Midwest",   "Q4"): 0.92,
    # Southeast — year-round warm, tourism-driven, solid Q3.
    ("Southeast", "Q1"): 1.04,   # snowbird season
    ("Southeast", "Q2"): 0.98,
    ("Southeast", "Q3"): 1.12,   # FL/coastal tourism peak
    ("Southeast", "Q4"): 1.08,
    # Southwest — huge summer dip (heat), massive Q4 snowbird/visitor influx.
    ("Southwest", "Q1"): 1.06,
    ("Southwest", "Q2"): 1.02,
    ("Southwest", "Q3"): 0.84,   # 110F+ Phoenix/Texas heat suppresses traffic
    ("Southwest", "Q4"): 1.18,   # snowbird / tourism / ideal weather
    # West — CA tourism peaks in summer, softens in winter.
    ("West",      "Q1"): 0.92,
    ("West",      "Q2"): 1.04,
    ("West",      "Q3"): 1.18,   # CA/NV/Vegas tourism peak
    ("West",      "Q4"): 1.02,
}

# Event-day multipliers. Applied to all stores on these specific dates.
_EVENT_DAYS: dict[date, float] = {
    date(2024, 2, 11):  1.28,   # Super Bowl Sunday
    date(2024, 3, 17):  1.15,   # St. Patrick's Day
    date(2024, 5, 27):  1.20,   # Memorial Day
    date(2024, 7, 4):   1.32,   # Independence Day
    date(2024, 9, 2):   1.18,   # Labor Day
    date(2024, 10, 31): 1.12,   # Halloween
    date(2024, 11, 28): 0.55,   # Thanksgiving (many stores closed/reduced)
    date(2024, 11, 29): 1.28,   # Black Friday
    date(2024, 12, 24): 0.78,   # Christmas Eve (reduced hours)
    date(2024, 12, 25): 0.35,   # Christmas Day (most closed)
    date(2024, 12, 26): 1.22,   # Boxing Day bounce
    date(2024, 12, 31): 1.15,   # NYE
}


def _store_profile(store_id: int) -> tuple[float, float]:
    """Return (performance_tier, check_premium) for a store.

    performance_tier — overall volume multiplier (0.48 – 1.75).
    check_premium   — per-guest-check multiplier (0.88 – 1.14), independent of
                      tier so we get 'high-check/low-traffic' and
                      'low-check/high-traffic' stores for non-trivial scatter.
    """
    rng = random.Random(store_id * 42)
    tier_roll = rng.random()
    if tier_roll > 0.90:   tier = rng.uniform(1.48, 1.75)   # star stores (~10%)
    elif tier_roll > 0.70: tier = rng.uniform(1.15, 1.44)   # strong     (~20%)
    elif tier_roll > 0.35: tier = rng.uniform(0.90, 1.12)   # middle     (~35%)
    elif tier_roll > 0.10: tier = rng.uniform(0.68, 0.88)   # lagging    (~25%)
    else:                  tier = rng.uniform(0.48, 0.66)   # struggling (~10%)

    check_premium = rng.uniform(0.88, 1.14)
    return tier, check_premium


# ── Seed functions ─────────────────────────────────────────────────────────────


def _quarter_for(d: date) -> str:
    return f"Q{(d.month - 1) // 3 + 1}"


def _generate_daily(store_id: int, region: str) -> list[tuple]:
    """Generate FY2024 daily sales rows for one store."""
    rng = random.Random(store_id * 7919)
    tier, check_premium = _store_profile(store_id)
    region_base = _REGION_BASE.get(region, 1.0)

    # Base daily metrics (before multipliers).
    base_sales = 4_500.0 * tier * region_base
    base_guests = 280 * tier * region_base

    rows = []
    day = date(2024, 1, 1)
    end = date(2024, 12, 31)
    day_index = 0
    total_days = (end - day).days + 1

    while day <= end:
        dow_m = _DOW[day.weekday()]
        month_m = _MONTH[day.month]
        rq_m = _REGION_QUARTER.get((region, _quarter_for(day)), 1.0)
        event_m = _EVENT_DAYS.get(day, 1.0)
        # Small organic growth across the year: +6% from Jan → Dec.
        growth_m = 1.0 + 0.06 * (day_index / total_days)

        # Daily noise — wider than v1 for realistic jitter.
        sales_noise = rng.gauss(1.0, 0.11)
        guest_noise = rng.gauss(1.0, 0.13)
        # Rare shocks: 1.5% of days see a ±25% swing (weather, local event).
        if rng.random() < 0.015:
            shock = rng.uniform(0.70, 1.30)
            sales_noise *= shock
            guest_noise *= shock

        common = dow_m * month_m * rq_m * event_m * growth_m

        guest_count = max(8, int(base_guests * common * guest_noise))
        # Sales slightly decoupled from guests via check_premium, so avg_check
        # varies meaningfully by store.
        net_sales = round(base_sales * common * sales_noise * check_premium, 2)
        avg_check = round(net_sales / guest_count, 2)

        rows.append((store_id, day.isoformat(), net_sales, guest_count, avg_check))
        day += timedelta(days=1)
        day_index += 1
    return rows


def main() -> None:
    db_path = Path(__file__).parent / "store_data.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Seeding database at {db_path} ...")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # ── Schema ────────────────────────────────────────────────────────────────
    cur.executescript("""
        DROP TABLE IF EXISTS quarterly_sales;
        DROP TABLE IF EXISTS daily_sales;
        DROP TABLE IF EXISTS stores;

        CREATE TABLE stores (
            store_id   INTEGER PRIMARY KEY,
            store_name TEXT NOT NULL,
            city       TEXT NOT NULL,
            state      TEXT NOT NULL,
            region     TEXT NOT NULL
        );

        CREATE TABLE daily_sales (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id     INTEGER NOT NULL REFERENCES stores(store_id),
            date         TEXT NOT NULL,
            net_sales    REAL NOT NULL,
            guest_count  INTEGER NOT NULL,
            avg_check    REAL NOT NULL
        );

        CREATE INDEX idx_daily_store_date ON daily_sales(store_id, date);
        CREATE INDEX idx_daily_date       ON daily_sales(date);

        CREATE TABLE quarterly_sales (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id     INTEGER NOT NULL REFERENCES stores(store_id),
            fiscal_year  INTEGER NOT NULL,
            quarter      TEXT NOT NULL,
            net_sales    REAL NOT NULL,
            guest_count  INTEGER NOT NULL,
            avg_check    REAL NOT NULL
        );

        CREATE INDEX idx_qtrly_store_qtr ON quarterly_sales(store_id, fiscal_year, quarter);
    """)

    # ── Stores ────────────────────────────────────────────────────────────────
    cur.executemany(
        "INSERT INTO stores VALUES (?,?,?,?,?)",
        _STORES,
    )
    print(f"  Inserted {len(_STORES)} stores")

    # ── Daily sales ───────────────────────────────────────────────────────────
    all_daily: list[tuple] = []
    for store_id, _name, _city, _state, region in _STORES:
        all_daily.extend(_generate_daily(store_id, region))
    cur.executemany(
        "INSERT INTO daily_sales (store_id, date, net_sales, guest_count, avg_check) VALUES (?,?,?,?,?)",
        all_daily,
    )
    print(f"  Inserted {len(all_daily):,} daily rows")

    # ── Quarterly rollup (aggregated from daily) ──────────────────────────────
    cur.execute("""
        INSERT INTO quarterly_sales (store_id, fiscal_year, quarter, net_sales, guest_count, avg_check)
        SELECT
            store_id,
            CAST(substr(date, 1, 4) AS INTEGER) AS fiscal_year,
            CASE
                WHEN CAST(substr(date, 6, 2) AS INTEGER) BETWEEN 1 AND 3  THEN 'Q1'
                WHEN CAST(substr(date, 6, 2) AS INTEGER) BETWEEN 4 AND 6  THEN 'Q2'
                WHEN CAST(substr(date, 6, 2) AS INTEGER) BETWEEN 7 AND 9  THEN 'Q3'
                ELSE 'Q4'
            END AS quarter,
            ROUND(SUM(net_sales), 2)      AS net_sales,
            SUM(guest_count)              AS guest_count,
            ROUND(SUM(net_sales) / SUM(guest_count), 2) AS avg_check
        FROM daily_sales
        GROUP BY store_id, fiscal_year, quarter
    """)
    cur.execute("SELECT COUNT(*) FROM quarterly_sales")
    qtrly_count = cur.fetchone()[0]
    print(f"  Inserted {qtrly_count} quarterly rows")

    # ── Sanity summary — so the user sees variability at a glance ─────────────
    cur.execute("""
        SELECT quarter,
               ROUND(SUM(net_sales) / 1e6, 2)   AS net_sales_m,
               SUM(guest_count)                 AS guests,
               ROUND(SUM(net_sales) / SUM(guest_count), 2) AS avg_check
          FROM quarterly_sales
         GROUP BY quarter
         ORDER BY quarter
    """)
    print("\n  FY2024 quarterly rollup:")
    print(f"    {'Quarter':<8} {'Net Sales ($M)':>16} {'Guests':>12} {'Avg Check':>11}")
    for q, ns, gc, ac in cur.fetchall():
        print(f"    {q:<8} {ns:>16,.2f} {gc:>12,} {ac:>11,.2f}")

    cur.execute("""
        SELECT s.region,
               ROUND(SUM(q.net_sales) / 1e6, 2) AS net_sales_m,
               SUM(q.guest_count)               AS guests,
               ROUND(SUM(q.net_sales) / SUM(q.guest_count), 2) AS avg_check
          FROM quarterly_sales q JOIN stores s USING (store_id)
         GROUP BY s.region
         ORDER BY net_sales_m DESC
    """)
    print("\n  FY2024 regional rollup:")
    print(f"    {'Region':<12} {'Net Sales ($M)':>16} {'Guests':>12} {'Avg Check':>11}")
    for r, ns, gc, ac in cur.fetchall():
        print(f"    {r:<12} {ns:>16,.2f} {gc:>12,} {ac:>11,.2f}")

    conn.commit()
    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
