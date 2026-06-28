import sdmx
import yaml


def fetch_data_pacific(
    source: str, start_period: str, end_period: str, key: str, v: str = "1.0"
):

    spc = sdmx.Client(source="SPC")
    resp = spc.data(
        f"SPC,{source},{v}",
        key=key,
        params={"startPeriod": start_period, "endPeriod": end_period},
    )

    return sdmx.to_pandas(resp).reset_index()


def fetch_structure_pacific(source: str, v: str = "1.0"):

    spc = sdmx.Client("SPC")
    flow = spc.dataflow(source)
    dsd_ref = flow.dataflow[source].structure
    resp = spc.get("datastructure", dsd_ref.id, provider=dsd_ref.maintainer.id)
    dsd = resp.structure[dsd_ref.id]

    structure = {
        "dimensions": {
            d.id: {c.id: str(c.name) for c in d.local_representation.enumerated}
            for d in dsd.dimensions.components
            if d.local_representation and d.local_representation.enumerated
        },
        "measures": [m.id for m in dsd.measures.components],
        "attributes": [a.id for a in dsd.attributes.components],
    }

    # print(yaml.dump(structure, allow_unicode=True))
    return structure
