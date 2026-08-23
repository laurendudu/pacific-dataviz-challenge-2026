import pyaesa

from config import ROOT, PROJECT
pyaesa.set_workspace(top_path=str(ROOT))
pyaesa.download_pop_gdp()
pyaesa.download_ar6()
pyaesa.process_pop_gdp()
pyaesa.process_ar6(years=range(2000, 2051))
pyaesa.prepare_external_inputs(project_name=PROJECT)

import io

import pandas as pd

from config import (
    LCA_FILE, PACIFIC, PACIFIC_ISO3, REGION_COL, VIZ, WB_POP, YEARS, YEAR_COLS,
)
from pdh_api import fetch_data_pacific
OWID_URL = "https://github.com/owid/co2-data/raw/master/owid-co2-data.csv"

try:
    owid = pd.read_csv(OWID_URL)
except Exception as exc:
    # python.org builds on macOS ship without CA certificates until you run
    # /Applications/Python\ 3.x/Install\ Certificates.command
    print(f"Direct read failed ({type(exc).__name__}); retrying without TLS verification.")
    import requests
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    owid = pd.read_csv(io.StringIO(requests.get(OWID_URL, verify=False).text))

print(f"{len(owid):,} rows x {owid.shape[1]} columns")
# Real countries only: OWID mixes aggregates like "OWID_EUR" into iso_code.
world = owid[
    owid["year"].isin(YEARS)
    & owid["iso_code"].notna()
    & ~owid["iso_code"].str.startswith("OWID")
].copy()

names = world.drop_duplicates("iso_code").set_index("iso_code")["country"]

# A few countries have interior gaps in total_ghg. Carry the nearest
# observation across them rather than dropping the country outright.
world = world.sort_values(["iso_code", "year"])
world["total_ghg"] = world.groupby("iso_code")["total_ghg"].ffill().bfill()
world = world.dropna(subset=["total_ghg"])

# OWID reports million tonnes CO2-eq; pyaesa expects kg.
world["emissions_kg"] = world["total_ghg"] * 1e9
world = world[["iso_code", "year", "emissions_kg"]]

print(f"{world['iso_code'].nunique()} countries")
ghg = fetch_data_pacific(
    source="DF_CLIMATE_CHANGE",
    start_period=str(min(YEARS)),
    end_period=str(max(YEARS)),
    key="A.GHG_EMI_CAPITA." + "+".join(PACIFIC),
)

print(ghg.groupby("GEO_PICT")["TIME_PERIOD"].agg(["min", "max", "count"]))
population = (
    pd.read_csv(WB_POP)
    .query("variable == 'Population'")
    .melt(id_vars="iso3_code", value_vars=YEAR_COLS,
          var_name="year", value_name="population")
    .astype({"year": int})
    .rename(columns={"iso3_code": "iso_code"})
)

pacific = ghg.assign(
    iso_code=ghg["GEO_PICT"].map(PACIFIC),
    year=ghg["TIME_PERIOD"].astype(int),
).dropna(subset=["iso_code"])

pacific = pacific.merge(population, on=["iso_code", "year"])

# SPC reports tonnes CO2-eq per person; pyaesa expects kg.
pacific["emissions_kg"] = pacific["value"] * pacific["population"] * 1_000
pacific = pacific[["iso_code", "year", "emissions_kg"]]

print(f"{pacific['iso_code'].nunique()} islands, {len(pacific)} country-years")
emissions = pd.concat([
    world[~world["iso_code"].isin(PACIFIC_ISO3)].assign(source="OWID"),
    pacific.assign(source="PDH"),
], ignore_index=True)

# Inner join on population both attaches per-capita figures and drops
# countries the World Bank has no entry for — pyaesa cannot allocate a carbon
# budget to those, so they cannot get an ASR either.
emissions = emissions.merge(population, on=["iso_code", "year"])
emissions["emissions_t_per_capita"] = (
    emissions["emissions_kg"] / emissions["population"] / 1_000
)

print(emissions.groupby("source")["iso_code"].nunique())
lca = (
    emissions
    .pivot(index="iso_code", columns="year", values="emissions_kg")
    .reindex(columns=list(YEARS))
    .dropna()
)
lca.columns = [str(c) for c in lca.columns]
lca = lca.reset_index().rename(columns={"iso_code": REGION_COL})
lca.insert(1, "impact", "GWP_100")
lca.insert(2, "impact_unit", "kg CO2-eq")

LCA_FILE.parent.mkdir(parents=True, exist_ok=True)
lca.to_csv(LCA_FILE, index=False)

print(f"{len(lca)} countries -> {LCA_FILE.relative_to(LCA_FILE.parents[4])}")
VIZ.mkdir(exist_ok=True)
kept = emissions[emissions["iso_code"].isin(lca[REGION_COL])]

kept.to_csv(VIZ / "emissions.csv", index=False)

countries = (
    kept.sort_values("year")
    .groupby("iso_code")
    .agg(population=("population", "last"))
    .reset_index()
    .assign(
        name=lambda d: d["iso_code"].map(names),
        is_pacific=lambda d: d["iso_code"].isin(PACIFIC_ISO3),
        source=lambda d: d["iso_code"].map(
            lambda c: "PDH" if c in PACIFIC_ISO3 else "OWID"
        ),
    )[["iso_code", "name", "population", "is_pacific", "source"]]
)
countries.to_csv(VIZ / "countries.csv", index=False)

print(f"{len(countries)} countries, {countries['is_pacific'].sum()} Pacific")

import json

import pandas as pd
import pyaesa

from config import (
    ASR_FILE, CC_CATEGORY, CC_SCENARIO, FU_CODE, LCA_FILE, LCA_VERSION,
    LCIA_METHOD, PROJECT, REGION_COL, ROOT, VIZ, YEARS, YEAR_COLS,
)

pyaesa.set_workspace(top_path=str(ROOT))
countries = sorted(pd.read_csv(LCA_FILE)[REGION_COL].unique())
print(f"Computing ASR for {len(countries)} countries...")

result = pyaesa.deterministic_asr(
    project_name=PROJECT,
    source="iso3",
    fu_code=FU_CODE,
    years=list(YEARS),
    lcia_method=LCIA_METHOD,
    r_p=countries,
    base_asocc_args={"include_lcia_based_allocation_methods": False},
    base_cc_args={
        "static": {"active": False},
        "dynamic_ar6": {"active": True, "category": CC_CATEGORY},
    },
    lca_args={"external_lca": {"active": True, "version_name": LCA_VERSION}},
)
asr = pd.read_csv(ASR_FILE)
asr = asr[asr["cc_scenario"] == CC_SCENARIO]
assert len(asr) == len(countries), (
    f"expected one row per country for {CC_SCENARIO}, got {len(asr)} for {len(countries)} countries"
)

long = (
    asr.melt(
        id_vars=[REGION_COL], value_vars=YEAR_COLS,
        var_name="year", value_name="asr",
    )
    .astype({"year": int})
    .rename(columns={REGION_COL: "iso_code"})
)

snapshot = (
    long.query("year == 2020")
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
    for iso, g in long.groupby("iso_code")
}
(VIZ / "asr.json").write_text(json.dumps(export, indent=2))

print(f"{len(export)} countries -> data_viz/asr.json, data_viz/asr.csv")
