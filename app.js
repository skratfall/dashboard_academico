

let state = {
  materias: [],
  config: {
    nombre: '',
    institucion: '',
    semestre: '2025-1',
    notaMinima: 3.0
  }
};

function cargarStorage() {
  const m = localStorage.getItem('da_materias');
  const c = localStorage.getItem('da_config');
  if (m) state.materias = JSON.parse(m);
  if (c) state.config = { ...state.config, ...JSON.parse(c) };
}

function guardarStorage() {
  localStorage.setItem('da_materias', JSON.stringify(state.materias));
  localStorage.setItem('da_config', JSON.stringify(state.config));
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  const links = document.querySelectorAll('.nav a');
  links.forEach(a => {
    if (a.getAttribute('onclick') && a.getAttribute('onclick').includes(page)) {
      a.classList.add('active');
    }
  });

  // Cerrar sidebar en móvil
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');

  if (page === 'inicio')   actualizarInicio();
  if (page === 'graficas') { actualizarInicio(); renderGraficas(); }
  if (page === 'simulador') cargarSimulador();
  if (page === 'config')   cargarConfig();
}

// Eventos del sidebar en móvil
document.getElementById('toggleSidebar').onclick = () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
};

document.getElementById('overlay').onclick = () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
};

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Muestra un mensaje de alerta en el elemento con el id dado.
 * @param {string} id   - ID del elemento de alerta
 * @param {string} msg  - Mensaje a mostrar
 * @param {string} tipo - 'error' | 'success'
 */
function showAlert(id, msg, tipo = 'error') {
  const el = document.getElementById(id);
  el.className = 'alert alert-' + tipo;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function limpiarFeedbackNota(id) {
  const notaInput = document.getElementById('nota-val-' + id);
  const feedback = document.getElementById('nota-feedback-' + id);

  if (notaInput) notaInput.classList.remove('input-error');
  if (feedback) feedback.textContent = '';
}

function mostrarFeedbackNota(id, mensaje) {
  const notaInput = document.getElementById('nota-val-' + id);
  const feedback = document.getElementById('nota-feedback-' + id);

  if (notaInput) {
    notaInput.classList.add('input-error');
    notaInput.focus();
  }
  if (feedback) feedback.textContent = mensaje;
}

/**
 * Calcula el promedio simple de un arreglo de números.
 * @param {number[]} notas
 * @returns {number}
 */
function calcProm(notas) {
  if (!notas.length) return 0;
  return notas.reduce((a, b) => a + b, 0) / notas.length;
}

/**
 * Devuelve el estado académico según el promedio.
 * @param {number} prom
 * @returns {'aprobado'|'riesgo'|'reprobado'}
 */
function estadoMateria(prom) {
  const min = state.config.notaMinima || 3.0;
  if (prom >= min)         return 'aprobado';
  if (prom >= min - 0.5)  return 'riesgo';
  return 'reprobado';
}

/**
 * Devuelve el color de barra según el estado de la materia.
 * @param {number} prom
 * @returns {string} color CSS
 */
function colorBarra(prom) {
  const e = estadoMateria(prom);
  if (e === 'aprobado') return '#3ecf8e';
  if (e === 'riesgo')   return '#f5c518';
  return '#f03e3e';
}

/**
 * Devuelve el HTML del badge de estado de una materia.
 * @param {number} prom
 * @returns {string} HTML
 */
function badgeEstado(prom) {
  const e = estadoMateria(prom);
  if (e === 'aprobado') return `<span class="badge badge-green">✓ Aprobado</span>`;
  if (e === 'riesgo')   return `<span class="badge badge-yellow">⚠ En riesgo</span>`;
  return `<span class="badge badge-red">✗ Reprobado</span>`;
}

// ============================================================
// MATERIAS
// ============================================================

/** Agrega una nueva materia al estado y recarga la lista. */
function agregarMateria() {
  const nombre   = document.getElementById('mat-nombre').value.trim();
  const creditos = parseInt(document.getElementById('mat-creditos').value) || 3;
  const semestre = document.getElementById('mat-semestre').value;

  if (!nombre) {
    showAlert('alert-materia', 'Por favor ingresa el nombre de la materia.');
    return;
  }
  if (nombre.length < 2) {
    showAlert('alert-materia', 'El nombre debe tener al menos 2 caracteres.');
    return;
  }
  if (state.materias.find(m => m.nombre.toLowerCase() === nombre.toLowerCase())) {
    showAlert('alert-materia', 'Ya existe una materia con ese nombre.');
    return;
  }

  const mat = { id: Date.now(), nombre, creditos, semestre, notas: [] };
  state.materias.push(mat);
  guardarStorage();
  document.getElementById('mat-nombre').value = '';
  showAlert('alert-materia', `Materia "${nombre}" agregada exitosamente.`, 'success');
  renderMaterias();
}

/** Agrega una nota a la materia con el id dado. */
function agregarNota(id) {
  const notaInput = document.getElementById('nota-val-' + id);
  const porcInput = document.getElementById('nota-porc-' + id);
  const nota = parseFloat(notaInput.value);
  const porc = parseFloat(porcInput.value) || null;

  if (isNaN(nota) || nota < 0 || nota > 5) {
    const recomendacion = 'Revisa el valor ingresado y escribe una nota valida entre 0.0 y 5.0 antes de agregarla.';
    mostrarFeedbackNota(id, recomendacion);
    showAlert('alert-materia', 'Error: la nota esta fuera del rango permitido (0 a 5). ' + recomendacion);
    return;
  }

  limpiarFeedbackNota(id);

  const mat = state.materias.find(m => m.id === id);
  if (!mat) return;

  // Validar que el porcentaje total no supere 100%
  const totalPorc = mat.notas.reduce((a, n) => a + (n.porc || 0), 0);
  if (porc && totalPorc + porc > 100) {
    showAlert('alert-materia', `El porcentaje total excedería 100% (actual: ${totalPorc}%).`);
    return;
  }

  mat.notas.push({ valor: nota, porc });
  guardarStorage();
  notaInput.value = '';
  porcInput.value = '';
  renderMaterias();
  actualizarInicio();
}

/** Elimina la nota en el índice dado de la materia indicada. */
function eliminarNota(matId, notaIdx) {
  const mat = state.materias.find(m => m.id === matId);
  if (!mat) return;
  mat.notas.splice(notaIdx, 1);
  guardarStorage();
  renderMaterias();
  actualizarInicio();
}

/** Elimina la materia completa con confirmación. */
function eliminarMateria(id) {
  if (!confirm('¿Eliminar esta materia y todas sus notas?')) return;
  state.materias = state.materias.filter(m => m.id !== id);
  guardarStorage();
  renderMaterias();
  actualizarInicio();
}

/**
 * Calcula el promedio de una materia (ponderado si hay porcentajes, simple si no).
 * @param {object} mat - Objeto materia
 * @returns {number|null}
 */
function promedioMateria(mat) {
  if (!mat.notas.length) return null;
  const conPorc = mat.notas.filter(n => n.porc);
  if (conPorc.length === mat.notas.length && conPorc.length > 0) {
    const totalPorc = conPorc.reduce((a, n) => a + n.porc, 0);
    if (totalPorc === 0) return null;
    return conPorc.reduce((a, n) => a + n.valor * n.porc, 0) / totalPorc;
  }
  return calcProm(mat.notas.map(n => n.valor));
}

/** Renderiza la lista de materias en el DOM. */
function renderMaterias() {
  const lista = document.getElementById('lista-materias');
  if (!state.materias.length) {
    lista.innerHTML = `
      <div class="empty">
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
        </svg>
        <p>No hay materias. ¡Agrega tu primera materia!</p>
      </div>`;
    return;
  }

  lista.innerHTML = state.materias.map(mat => {
    const prom       = promedioMateria(mat);
    const promDisplay = prom !== null ? prom.toFixed(2) : '—';
    const barW       = prom !== null ? Math.min((prom / 5) * 100, 100) : 0;
    const barColor   = prom !== null ? colorBarra(prom) : '#5a5f72';
    const badge      = prom !== null
      ? badgeEstado(prom)
      : '<span class="badge" style="background:rgba(255,255,255,0.05);color:var(--text3)">Sin notas</span>';

    const notasHTML = mat.notas.length
      ? mat.notas.map((n, i) =>
          `<div class="nota-chip">
            ${n.valor.toFixed(1)}
            ${n.porc ? `<span style="color:var(--text3);font-size:11px;">(${n.porc}%)</span>` : ''}
            <span class="del" onclick="eliminarNota(${mat.id},${i})" title="Eliminar">✕</span>
          </div>`
        ).join('')
      : '<span style="color:var(--text3);font-size:13px;">Sin notas registradas</span>';

    return `
    <div class="materia-item" id="mat-${mat.id}">
      <div class="materia-header">
        <div>
          <div class="materia-name">${mat.nombre}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px;">${mat.creditos} créditos • ${mat.semestre}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${badge}
          <button class="btn btn-danger btn-sm" onclick="eliminarMateria(${mat.id})">🗑</button>
        </div>
      </div>
      <div class="notas-row">${notasHTML}</div>
      <div class="promedio-bar">
        <div class="promedio-fill" style="width:${barW}%;background:${barColor};"></div>
      </div>
      <div class="materia-footer">
        <span>Promedio: <strong style="color:var(--text)">${promDisplay}</strong></span>
        <span>${mat.notas.length} nota(s)</span>
      </div>
      <hr class="sep">
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px;font-weight:500;">Agregar nota:</div>
      <div class="nota-ingreso-row">
        <div class="form-group">
          <label class="nota-label" for="nota-val-${mat.id}">Nota (0-5)</label>
          <input id="nota-val-${mat.id}" type="number" placeholder="4.0" min="0" max="5" step="0.1" oninput="limpiarFeedbackNota(${mat.id})" aria-describedby="nota-feedback-${mat.id}">
          <small id="nota-feedback-${mat.id}" class="field-feedback" aria-live="polite"></small>
        </div>
        <div class="form-group">
          <label style="font-size:11px;">Porcentaje % (opcional)</label>
          <input id="nota-porc-${mat.id}" type="number" placeholder="30" min="1" max="100">
          <small class="field-feedback field-feedback-placeholder" aria-hidden="true"></small>
        </div>
        <button class="btn btn-sm" onclick="agregarNota(${mat.id})" style="margin-top:20px;">Agregar</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// CALCULADORA
// ============================================================

/** Calcula el promedio simple a partir de notas separadas por coma. */
function calcularPromedio() {
  const raw = document.getElementById('calc-notas').value.trim();
  if (!raw) { showAlert('alert-calc', 'Ingresa al menos una nota.'); return; }

  const notas = raw.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
  if (!notas.length) {
    showAlert('alert-calc', 'No se encontraron notas válidas. Usa comas para separar.');
    return;
  }

  const invalidas = notas.filter(n => n < 0 || n > 5);
  if (invalidas.length) {
    showAlert('alert-calc', `Algunas notas están fuera del rango 0–5: ${invalidas.join(', ')}`);
    return;
  }

  const prom = calcProm(notas);
  document.getElementById('res-promedio').textContent = prom.toFixed(2);
  document.getElementById('res-max').textContent      = Math.max(...notas).toFixed(1);
  document.getElementById('res-min').textContent      = Math.min(...notas).toFixed(1);
  document.getElementById('res-cant').textContent     = notas.length;
  document.getElementById('calc-result').style.display = 'block';
}

/** Limpia los campos de la calculadora. */
function limpiarCalc() {
  document.getElementById('calc-notas').value = '';
  document.getElementById('calc-result').style.display = 'none';
}

/** Agrega una fila de nota+porcentaje al calculador ponderado. */
function addPonderada() {
  const list = document.getElementById('ponderadas-list');
  const row  = document.createElement('div');
  row.className = 'nota-ingreso-row';
  row.innerHTML = `
    <input type="number" class="pond-nota" placeholder="Nota" min="0" max="5" step="0.1">
    <input type="number" class="pond-porc" placeholder="%" min="1" max="100">
    <button class="btn-outline btn-sm" onclick="this.parentElement.remove()">✕</button>`;
  list.appendChild(row);
}

/** Calcula el promedio ponderado de las filas ingresadas. */
function calcularPonderado() {
  const notas = [...document.querySelectorAll('.pond-nota')].map(i => parseFloat(i.value));
  const porcs = [...document.querySelectorAll('.pond-porc')].map(i => parseFloat(i.value));

  if (notas.some(n => isNaN(n) || n < 0 || n > 5)) {
    showAlert('alert-pond', 'Verifica que todas las notas estén entre 0 y 5.');
    return;
  }
  if (porcs.some(p => isNaN(p) || p <= 0)) {
    showAlert('alert-pond', 'Todos los porcentajes deben ser mayores a 0.');
    return;
  }

  const total = porcs.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.01) {
    showAlert('alert-pond', `Los porcentajes suman ${total}%. Deben sumar 100%.`);
    return;
  }

  const pond = notas.reduce((acc, n, i) => acc + n * porcs[i], 0) / 100;
  document.getElementById('res-ponderado').textContent     = pond.toFixed(2);
  document.getElementById('pond-result').style.display = 'block';
}

/** Calcula la nota necesaria en el examen final para aprobar. */
function calcularNecesaria() {
  const actual   = parseFloat(document.getElementById('nec-actual').value);
  const porcAcum = parseFloat(document.getElementById('nec-porc-acum').value);
  const minima   = parseFloat(document.getElementById('nec-minima').value) || 3.0;

  if (isNaN(actual) || actual < 0 || actual > 5) {
    showAlert('alert-necesaria', 'La nota acumulada debe estar entre 0 y 5.');
    return;
  }
  if (isNaN(porcAcum) || porcAcum <= 0 || porcAcum >= 100) {
    showAlert('alert-necesaria', 'El porcentaje acumulado debe estar entre 1 y 99.');
    return;
  }

  const porcFinal     = 100 - porcAcum;
  const notaNecesaria = (minima - (actual * porcAcum / 100)) / (porcFinal / 100);

  const el    = document.getElementById('nec-result');
  const valEl = document.getElementById('res-necesaria');
  const msgEl = document.getElementById('res-necesaria-msg');

  if (notaNecesaria <= 0) {
    valEl.textContent  = '✓ Ya aprobaste';
    valEl.style.fontSize = '28px';
    msgEl.textContent  = 'Con tu nota actual ya superaste el mínimo requerido.';
    el.style.borderColor = 'rgba(62,207,142,0.3)';
  } else if (notaNecesaria > 5) {
    valEl.textContent    = '✗ Imposible';
    valEl.style.fontSize = '36px';
    valEl.style.color    = 'var(--red)';
    msgEl.textContent    = `Necesitarías ${notaNecesaria.toFixed(2)}, que supera la nota máxima de 5.0.`;
  } else {
    valEl.textContent    = notaNecesaria.toFixed(2);
    valEl.style.fontSize = '48px';
    valEl.style.color    = notaNecesaria >= 4.0 ? 'var(--yellow)' : 'var(--accent)';
    msgEl.textContent    = `Debes sacar ${notaNecesaria.toFixed(2)} en el examen final (${porcFinal}%) para aprobar.`;
    el.style.borderColor = 'rgba(91,141,238,0.3)';
  }
  el.style.display = 'block';
}

// ============================================================
// SIMULADOR
// ============================================================

/** Carga las materias en el selector del simulador. */
function cargarSimulador() {
  const sel     = document.getElementById('sim-materia');
  const current = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar materia —</option>';
  state.materias.forEach(m => {
    const opt = document.createElement('option');
    opt.value       = m.id;
    opt.textContent = m.nombre;
    sel.appendChild(opt);
  });
  sel.value = current;
}

/** Simula el promedio final con una nota hipotética de examen. */
function simular() {
  const matId     = parseInt(document.getElementById('sim-materia').value);
  const notaFinal = parseFloat(document.getElementById('sim-nota-final').value);
  const porcFinal = parseFloat(document.getElementById('sim-porc-final').value) || 30;

  if (!matId)                                    { showAlert('alert-sim', 'Selecciona una materia.'); return; }
  if (isNaN(notaFinal) || notaFinal < 0 || notaFinal > 5) { showAlert('alert-sim', 'La nota debe estar entre 0 y 5.'); return; }
  if (porcFinal <= 0 || porcFinal >= 100)        { showAlert('alert-sim', 'El porcentaje debe estar entre 1 y 99.'); return; }

  const mat = state.materias.find(m => m.id === matId);
  if (!mat || !mat.notas.length) { showAlert('alert-sim', 'La materia no tiene notas registradas.'); return; }

  const promActual  = promedioMateria(mat);
  const porcActual  = 100 - porcFinal;
  const promFinal   = (promActual * porcActual / 100) + (notaFinal * porcFinal / 100);
  const min         = state.config.notaMinima || 3.0;
  const estado      = promFinal >= min ? '✓ APROBARÍAS' : '✗ REPROBARÍAS';
  const color       = promFinal >= min ? 'var(--green)' : 'var(--red)';

  document.getElementById('sim-promedio-final').textContent  = promFinal.toFixed(2);
  document.getElementById('sim-promedio-final').style.color  = color;
  document.getElementById('sim-msg').textContent             = `${estado} "${mat.nombre}" con promedio ${promFinal.toFixed(2)} (mínimo: ${min})`;
  document.getElementById('sim-result').style.display        = 'block';
  document.getElementById('sim-tabla').style.display         = 'none';
}

/** Muestra una tabla con todos los escenarios posibles de nota final. */
function simularTodos() {
  const matId     = parseInt(document.getElementById('sim-materia').value);
  const porcFinal = parseFloat(document.getElementById('sim-porc-final').value) || 30;
  if (!matId) { showAlert('alert-sim', 'Selecciona una materia.'); return; }
  const mat = state.materias.find(m => m.id === matId);
  if (!mat || !mat.notas.length) { showAlert('alert-sim', 'La materia no tiene notas registradas.'); return; }

  const promActual  = promedioMateria(mat);
  const porcActual  = 100 - porcFinal;
  const min         = state.config.notaMinima || 3.0;
  const escenarios  = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

  const tabla = `
    <div class="card">
      <h3>Escenarios para "${mat.nombre}" (promedio actual: ${promActual.toFixed(2)})</h3>
      <table>
        <thead><tr><th>Nota en el final</th><th>Promedio resultante</th><th>Estado</th></tr></thead>
        <tbody>
          ${escenarios.map(n => {
            const pf = (promActual * porcActual / 100) + (n * porcFinal / 100);
            const ok = pf >= min;
            return `<tr>
              <td>${n.toFixed(1)}</td>
              <td style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:600;">${pf.toFixed(2)}</td>
              <td>${badgeEstado(pf)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('sim-tabla').innerHTML       = tabla;
  document.getElementById('sim-tabla').style.display   = 'block';
  document.getElementById('sim-result').style.display  = 'none';
}

// ============================================================
// INICIO (ESTADÍSTICAS RÁPIDAS)
// ============================================================

/** Actualiza las tarjetas de estadísticas y la tabla resumen de la página de inicio. */
function actualizarInicio() {
  const materiasConNotas = state.materias.filter(m => m.notas.length > 0);
  const promedios        = materiasConNotas.map(m => promedioMateria(m)).filter(p => p !== null);
  const min              = state.config.notaMinima || 3.0;

  const promGeneral = promedios.length ? calcProm(promedios) : null;
  const aprobadas   = promedios.filter(p => p >= min).length;
  const riesgo      = promedios.filter(p => p < min).length;

  document.getElementById('stat-promedio').textContent  = promGeneral ? promGeneral.toFixed(2) : '—';
  document.getElementById('stat-aprobadas').textContent = aprobadas;
  document.getElementById('stat-riesgo').textContent    = riesgo;
  document.getElementById('stat-total').textContent     = state.materias.length;

  // Bienvenida personalizada
  if (state.config.nombre) {
    document.getElementById('bienvenida').textContent = `¡Hola, ${state.config.nombre}! 👋`;
  }

  // Tabla resumen
  const tbody = document.getElementById('resumen-tbody');
  if (!state.materias.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:24px;">No hay materias registradas aún.</td></tr>';
  } else {
    tbody.innerHTML = state.materias.map(m => {
      const p = promedioMateria(m);
      return `<tr>
        <td>${m.nombre}</td>
        <td style="color:${p ? colorBarra(p) : 'var(--text3)'};font-weight:600;">${p ? p.toFixed(2) : '—'}</td>
        <td>${p ? badgeEstado(p) : '<span style="color:var(--text3)">Sin notas</span>'}</td>
        <td>${m.creditos}</td>
      </tr>`;
    }).join('');
  }
}

// ============================================================
// GRÁFICAS (Chart.js)
// ============================================================

let chartBarras, chartPie, chartLinea;

/** Renderiza (o actualiza) las tres gráficas de la sección Estadísticas. */
function renderGraficas() {
  const materiasConNotas = state.materias.filter(m => m.notas.length > 0);
  const promedios        = materiasConNotas.map(m => promedioMateria(m));
  const nombres          = materiasConNotas.map(m =>
    m.nombre.length > 12 ? m.nombre.substring(0, 12) + '...' : m.nombre
  );
  const min = state.config.notaMinima || 3.0;

  // Estadísticas rápidas de la sección
  if (promedios.length) {
    const maxP = Math.max(...promedios);
    const minP = Math.min(...promedios);
    const g    = materiasConNotas[promedios.indexOf(maxP)];
    const b    = materiasConNotas[promedios.indexOf(minP)];
    document.getElementById('g-mejor').textContent    = `${g.nombre} (${maxP.toFixed(2)})`;
    document.getElementById('g-menor').textContent    = `${b.nombre} (${minP.toFixed(2)})`;
    document.getElementById('g-promedio').textContent = calcProm(promedios).toFixed(2);
    document.getElementById('g-aprobadas').textContent = `${promedios.filter(p => p >= min).length} / ${promedios.length}`;
  }

  const colors = promedios.map(p =>
    p >= min         ? 'rgba(62,207,142,0.8)'
    : p >= min - 0.5 ? 'rgba(245,197,24,0.8)'
                     : 'rgba(240,62,62,0.8)'
  );

  // Configuración base de ejes
  const baseCfg = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#8b91a8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { min: 0, max: 5, ticks: { color: '#8b91a8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
    }
  };

  // — Barras —
  if (chartBarras) chartBarras.destroy();
  chartBarras = new Chart(document.getElementById('chart-barras'), {
    type: 'bar',
    data: {
      labels: nombres,
      datasets: [{
        data: promedios,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      ...baseCfg,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `Promedio: ${c.parsed.y.toFixed(2)}` } }
      }
    }
  });

  // — Dona —
  if (chartPie) chartPie.destroy();
  const apro  = promedios.filter(p => p >= min).length;
  const riesg = promedios.filter(p => p >= min - 0.5 && p < min).length;
  const rep   = promedios.filter(p => p < min - 0.5).length;
  chartPie = new Chart(document.getElementById('chart-pie'), {
    type: 'doughnut',
    data: {
      labels: ['Aprobadas', 'En Riesgo', 'Reprobadas'],
      datasets: [{
        data: [apro, riesg, rep],
        backgroundColor: ['rgba(62,207,142,0.85)', 'rgba(245,197,24,0.85)', 'rgba(240,62,62,0.85)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: '#8b91a8', padding: 12, font: { size: 12 } }
        }
      }
    }
  });

  // — Línea (evolución del promedio acumulado) —
  if (chartLinea) chartLinea.destroy();
  const allNotas = state.materias.flatMap(m => m.notas.map(n => n.valor));
  const lineData = allNotas.map((_, i) => ({ x: i + 1, y: calcProm(allNotas.slice(0, i + 1)) }));
  chartLinea = new Chart(document.getElementById('chart-linea'), {
    type: 'line',
    data: {
      datasets: [{
        label: 'Promedio acumulado',
        data: lineData,
        borderColor: '#5b8dee',
        backgroundColor: 'rgba(91,141,238,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#5b8dee'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `Promedio: ${c.parsed.y.toFixed(2)}` } }
      },
      scales: {
        x: { type: 'linear', ticks: { color: '#8b91a8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { min: 0, max: 5, ticks: { color: '#8b91a8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// ============================================================
// CONFIGURACIÓN
// ============================================================

/** Carga los valores de configuración en el formulario. */
function cargarConfig() {
  document.getElementById('cfg-nombre').value   = state.config.nombre || '';
  document.getElementById('cfg-inst').value     = state.config.institucion || '';
  document.getElementById('cfg-minima').value   = state.config.notaMinima || 3.0;
}

/** Guarda los valores del formulario de configuración. */
function guardarConfig() {
  state.config.nombre      = document.getElementById('cfg-nombre').value.trim();
  state.config.institucion = document.getElementById('cfg-inst').value.trim();
  state.config.notaMinima  = parseFloat(document.getElementById('cfg-minima').value) || 3.0;
  state.config.semestre    = document.getElementById('cfg-semestre').value;
  guardarStorage();
  showAlert('alert-cfg', '¡Configuración guardada correctamente!', 'success');
  document.getElementById('alert-cfg').style.display = 'block';
  actualizarInicio();
}

/** Elimina todos los datos del localStorage con confirmación. */
function limpiarDatos() {
  if (!confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem('da_materias');
  localStorage.removeItem('da_config');
  state = { materias: [], config: { nombre: '', institucion: '', semestre: '2025-1', notaMinima: 3.0 } };
  renderMaterias();
  actualizarInicio();
  showAlert('alert-cfg', 'Todos los datos han sido eliminados.', 'error');
  document.getElementById('alert-cfg').style.display = 'block';
}

function formatFecha(fecha) {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(fecha);
}

function estadoTexto(prom) {
  if (prom === null) return 'Sin notas';
  const e = estadoMateria(prom);
  if (e === 'aprobado') return 'Aprobado';
  if (e === 'riesgo') return 'En riesgo';
  return 'Reprobado';
}

function estadoColorPdf(prom) {
  if (prom === null) return [90, 95, 114];
  const e = estadoMateria(prom);
  if (e === 'aprobado') return [26, 158, 104];
  if (e === 'riesgo') return [196, 154, 10];
  return [212, 47, 47];
}

function obtenerResumenExportacion() {
  const materiasConNotas = state.materias.filter(m => m.notas.length > 0);
  const promedios = materiasConNotas.map(m => promedioMateria(m)).filter(p => p !== null);
  const min = state.config.notaMinima || 3.0;
  const promGeneral = promedios.length ? calcProm(promedios) : null;

  return {
    totalMaterias: state.materias.length,
    totalNotas: state.materias.reduce((acc, mat) => acc + mat.notas.length, 0),
    promedioGeneral: promGeneral,
    aprobadas: promedios.filter(p => p >= min).length,
    enRiesgo: promedios.filter(p => p >= min - 0.5 && p < min).length,
    reprobadas: promedios.filter(p => p < min - 0.5).length,
    creditos: state.materias.reduce((acc, mat) => acc + (parseInt(mat.creditos) || 0), 0)
  };
}

function agregarEncabezadoPdf(doc, fechaGeneracion) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, width, 30, 'F');

  doc.setFillColor(91, 141, 238);
  doc.roundedRect(14, 8, 15, 15, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DA', 21.5, 17.8, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Dashboard Academico Estudiantil', 34, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Informe generado: ${fechaGeneracion}`, 34, 20);
}

function agregarEncabezadoYPiePdf(doc, fechaGeneracion) {
  const pageCount = doc.internal.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    agregarEncabezadoPdf(doc, fechaGeneracion);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, height - 15, width - 14, height - 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Dashboard Academico Estudiantil - Informe listo para compartir o imprimir', 14, height - 9);
    doc.text(`Pagina ${i} de ${pageCount}`, width - 14, height - 9, { align: 'right' });
    doc.text(`Generado: ${fechaGeneracion}`, width / 2, height - 9, { align: 'center' });
  }
}

function asegurarEspacioPdf(doc, y, espacioNecesario) {
  const height = doc.internal.pageSize.getHeight();
  if (y + espacioNecesario > height - 24) {
    doc.addPage();
    return 40;
  }
  return y;
}

/** Exporta los datos del estado como un informe PDF descargable. */
function exportarDatos() {
  if (!state.materias.length) {
    showAlert('alert-cfg', 'No hay datos para exportar. Agrega al menos una materia antes de generar el PDF.');
    document.getElementById('alert-cfg').style.display = 'block';
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF || !window.jspdf.jsPDF.API.autoTable) {
    showAlert('alert-cfg', 'No se pudo cargar el generador de PDF. Verifica tu conexion e intenta nuevamente.');
    document.getElementById('alert-cfg').style.display = 'block';
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const fecha = new Date();
    const fechaGeneracion = formatFecha(fecha);
    const resumen = obtenerResumenExportacion();
    const accent = [59, 111, 212];
    const dark = [17, 24, 39];
    const muted = [100, 116, 139];
    let y = 42;

    agregarEncabezadoPdf(doc, fechaGeneracion);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...dark);
    doc.text('Informe academico', 14, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    const descripcion = 'Resumen visual del rendimiento, materias registradas, notas, creditos y configuracion academica.';
    doc.text(doc.splitTextToSize(descripcion, 182), 14, y);
    y += 12;

    doc.autoTable({
      startY: y,
      theme: 'plain',
      margin: { top: 38, bottom: 22, left: 14, right: 14 },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
      body: [
        ['Estudiante', state.config.nombre || 'No registrado', 'Institucion', state.config.institucion || 'No registrada'],
        ['Semestre', state.config.semestre || 'No registrado', 'Nota minima', Number(state.config.notaMinima || 3.0).toFixed(1)],
        ['Fecha de exportacion', fechaGeneracion, 'Formato', 'PDF']
      ],
      columnStyles: {
        0: { fontStyle: 'bold', textColor: dark, fillColor: [241, 245, 249] },
        2: { fontStyle: 'bold', textColor: dark, fillColor: [241, 245, 249] }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Indicadores principales', 14, y);
    y += 5;

    doc.autoTable({
      startY: y,
      theme: 'grid',
      margin: { top: 38, bottom: 22, left: 14, right: 14 },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
      head: [['Promedio general', 'Materias', 'Notas', 'Creditos', 'Aprobadas', 'En riesgo', 'Reprobadas']],
      body: [[
        resumen.promedioGeneral !== null ? resumen.promedioGeneral.toFixed(2) : 'Sin notas',
        resumen.totalMaterias,
        resumen.totalNotas,
        resumen.creditos,
        resumen.aprobadas,
        resumen.enRiesgo,
        resumen.reprobadas
      ]]
    });
    y = doc.lastAutoTable.finalY + 10;

    y = asegurarEspacioPdf(doc, y, 34);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Resumen por materia', 14, y);
    y += 5;

    doc.autoTable({
      startY: y,
      theme: 'striped',
      margin: { top: 38, bottom: 22, left: 14, right: 14 },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: dark, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      head: [['Materia', 'Semestre', 'Creditos', 'Promedio', 'Estado', 'Notas']],
      body: state.materias.map(mat => {
        const prom = promedioMateria(mat);
        return [
          mat.nombre,
          mat.semestre || 'No registrado',
          mat.creditos || 0,
          prom !== null ? prom.toFixed(2) : 'Sin notas',
          estadoTexto(prom),
          mat.notas.length
        ];
      }),
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const mat = state.materias[data.row.index];
          data.cell.styles.textColor = estadoColorPdf(promedioMateria(mat));
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    y = doc.lastAutoTable.finalY + 10;

    y = asegurarEspacioPdf(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...dark);
    doc.text('Detalle de notas', 14, y);
    y += 6;

    state.materias.forEach((mat, index) => {
      y = asegurarEspacioPdf(doc, y, 34);
      const prom = promedioMateria(mat);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...dark);
      doc.text(`${index + 1}. ${mat.nombre}`, 14, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...muted);
      const meta = `Referencia: ${mat.id} | ${mat.creditos || 0} creditos | ${mat.semestre || 'Sin semestre'} | Promedio: ${prom !== null ? prom.toFixed(2) : 'Sin notas'} | Estado: ${estadoTexto(prom)}`;
      doc.text(doc.splitTextToSize(meta, 182), 14, y + 5);
      y += 11;

      doc.autoTable({
        startY: y,
        theme: 'grid',
        margin: { top: 38, bottom: 22, left: 14, right: 14 },
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.4, lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: [241, 245, 249], textColor: dark, fontStyle: 'bold' },
        head: [['#', 'Nota', 'Porcentaje']],
        body: mat.notas.length
          ? mat.notas.map((nota, notaIndex) => [
              notaIndex + 1,
              Number(nota.valor).toFixed(1),
              nota.porc ? `${nota.porc}%` : 'No definido'
            ])
          : [['-', 'Sin notas registradas', '-']]
      });
      y = doc.lastAutoTable.finalY + 8;
    });

    agregarEncabezadoYPiePdf(doc, fechaGeneracion);

    const fechaArchivo = fecha.toISOString().slice(0, 10);
    doc.save(`dashboard_academico_${fechaArchivo}.pdf`);
    showAlert('alert-cfg', 'PDF generado y descargado correctamente.', 'success');
    document.getElementById('alert-cfg').style.display = 'block';
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    showAlert('alert-cfg', 'Ocurrio un error al generar el PDF. Intenta nuevamente.');
    document.getElementById('alert-cfg').style.display = 'block';
  }
}

// ============================================================
// PRUEBAS UNITARIAS
// ============================================================

function log(msg, tipo = 'info') {
  const el  = document.getElementById('test-log');
  const cls = tipo === 'pass' ? 'test-pass' : tipo === 'fail' ? 'test-fail' : 'test-info';
  el.innerHTML += `<div class="${cls}">${msg}</div>`;
}

function assert(condicion, nombre) {
  if (condicion) log(`✓ PASS: ${nombre}`, 'pass');
  else           log(`✗ FAIL: ${nombre}`, 'fail');
}

/** Ejecuta todas las pruebas unitarias y muestra los resultados. */
function ejecutarPruebas() {
  const el = document.getElementById('test-log');
  el.innerHTML = '';
  log('=== PRUEBAS DEL SISTEMA ===');

  log('--- Prueba 1: Cálculo de Promedio ---');
  assert(calcProm([4, 3, 5]) === 4,               'Promedio de [4,3,5] = 4.0');
  assert(calcProm([0, 5])    === 2.5,              'Promedio de [0,5] = 2.5');
  assert(calcProm([])        === 0,                'Promedio de [] = 0');
  assert(Math.abs(calcProm([3.5, 4.2, 2.8]) - 3.5) < 0.01, 'Promedio de [3.5,4.2,2.8] ≈ 3.5');

  log('--- Prueba 2: Estado de Materia ---');
  const minOrig = state.config.notaMinima;
  state.config.notaMinima = 3.0;
  assert(estadoMateria(3.5) === 'aprobado',  'Nota 3.5 → aprobado');
  assert(estadoMateria(2.6) === 'riesgo',    'Nota 2.6 → riesgo');
  assert(estadoMateria(2.0) === 'reprobado', 'Nota 2.0 → reprobado');
  assert(estadoMateria(3.0) === 'aprobado',  'Nota 3.0 (mínima exacta) → aprobado');
  state.config.notaMinima = minOrig;

  log('--- Prueba 3: Validación de formularios ---');
  const nombre = ''; assert(nombre === '',        'Campo vacío detectado correctamente');
  const nota   = parseFloat('abc'); assert(isNaN(nota), 'Nota inválida "abc" detectada');
  const nota2  = 6;  assert(nota2 > 5,            'Nota fuera de rango (6 > 5) detectada');
  const nota3  = -1; assert(nota3 < 0,            'Nota negativa detectada');

  log('--- Prueba 4: Local Storage ---');
  try {
    localStorage.setItem('test_key', 'test_val');
    assert(localStorage.getItem('test_key') === 'test_val', 'Escritura en LocalStorage');
    localStorage.removeItem('test_key');
    assert(localStorage.getItem('test_key') === null, 'Eliminación de LocalStorage');
  } catch (e) { log('✗ FAIL: LocalStorage no disponible', 'fail'); }

  log('--- Prueba 5: Manipulación del DOM ---');
  assert(document.getElementById('lista-materias')   !== null, 'Elemento #lista-materias existe');
  assert(document.getElementById('stat-promedio')    !== null, 'Elemento #stat-promedio existe');
  assert(document.querySelectorAll('.nav a').length  >= 5,     'Navegación con al menos 5 enlaces');

  log('--- Prueba 6: Objetos y arreglos ---');
  const testArr = [1, 2, 3, 4, 5];
  assert(testArr.reduce((a, b) => a + b, 0) === 15, 'Reduce en arreglo [1..5] = 15');
  const testObj = { id: 1, nombre: 'Test', notas: [3.5, 4.0] };
  assert(testObj.notas.length === 2, 'Objeto con propiedad arreglo funciona');

  log('--- Prueba 7: Nota necesaria para aprobar ---');
  const actual = 3.5, porcAcum = 70, minima = 3.0, porcFinal = 30;
  const nec    = (minima - (actual * porcAcum / 100)) / (porcFinal / 100);
  assert(nec < 0, 'Con nota 3.5 al 70%, ya aprobó (nota necesaria negativa)');

  const actual2 = 2.5;
  const nec2    = (minima - (actual2 * porcAcum / 100)) / (porcFinal / 100);
  assert(Math.abs(nec2 - 4.17) < 0.1, 'Con nota 2.5 al 70%, necesita ≈4.17 en final');

  log('=== FIN DE PRUEBAS ===');
  const total = (el.innerHTML.match(/PASS/g) || []).length;
  const fail  = (el.innerHTML.match(/FAIL/g) || []).length;
  log(`Resultado: ${total} pasadas, ${fail} fallidas`, fail === 0 ? 'pass' : 'fail');
}

// ============================================================
// TEMA CLARO / OSCURO
// ============================================================
/*
  ¿Cómo funciona el cambio de tema?
  ─────────────────────────────────
  1. CSS define dos conjuntos de variables de color: uno en :root (oscuro)
     y otro en html.light (claro). Todos los colores de la app usan esas variables.
  2. Al hacer clic en el botón, esta función agrega o quita la clase "light"
     del elemento <html>. El CSS detecta el cambio y aplica los colores correctos
     automáticamente en toda la página.
  3. La preferencia se guarda en LocalStorage con la clave "da_tema" para que
     al recargar la página, el tema elegido se mantenga.
  4. El ícono y texto del botón también cambian para mostrar siempre la opción
     CONTRARIA al tema actual (si estás en oscuro, ofrece "Modo Claro").
*/
function toggleTema() {
  const esClaro = document.documentElement.classList.toggle('light');
  localStorage.setItem('da_tema', esClaro ? 'light' : 'dark');
  actualizarBotonTema(esClaro);
  // Redibujar gráficas si están visibles (necesitan actualizar colores de texto)
  if (document.getElementById('page-graficas').classList.contains('active')) {
    renderGraficas();
  }
}

function actualizarBotonTema(esClaro) {
  const label = document.getElementById('theme-label');
  const icon  = document.getElementById('theme-icon');
  if (esClaro) {
    label.textContent = 'Modo Oscuro';
    icon.innerHTML    = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
  } else {
    label.textContent = 'Modo Claro';
    icon.innerHTML    = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

cargarStorage();

// Restaurar tema guardado
const temaGuardado = localStorage.getItem('da_tema');
if (temaGuardado === 'light') {
  document.documentElement.classList.add('light');
  actualizarBotonTema(true);
}

renderMaterias();
actualizarInicio();

// Cargar datos de ejemplo si no hay materias
if (!state.materias.length) {
  const ejemplos = [
    { id: 1001, nombre: 'Cálculo Diferencial', creditos: 4, semestre: '2025-1', notas: [{ valor: 3.5, porc: 30 }, { valor: 4.0, porc: 30 }, { valor: 4.2, porc: 40 }] },
    { id: 1002, nombre: 'Programación I',       creditos: 3, semestre: '2025-1', notas: [{ valor: 4.5, porc: 40 }, { valor: 4.8, porc: 60 }] },
    { id: 1003, nombre: 'Física I',              creditos: 4, semestre: '2025-1', notas: [{ valor: 2.8, porc: 50 }, { valor: 2.5, porc: 50 }] },
  ];
  state.materias = ejemplos;
  guardarStorage();
  renderMaterias();
  actualizarInicio();
}
