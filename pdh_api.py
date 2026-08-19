"""Pacific Data Hub (SPC) SDMX client helpers.

The Pacific Data Hub exposes its statistics over SDMX. `sdmx1` handles the
protocol; these two helpers wrap the calls this project makes repeatedly.
"""

import sdmx


def fetch_data_pacific(
    source: str, start_period: str, end_period: str, key: str, v: str = "1.0"
):
    """Return one Pacific Data Hub dataflow as a tidy DataFrame.

    `key` is a dot-separated SDMX selector whose positions follow the
    dataflow's own dimension order, e.g. "A.GHG_EMI_CAPITA.FJ+KI+TV" for
    annual GHG per capita in Fiji, Kiribati and Tuvalu. Use
    `fetch_structure_pacific` to discover the dimensions and their codes.
    """
    spc = sdmx.Client(source="SPC")
    resp = spc.data(
        f"SPC,{source},{v}",
        key=key,
        params={"startPeriod": start_period, "endPeriod": end_period},
    )
    return sdmx.to_pandas(resp).reset_index()


def fetch_structure_pacific(source: str, v: str = "1.0"):
    """Return a dataflow's dimensions, measures and attributes.

    Dimensions come back as {dimension_id: {code: label}}, which is what you
    need to build the `key` argument of `fetch_data_pacific`.
    """
    spc = sdmx.Client("SPC")
    flow = spc.dataflow(source)
    dsd_ref = flow.dataflow[source].structure
    resp = spc.get("datastructure", dsd_ref.id, provider=dsd_ref.maintainer.id)
    dsd = resp.structure[dsd_ref.id]

    return {
        "dimensions": {
            d.id: {c.id: str(c.name) for c in d.local_representation.enumerated}
            for d in dsd.dimensions.components
            if d.local_representation and d.local_representation.enumerated
        },
        "measures": [m.id for m in dsd.measures.components],
        "attributes": [a.id for a in dsd.attributes.components],
    }
