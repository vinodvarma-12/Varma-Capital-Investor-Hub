import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";

export async function fetchGHLMaterials() {
const out = await invokeEdgeFunction("fetch-ghl-materials", {});
  return { data: out };
}
