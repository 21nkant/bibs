// Pulls every active NYC Parks soccer field (regulation + non-regulation) from NYC Open Data.
const BORO: Record<string, string> = { B: "Brooklyn", M: "Manhattan", Q: "Queens", X: "Bronx", R: "Staten Island" };

type RawField = {
  system: string; gispropnum: string; borough: string; field_number?: string; field_lighted: boolean;
  surface_type?: string; regulation_soccer: boolean; multipolygon?: { coordinates: number[][][][] };
};

export async function fetchFields() {
  const where = encodeURIComponent("(regulation_soccer = true OR nonregulation_soccer = true) AND featurestatus = 'Active'");
  const raw: RawField[] = await (await fetch(`https://data.cityofnewyork.us/resource/qnem-b8re.json?$limit=5000&$where=${where}`)).json();
  const parks: { gispropnum: string; signname: string }[] = await (
    await fetch("https://data.cityofnewyork.us/resource/enfh-gkve.json?$select=gispropnum,signname&$limit=10000")
  ).json();
  const parkName = new Map(parks.map((p) => [p.gispropnum, p.signname]));

  const seen = new Set<string>();
  return raw.flatMap((f) => {
    const ring = f.multipolygon?.coordinates?.[0]?.[0];
    if (!ring?.length || seen.has(f.system) || !BORO[f.borough]) return [];
    seen.add(f.system);
    const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [{
      id: f.system,
      park: parkName.get(f.gispropnum) ?? f.gispropnum,
      fieldNumber: f.field_number ?? null,
      borough: BORO[f.borough],
      lit: Boolean(f.field_lighted),
      surface: f.surface_type ?? null,
      regulation: Boolean(f.regulation_soccer),
      lat, lng,
    }];
  });
}
