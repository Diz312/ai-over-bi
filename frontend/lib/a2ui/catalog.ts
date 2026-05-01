/**
 * BI catalog — combines component definitions (Zod schemas) with React renderers
 * into a single A2UI catalog object that the CopilotKit provider consumes.
 *
 * The catalogId MUST match agent/src/ai_over_bi/tools/a2ui.py:BI_CATALOG_ID.
 * If you change one, change the other — they are paired by URI.
 *
 * `includeBasicCatalog: true` merges the standard A2UI v0.9 components
 * (Column, Row, Card, Text, Button, etc.) into this catalog so the agent's
 * root `Column` and any future basic primitives render correctly.
 */

import { createCatalog } from "@copilotkit/a2ui-renderer";
import { biDefinitions } from "./definitions";
import { biRenderers } from "./renderers";

// MUST match BI_CATALOG_ID in agent/src/ai_over_bi/tools/a2ui.py
export const BI_CATALOG_ID = "https://github.com/Diz312/gen-ui/catalogs/bi/v1";

// MUST match BI_SURFACE_ID in agent/src/ai_over_bi/tools/a2ui.py
export const BI_SURFACE_ID = "bi-dashboard";

export const biCatalog = createCatalog(biDefinitions, biRenderers, {
  catalogId: BI_CATALOG_ID,
  includeBasicCatalog: true,
});
