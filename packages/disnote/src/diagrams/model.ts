export const DIAGRAM_FORMATS = { MERMAID: "mermaid", DRAWIO: "drawio" } as const;
export type DiagramFormat = typeof DIAGRAM_FORMATS[keyof typeof DIAGRAM_FORMATS];
export const DIAGRAM_LIMITS = { SOURCE: 200_000, XML: 1_000_000, CELLS: 2000 } as const;
export const DIAGRAM_SAMPLES = {
  mermaid: "flowchart LR\n  A[Document] --> B[Database]\n  B --> C[Preview]",
  drawio: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Document" vertex="1" parent="1" style="rounded=1;fillColor=#e0f2f1;strokeColor=#40958f;"><mxGeometry x="20" y="30" width="140" height="60" as="geometry"/></mxCell><mxCell id="3" value="Preview" vertex="1" parent="1" style="rounded=1;fillColor=#eff6ff;strokeColor=#659cc5;"><mxGeometry x="260" y="30" width="140" height="60" as="geometry"/></mxCell><mxCell id="4" edge="1" source="2" target="3" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>',
} as const;
export function isDiagramFormat(value: unknown): value is DiagramFormat { return value === DIAGRAM_FORMATS.MERMAID || value === DIAGRAM_FORMATS.DRAWIO; }
export function validDiagramSource(value: unknown): value is string { return typeof value === "string" && value.length <= DIAGRAM_LIMITS.SOURCE; }
