import { lunarSiteCatalogue, getTerrainProfile } from "../src/lib/data/site-catalogue";
import * as fs from "node:fs";
import * as path from "node:path";

const profiles = lunarSiteCatalogue.map((site) => getTerrainProfile(site.site_id));
const data = {
  schema_version: 1,
  profiles,
};

const outPath = path.resolve(process.cwd(), "data/terrain/terrain_profiles.json");
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
console.log(`Generated profiles for ${profiles.length} sites at ${outPath}`);
