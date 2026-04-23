"""
Synthetic data seed script for AI over BI demo.

Generates FY2024 data for 100 QuickBite fast food stores across 5 US regions.
Run with: uv run ai-over-bi-seed

Tables created:
  stores         — 100 store master records
  daily_sales    — 36,600 rows (100 stores × 366 days)
  quarterly_sales — 400 rows (100 stores × 4 quarters, pre-aggregated)
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

# Day-of-week multipliers (0=Monday … 6=Sunday)
_DOW = {0: 0.86, 1: 0.88, 2: 0.92, 3: 0.95, 4: 1.15, 5: 1.26, 6: 1.12}

# Monthly seasonality (1=Jan … 12=Dec)
_MONTH = {
    1: 0.88, 2: 0.90, 3: 0.95,   # Q1 — post-holiday slowdown
    4: 1.00, 5: 1.06, 6: 1.09,   # Q2 — spring build
    7: 1.13, 8: 1.11, 9: 1.04,   # Q3 — summer peak
    10: 1.01, 11: 1.06, 12: 1.09, # Q4 — holiday lift
}

# Per-store performance tier multiplier (assigned once, consistent across time)
def _store_multiplier(store_id: int) -> float:
    """Deterministic performance tier based on store_id."""
    rng = random.Random(store_id * 42)
    tier = rng.random()
    if tier > 0.85:   return rng.uniform(1.28, 1.45)   # top tier (~15%)
    if tier > 0.60:   return rng.uniform(1.08, 1.27)   # upper-mid (~25%)
    if tier > 0.30:   return rng.uniform(0.93, 1.07)   # mid (~30%)
    if tier > 0.12:   return rng.uniform(0.80, 0.92)   # lower-mid (~18%)
    return rng.uniform(0.62, 0.79)                      # bottom (~12%)


# ── Seed functions ─────────────────────────────────────────────────────────────

def _generate_daily(store_id: int) -> list[tuple]:
    """Generate FY2024 daily sales rows for one store."""
    rng = random.Random(store_id * 7919)
    perf = _store_multiplier(store_id)
    # Base metrics
    base_sales = 4_500.0 * perf
    base_guests = 265 * perf

    rows = []
    day = date(2024, 1, 1)
    end = date(2024, 12, 31)
    while day <= end:
        dow_m = _DOW[day.weekday()]
        month_m = _MONTH[day.month]
        noise = rng.gauss(1.0, 0.06)

        net_sales = round(base_sales * dow_m * month_m * noise, 2)
        guest_count = max(10, int(base_guests * dow_m * month_m * rng.gauss(1.0, 0.08)))
        avg_check = round(net_sales / guest_count, 2)

        rows.append((store_id, day.isoformat(), net_sales, guest_count, avg_check))
        day += timedelta(days=1)
    return rows


def _quarter_for(d: date) -> str:
    return f"Q{(d.month - 1) // 3 + 1}"


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
    for store_id, *_ in _STORES:
        all_daily.extend(_generate_daily(store_id))
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

    conn.commit()
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
