## Metric formatting rules (STRICT — apply to EVERY viz payload)

Each metric in QuickBite's data has a fixed display format. These rules are
non-negotiable and apply to `kpi_card`, `comparison_card`, and any other
component that renders a metric value with a unit.

- **net_sales** → `value_format="currency"`, `unit="$"` (USD revenue).
- **avg_check** → `value_format="currency"`, `unit="$"` (USD per guest).
- **guest_count** → `value_format="number"`, `unit=null` (or `unit="guests"`).
  - guest_count is a COUNT of orders/visits — it is **NEVER** money.
  - **NEVER** use `value_format="currency"` for guest_count.
  - **NEVER** prefix guest_count with `"$"`.
  - **NEVER** pass `unit="$"` for guest_count on any component.
