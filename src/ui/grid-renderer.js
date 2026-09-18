/**
 * MatrixSheet - High-Performance Virtualized Grid Renderer & Selection Engine
 */

export class GridRenderer {
  constructor(tableElement, model, options = {}) {
    this.table = tableElement;
    this.model = model;
    this.activeCoord = 'B2';
    this.selectedRange = { start: 'B2', end: 'B2' };
    this.onCellSelect = options.onCellSelect || (() => {});
    this.onCellValueChange = options.onCellValueChange || (() => {});

    this.colsCount = 14;
    this.rowsCount = 25;
    this.cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

    this.render();
  }

  render() {
    let html = '<thead><tr><th class="corner-header"></th>';
    for (let c = 0; c < this.colsCount; c++) {
      html += `<th class="col-header" data-col="${this.cols[c]}">${this.cols[c]}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 1; r <= this.rowsCount; r++) {
      html += `<tr><th class="row-header" data-row="${r}">${r}</th>`;
      for (let c = 0; c < this.colsCount; c++) {
        const coord = `${this.cols[c]}${r}`;
        const cell = this.model.getCell(coord);
        const displayVal = this.model.formatValue(cell.computed, cell.format);
        const styleStr = this.computeCellStyle(cell);

        html += `
          <td id="cell-${coord}" 
              class="grid-cell ${coord === this.activeCoord ? 'active-cell' : ''}" 
              data-coord="${coord}"
              style="${styleStr}">
            <div class="cell-content">${displayVal}</div>
          </td>
        `;
      }
      html += '</tr>';
    }
    html += '</tbody>';

    this.table.innerHTML = html;
    this.bindEvents();
  }

  computeCellStyle(cell) {
    if (!cell || !cell.style) return '';
    let s = '';
    if (cell.style.bold) s += 'font-weight: bold; ';
    if (cell.style.italic) s += 'font-style: italic; ';
    if (cell.style.underline) s += 'text-decoration: underline; ';
    if (cell.style.align) s += `text-align: ${cell.style.align}; `;
    if (cell.style.color) s += `color: ${cell.style.color}; `;
    if (cell.style.bg) s += `background-color: ${cell.style.bg}; `;
    return s;
  }

  bindEvents() {
    this.table.querySelectorAll('.grid-cell').forEach(td => {
      td.addEventListener('click', (e) => {
        const coord = td.dataset.coord;
        this.setActiveCell(coord);
      });

      td.addEventListener('dblclick', (e) => {
        const coord = td.dataset.coord;
        this.enterInlineEdit(td, coord);
      });
    });
  }

  setActiveCell(coord) {
    const old = this.table.querySelector('.active-cell');
    if (old) old.classList.remove('active-cell');

    this.activeCoord = coord;
    const td = document.getElementById(`cell-${coord}`);
    if (td) {
      td.classList.add('active-cell');
    }

    const cell = this.model.getCell(coord);
    this.onCellSelect(coord, cell);
  }

  enterInlineEdit(td, coord) {
    const cell = this.model.getCell(coord);
    const initial = cell.raw || '';

    td.innerHTML = `<input type="text" class="cell-editor-input" value="${initial.replace(/"/g, '&quot;')}" />`;
    const input = td.querySelector('input');
    input.focus();
    input.select();

    const finish = () => {
      const newVal = input.value;
      this.model.setCell(coord, newVal);
      this.onCellValueChange(coord, newVal);
      this.updateGridValues();
      this.setActiveCell(coord);
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') {
        this.updateGridValues();
        this.setActiveCell(coord);
      }
    });
  }

  updateGridValues() {
    for (let r = 1; r <= this.rowsCount; r++) {
      for (let c = 0; c < this.colsCount; c++) {
        const coord = `${this.cols[c]}${r}`;
        const td = document.getElementById(`cell-${coord}`);
        if (!td) continue;

        const cell = this.model.getCell(coord);
        const displayVal = this.model.formatValue(cell.computed, cell.format);
        const styleStr = this.computeCellStyle(cell);

        td.setAttribute('style', styleStr);
        td.innerHTML = `<div class="cell-content">${displayVal}</div>`;
        if (cell.computed === '#CYCLE!') {
          td.classList.add('cell-cycle-error');
        } else {
          td.classList.remove('cell-cycle-error');
        }
      }
    }
  }
}
