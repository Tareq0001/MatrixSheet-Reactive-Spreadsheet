import { SheetModel } from './engine/sheet-model.js';
import { GridRenderer } from './ui/grid-renderer.js';
import { FormulaAuditEngine } from './ui/formula-audit.js';
import { ChartStudio } from './ui/chart-studio.js';
import { translations } from './ui/i18n.js';

class MatrixSheetApp {
  constructor() {
    this.currentLang = 'en';
    this.model = new SheetModel();
    
    this.initDOM();
    this.initEngines();
    this.bindEvents();
  }

  initDOM() {
    this.table = document.getElementById('grid-table');
    this.workspace = document.getElementById('spreadsheet-workspace');
    this.svgOverlay = document.getElementById('audit-svg-overlay');
    this.cellNameBox = document.getElementById('cell-name-box');
    this.formulaInput = document.getElementById('formula-input');
    this.chartModal = document.getElementById('chart-modal');
    this.chartCanvas = document.getElementById('chart-canvas');
  }

  initEngines() {
    this.grid = new GridRenderer(this.table, this.model, {
      onCellSelect: (coord, cell) => {
        this.cellNameBox.textContent = coord;
        this.formulaInput.value = cell.raw || '';
        this.updateStatusBar(coord);
      },
      onCellValueChange: (coord, newVal) => {
        this.audit.clearArrows();
      }
    });

    this.audit = new FormulaAuditEngine(this.svgOverlay, this.workspace, this.model);
    this.chartStudio = new ChartStudio(this.chartCanvas, this.model);
  }

  updateStatusBar(coord) {
    const cell = this.model.getCell(coord);
    const num = Number(cell.computed);
    if (!isNaN(num) && cell.computed !== '') {
      document.getElementById('stat-sum').textContent = `SUM: ${num.toLocaleString()}`;
      document.getElementById('stat-avg').textContent = `AVERAGE: ${num.toLocaleString()}`;
      document.getElementById('stat-count').textContent = `COUNT: 1`;
    } else {
      document.getElementById('stat-sum').textContent = ``;
      document.getElementById('stat-avg').textContent = ``;
      document.getElementById('stat-count').textContent = `COUNT: 1`;
    }
  }

  bindEvents() {
    // Formula input change
    this.formulaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const coord = this.grid.activeCoord;
        const val = this.formulaInput.value;
        this.model.setCell(coord, val);
        this.grid.updateGridValues();
        this.audit.clearArrows();
      }
    });

    // Ribbon Tabs
    document.querySelectorAll('.ribbon-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ribbon-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Formatting Buttons
    document.getElementById('btn-bold').addEventListener('click', () => {
      const coord = this.grid.activeCoord;
      const cell = this.model.getCell(coord);
      const isBold = !(cell.style && cell.style.bold);
      this.model.setCell(coord, cell.raw, cell.format, { bold: isBold });
      this.grid.updateGridValues();
    });

    document.getElementById('btn-italic').addEventListener('click', () => {
      const coord = this.grid.activeCoord;
      const cell = this.model.getCell(coord);
      const isItalic = !(cell.style && cell.style.italic);
      this.model.setCell(coord, cell.raw, cell.format, { italic: isItalic });
      this.grid.updateGridValues();
    });

    // Number format selector
    document.getElementById('num-format-select').addEventListener('change', (e) => {
      const coord = this.grid.activeCoord;
      const cell = this.model.getCell(coord);
      this.model.setCell(coord, cell.raw, e.target.value, cell.style);
      this.grid.updateGridValues();
    });

    // Formula Auditing
    document.getElementById('btn-trace-prec').addEventListener('click', () => {
      this.audit.tracePrecedents(this.grid.activeCoord);
    });

    document.getElementById('btn-trace-dep').addEventListener('click', () => {
      this.audit.traceDependents(this.grid.activeCoord);
    });

    document.getElementById('btn-remove-arrows').addEventListener('click', () => {
      this.audit.clearArrows();
    });

    // Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const csv = this.model.exportCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MatrixSheet_${this.model.activeSheetName}.csv`;
      a.click();
    });

    // Export XLSX simulation
    document.getElementById('btn-export-xlsx').addEventListener('click', () => {
      const csv = this.model.exportCSV();
      const blob = new Blob([csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MatrixSheet_Enterprise_Forecast.xlsx`;
      a.click();
    });

    // Charting modal
    document.getElementById('btn-chart-col').addEventListener('click', () => {
      this.chartStudio.renderChart('B2', 'E4', 'column');
      this.chartModal.style.display = 'flex';
    });

    document.getElementById('btn-chart-line').addEventListener('click', () => {
      this.chartStudio.renderChart('B2', 'E4', 'line');
      this.chartModal.style.display = 'flex';
    });

    document.getElementById('btn-chart-pie').addEventListener('click', () => {
      this.chartStudio.renderChart('B2', 'E4', 'pie');
      this.chartModal.style.display = 'flex';
    });

    document.getElementById('btn-close-chart').addEventListener('click', () => {
      this.chartModal.style.display = 'none';
    });

    // Sheet tab switching
    document.querySelectorAll('.sheet-tab-item').forEach(st => {
      st.addEventListener('click', () => {
        document.querySelectorAll('.sheet-tab-item').forEach(s => s.classList.remove('active'));
        st.classList.add('active');
        this.model.activeSheetName = st.dataset.sheet;
        this.grid.updateGridValues();
        this.audit.clearArrows();
      });
    });

    // Language Toggle
    document.getElementById('btn-lang-toggle').addEventListener('click', () => {
      this.currentLang = this.currentLang === 'en' ? 'ar' : 'en';
      document.documentElement.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
      document.getElementById('btn-lang-toggle').textContent = this.currentLang === 'en' ? 'العربية' : 'English';
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new MatrixSheetApp();
});
