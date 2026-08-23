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

# Analysis window, bounded by SPC Pacific Data Hub coverage.
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

# Remaining IPCC AR6 carbon budget for <1.5C with no/limited overshoot (C1),
# rather than a fixed annual planetary-boundary allocation. The budget
# shrinks as the world emits, which is what "fair share of the carbon
# budget" means in climate policy — and C1 is the 1.5C pathway Pacific
# nations themselves campaign for ("1.5 to stay alive").
CC_CATEGORY = ["C1"]

# C1 covers 12 AR6 model/policy runs, not one number. We report a single
# reference run rather than a median across scenarios pyaesa cannot label:
# MESSAGEix-GLOBIOM's "National Policies Implemented (2020)" pathway
# targeting ~500 ppm CO2-eq — the middle of the three core 450/500/600
# targets in that model family, and not one of the COVID-response variants
# (COV_GreenPush, COV_Restore...) that make up the other half of C1.
CC_SCENARIO = "EN_NPi2020_500"

# ASR results, written by pyaesa under the equal-per-capita allocation.
ASR_FILE = (
    ROOT / PROJECT / "C_asr" / "iso3" / f"ext_lca_{LCA_VERSION}" / "deterministic"
    / f"dynamic_ar6_{LCIA_METHOD}" / "results"
    / f"l1_EG(Pop)__{LCIA_METHOD}_dynamic_ar6.csv"
)

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
