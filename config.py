"""Shared configuration for the Pacific Dataviz Challenge 2026 pipeline."""

from pathlib import Path

# Repo root. Notebooks run from here and pyaesa uses it as its workspace,
# so every path below stays relative to this file rather than to a machine.
ROOT = Path(__file__).resolve().parent

# One pyaesa project. Every aSoCC / aCC / ASR output lands in ROOT / PROJECT.
# pyaesa keys its cached metadata on the project name, so a second project is
# only ever needed to run a genuinely different method — not a different
# country set.
PROJECT = "asr"

# Analysis window. 2023 is a deliberate cut-off, not a data limit: as of
# 2026-08 the SPC Pacific Data Hub, OWID and the World Bank all publish 2024.
# Extending means range(2000, 2025) and re-running notebooks 02, 03 and 04.
# Note SPC reports the Marshall Islands and Nauru at a flat 0.1 t every year,
# so a new year there is likely carried forward rather than freshly measured.
YEARS = range(2000, 2024)
YEAR_COLS = [str(y) for y in YEARS]

# The LCA table pyaesa reads as the ASR numerator. pyaesa resolves this file
# from the naming convention "<version>__<lcia_method>.csv".
LCA_VERSION = "merged"
LCIA_METHOD = "gwp100_lcia"
LCA_FILE = (
    ROOT / PROJECT / "A_lca" / "ext_lca" / "deterministic"
    / f"{LCA_VERSION}__{LCIA_METHOD}.csv"
)

# L1.b = production-based accounting (PBA): total output produced in region
# r_p, regardless of where it is consumed. Our emissions data is territorial
# (where it physically happens), so this is the honest FU — L1.a is labelled
# consumption-based (CBA) in pyaesa's docs and would misdescribe the data.
# The selector column pyaesa expects in the LCA CSV changes to match: r_p,
# not r_f.
FU_CODE = "L1.b"
REGION_COL = "r_p"

# Static (steady-state) climate carrying capacity, not the dynamic AR6 pathway.
#
# The dynamic AR6 budget is built for prospective studies: it front-loads the
# allowance and places the reductions after the study window. Against it the
# world sits at 1.17x its 2023 allowance — near compliant — which says nothing
# useful about a historical snapshot. The static carrying capacity is a fixed
# annual safe level, and against it the world emits 6.4x what it may.
#
# pyaesa ships the value in data_raw/carrying_capacities/gwp100_lcia_cc_steady_state.csv:
#
#     min_cc = 6.81e12 kg CO2-eq/yr   = 6.81 GtCO2eq/yr
#     max_cc = 8.72e12 kg CO2-eq/yr   = 128% of min_cc
#
# min_cc is the **2 C** steady-state budget of Bjorn & Hauschild (2015),
# assuming that emission level held over an infinite time period. Stated
# explicitly in de Bantel et al., "UNCASExt" (arXiv:2606.21465), Fig. 2:
# "The static steady-state approach (2 C of global warming by 2100) is shown
# with an annual budget of 6.81 GtCO2eq/yr according to [Bjorn and Hauschild,
# 2015], assuming an infinite time period."
#
# The file's own comment mentions "450 ppm / 350 ppm since Steffen et al.,
# 2015". That is ONLY the source of the 128% ratio used to set max_cc
# (450/350 = 1.286; 8.72/6.81 = 1.281). It does NOT mean min_cc is the 350 ppm
# planetary-boundary level. An earlier version of this file said it did; that
# was a misreading.
#
# The strict planetary-boundary value is a different, tighter number (~1.06 C,
# the PB framework level). It is not in pyaesa's gwp100 table: the PB framework
# defines climate by *state* variables — atmospheric CO2 in ppm, energy
# imbalance in W/m2 — which is why pyaesa carries them separately in
# pb_lcia_cc_steady_state.csv and cannot use them as a kg CO2-eq/yr flow.
# Getting a 1.06 C annual budget means taking it from Bjorn & Hauschild (2015)
# Appendix C and overriding min_cc by hand.
#
# So: describe results as measured against a 2 C steady-state carrying
# capacity, NOT as a planetary-boundary or 1.5 C budget.
CC_BOUND = "min_cc"

# ASR results, written by pyaesa under the equal-per-capita allocation.
ASR_FILE = (
    ROOT / PROJECT / "C_asr" / "iso3" / f"ext_lca_{LCA_VERSION}" / "deterministic"
    / f"static_{LCIA_METHOD}" / "results" / f"l1_EG(Pop)__{LCIA_METHOD}.csv"
)

# Same file for the prioritarian allocation.
ASR_FILE_GDP = (
    ROOT / PROJECT / "C_asr" / "iso3" / f"ext_lca_{LCA_VERSION}" / "deterministic"
    / f"static_{LCIA_METHOD}" / "results" / f"l1_PR(GDPcap)__{LCIA_METHOD}.csv"
)

# The allocated carrying capacity under equal per capita, in kg CO2-eq. Summed
# back over the 198 countries it gives the budget pool the allocation rules
# divide, which is what the grandfathering rule below is normalised against.
ACC_FILE = (
    ROOT / PROJECT / "B2_acc" / "iso3" / "deterministic"
    / f"static_{LCIA_METHOD}" / "results" / f"l1_EG(Pop)__{LCIA_METHOD}.csv"
)

# Reference year for the grandfathering allocation, computed in notebook 03.
#
# pyaesa knows this rule as AR(E) — acquired rights — and defines it as each
# country's share of world emissions in one fixed reference year. It will not
# compute it here: source="iso3" is gated to EG(Pop) and PR(GDPcap) only
# (asocc/orchestration/setup/request/selection.py), because the six AR/PR-HR
# methods all need LCIA-resolved MRIO impacts that a country-level emissions
# table does not carry. The equation itself needs nothing but emissions, so
# notebook 03 applies it directly.
#
# Deliberately set to the window's *last* year, not its first. The choice is
# load-bearing and the collapse is the point: when the reference year is the
# displayed year the E_i,base in the share cancels the E_i,t in the numerator,
# so every country lands on the same ratio — the world's own ASR that year
# (6.3621 in 2023) — and the map goes flat.
#
# That flat panel is the argument. Grandfathering-from-today declares all 198
# countries equally in overshoot while handing the US 2.6 t/person of
# entitlement and the Marshall Islands 16 kg. The ratio hides the gap the rule
# creates; the following scenes show it.
#
# Set this back to min(YEARS) to recover the drift-since-2000 reading, where
# the spread is each country's emissions growth relative to the world's.
GF_BASE_YEAR = max(YEARS)

# The shipped carrying-capacity table, read directly for reporting the
# per-person fair share.
CC_FILE = ROOT / "data_raw" / "carrying_capacities" / f"{LCIA_METHOD}_cc_steady_state.csv"

# Reference tables pyaesa downloads and processes in notebook 01.
WB_POP = ROOT / "data_processed" / "pop_gdp" / "wb_processed.csv"

# Deliverables consumed by the D3 scrollytelling app.
VIZ = ROOT / "data_viz"

# Pacific islands, SPC code -> ISO3.
#
# Restricted to islands the World Bank country list covers, because pyaesa can
# only allocate a carbon budget to countries with World Bank population data.
# American Samoa (ASM), Guam (GUM) and the Northern Mariana Islands (MNP) have
# SPC emissions data but no World Bank entry, so they cannot get an ASR.
PACIFIC = {
    "FJ": "FJI", "FM": "FSM", "KI": "KIR", "MH": "MHL", "NC": "NCL",
    "NR": "NRU", "PF": "PYF", "PG": "PNG", "PW": "PLW", "SB": "SLB",
    "TO": "TON", "TV": "TUV", "VU": "VUT", "WS": "WSM",
}
PACIFIC_ISO3 = sorted(PACIFIC.values())
