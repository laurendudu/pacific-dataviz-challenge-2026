import pyaesa
from config import ROOT, PROJECT
pyaesa.set_workspace(top_path=str(ROOT))
pyaesa.prepare_external_inputs(project_name=PROJECT)
import json

import pandas as pd
import pyaesa

from config import (
    ASR_FILE, LCA_FILE, LCA_VERSION, LCIA_METHOD, PROJECT, ROOT, VIZ,
    YEARS, YEAR_COLS,
)

pyaesa.set_workspace(top_path=str(ROOT))
countries = sorted(pd.read_csv(LCA_FILE)["r_f"].unique())
print(f"Computing ASR for {len(countries)} countries...")

result = pyaesa.deterministic_asr(
    project_name=PROJECT,
    source="iso3",
    fu_code="L1.a",
    years=list(YEARS),
    lcia_method=LCIA_METHOD,
    r_f=countries,
    base_asocc_args={"include_lcia_based_allocation_methods": False},
    lca_args={"external_lca": {"active": True, "version_name": LCA_VERSION}},
)
asr = pd.read_csv(ASR_FILE)

long = (
    asr.melt(
        id_vars=["r_f", "cc_bound"], value_vars=YEAR_COLS,
        var_name="year", value_name="asr",
    )
    .astype({"year": int})
    .rename(columns={"r_f": "iso_code"})
)

snapshot = (
    long.query("cc_bound == 'min_cc' and year == 2020")
    .set_index("iso_code")["asr"]
    .sort_values()
)
print(f"{len(snapshot)} countries in 2020\n")
print("Lowest 10:\n", snapshot.head(10).round(3), "\n")
print("Highest 10:\n", snapshot.tail(10).round(1))
VIZ.mkdir(exist_ok=True)
long.to_csv(VIZ / "asr.csv", index=False)

export = {
    iso: dict(zip(g["year"], g["asr"].round(4)))
    for iso, g in long.query("cc_bound == 'min_cc'").groupby("iso_code")
}
(VIZ / "asr.json").write_text(json.dumps(export, indent=2))

print(f"{len(export)} countries -> data_viz/asr.json, data_viz/asr.csv")