/**
 * MatrixSheet - Visual Formula Auditing Engine
 * Draws interactive SVG connector arrows for Trace Precedents & Trace Dependents.
 */

export class FormulaAuditEngine {
  constructor(svgOverlayElement, gridContainer, sheetModel) {
    this.svg = svgOverlayElement;
    this.grid = gridContainer;
    this.model = sheetModel;
  }

  tracePrecedents(coord, activeSheet = this.model.activeSheetName) {
    const key = `${activeSheet}!${coord}`;
    const precedents = this.model.dag.getPrecedents(key);
    this.drawArrows(precedents, coord, '#107c41', 'precedent');
  }

  traceDependents(coord, activeSheet = this.model.activeSheetName) {
    const key = `${activeSheet}!${coord}`;
    const dependents = this.model.dag.getDependents(key);
    this.drawArrows([coord], dependents, '#d83b01', 'dependent');
  }

  clearArrows() {
    this.svg.innerHTML = `
      <defs>
        <marker id="arrowhead-prec" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#107c41" />
        </marker>
        <marker id="arrowhead-dep" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <polygon points="0 0, 8 4, 0 8" fill="#d83b01" />
        </marker>
      </defs>
    `;
  }

  drawArrows(sources, targets, color, type) {
    this.clearArrows();

    const targetList = Array.isArray(targets) ? targets : [targets];
    const sourceList = Array.isArray(sources) ? sources : [sources];

    sourceList.forEach(src => {
      const srcCoord = src.includes('!') ? src.split('!')[1] : src;
      const srcEl = document.getElementById(`cell-${srcCoord}`);
      if (!srcEl) return;

      const srcRect = srcEl.getBoundingClientRect();
      const gridRect = this.grid.getBoundingClientRect();

      const x1 = srcRect.left - gridRect.left + srcRect.width / 2 + this.grid.scrollLeft;
      const y1 = srcRect.top - gridRect.top + srcRect.height / 2 + this.grid.scrollTop;

      targetList.forEach(tgt => {
        const tgtCoord = tgt.includes('!') ? tgt.split('!')[1] : tgt;
        const tgtEl = document.getElementById(`cell-${tgtCoord}`);
        if (!tgtEl) return;

        const tgtRect = tgtEl.getBoundingClientRect();
        const x2 = tgtRect.left - gridRect.left + tgtRect.width / 2 + this.grid.scrollLeft;
        const y2 = tgtRect.top - gridRect.top + tgtRect.height / 2 + this.grid.scrollTop;

        // Draw path with curve
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = x2 - x1;
        const dy = y2 - y1;
        const cx1 = x1 + dx * 0.4;
        const cy1 = y1;
        const cx2 = x1 + dx * 0.6;
        const cy2 = y2;

        path.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('stroke-dasharray', '5, 3');
        path.setAttribute('marker-end', type === 'precedent' ? 'url(#arrowhead-prec)' : 'url(#arrowhead-dep)');

        // Anchor circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x1);
        circle.setAttribute('cy', y1);
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', color);

        this.svg.appendChild(circle);
        this.svg.appendChild(path);
      });
    });
  }
}
