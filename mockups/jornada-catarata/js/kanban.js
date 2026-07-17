/* Central de Planejamento — Kanban / Lista / Fila */

const state = {
  view: 'kanban',
  busca: '',
  filtroPrioridade: 'Todas',
  filtroSla: 'Todas',
  filtroMedico: 'Todos',
}

function solicitacoesAtivas() {
  return MOCK.solicitacoes.filter((s) => s.estado !== 'Concluída' && s.estado !== 'Cirurgia' && s.estado !== 'Pós-op')
}

function aplicarFiltros(lista) {
  return lista.filter((s) => {
    if (state.busca) {
      const q = state.busca.toLowerCase()
      if (!s.pacienteNome.toLowerCase().includes(q) && !s.medicoNome.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false
    }
    if (state.filtroPrioridade !== 'Todas' && s.prioridade !== state.filtroPrioridade) return false
    if (state.filtroSla !== 'Todas' && s.slaStatus !== state.filtroSla) return false
    if (state.filtroMedico !== 'Todos' && s.medicoNome !== state.filtroMedico) return false
    return true
  })
}

function renderKpiStrip() {
  const ativas = solicitacoesAtivas()
  const emAtraso = ativas.filter((s) => s.slaStatus === 'vencido').length
  const slaCritico = ativas.filter((s) => s.slaStatus === 'risco' || s.slaStatus === 'vencido').length
  const aguardandoExame = ativas.filter((s) => s.colunaKanban === 'Aguardando Exames').length
  const aguardandoAutorizacao = ativas.filter((s) => s.colunaKanban === 'Autorização').length
  const cirurgiasHoje = MOCK.solicitacoes.filter((s) => s.cirurgiaData === new Date('2026-07-16').toISOString().slice(0, 10)).length

  const kpis = [
    { label: 'Total ativo', valor: ativas.length },
    { label: 'Em atraso', valor: emAtraso, destaque: emAtraso > 0 },
    { label: 'SLA crítico', valor: slaCritico, destaque: slaCritico > 0 },
    { label: 'Aguardando exame', valor: aguardandoExame },
    { label: 'Aguardando autorização', valor: aguardandoAutorizacao },
    { label: 'Cirurgias hoje', valor: cirurgiasHoje },
  ]
  document.getElementById('kpi-strip').innerHTML = kpis.map((k) => `
    <div class="kpi-tile ${k.destaque ? 'destaque' : ''}">
      <div class="valor">${k.valor}</div>
      <div class="label">${k.label}</div>
    </div>
  `).join('')
}

function renderFilterBar() {
  const prioridades = ['Todas', 'P1', 'P2', 'P3']
  const slas = ['Todas', 'ok', 'risco', 'vencido']
  const slaLabels = { ok: 'SLA ok', risco: 'SLA em risco', vencido: 'SLA vencido' }
  const medicos = ['Todos', ...MOCK.MEDICOS]

  const el = document.getElementById('filter-bar')
  el.innerHTML = `
    <span class="chip ${state.filtroPrioridade === 'Todas' ? '' : 'active'}">
      <select id="f-prioridade">
        ${prioridades.map((p) => `<option value="${p}" ${state.filtroPrioridade === p ? 'selected' : ''}>${p === 'Todas' ? 'Prioridade: todas' : p}</option>`).join('')}
      </select>
    </span>
    <span class="chip ${state.filtroSla === 'Todas' ? '' : 'active'}">
      <select id="f-sla">
        ${slas.map((s) => `<option value="${s}" ${state.filtroSla === s ? 'selected' : ''}>${s === 'Todas' ? 'SLA: todos' : slaLabels[s]}</option>`).join('')}
      </select>
    </span>
    <span class="chip ${state.filtroMedico === 'Todos' ? '' : 'active'}">
      <select id="f-medico">
        ${medicos.map((m) => `<option value="${m}" ${state.filtroMedico === m ? 'selected' : ''}>${m === 'Todos' ? 'Médico: todos' : m}</option>`).join('')}
      </select>
    </span>
  `
  el.querySelector('#f-prioridade').addEventListener('change', (e) => { state.filtroPrioridade = e.target.value; renderAll() })
  el.querySelector('#f-sla').addEventListener('change', (e) => { state.filtroSla = e.target.value; renderAll() })
  el.querySelector('#f-medico').addEventListener('change', (e) => { state.filtroMedico = e.target.value; renderAll() })
}

function cardHtml(s) {
  const cardClasses = ['solicitacao-card']
  if (s.slaStatus === 'vencido') cardClasses.push('card-vencido')
  else if (s.slaStatus === 'risco') cardClasses.push('card-risco')
  if (s.alertasAtivos.some((a) => a.categoria === 'clinico')) cardClasses.push('card-alerta-clinico')

  const iconesAlerta = s.alertasAtivos.map((a) => `<span title="${ALERTA_ICONES[a.categoria]?.label || a.categoria}">${ALERTA_ICONES[a.categoria]?.emoji || '•'}</span>`).join('')

  return `
    <div class="${cardClasses.join(' ')}" draggable="true" data-id="${s.id}" onclick="window.location.href='solicitacao.html?id=${s.id}'">
      <div class="card-header-row">
        <span class="card-paciente-nome">${escapeHtml(s.pacienteNome)}</span>
        <span class="badge badge-olho-${s.olho}">${s.olho}</span>
      </div>
      <div class="card-meta-row">
        <span class="card-codigo">${s.id}</span>
        <span>${escapeHtml(s.medicoNome)}</span>
      </div>
      <div class="sla-bar-wrap ${slaColorClass(s.slaStatus)}">
        <div class="sla-bar-track"><div class="sla-bar-fill" style="width:${Math.min(100, s.slaPercentual)}%"></div></div>
        <span class="sla-bar-label">${s.slaLabel}</span>
      </div>
      ${s.pendenciasProximaEtapa.length ? `<div class="card-pendencias">⛔ ${s.pendenciasProximaEtapa.length} pendência(s)</div>` : ''}
      <div class="card-footer-row">
        <span class="badge badge-prioridade-${s.prioridade}">${s.prioridade}</span>
        <span class="card-tempo-parado">⏱ ${s.tempoParadoDias}d parado</span>
        <span class="card-score-ia ${s.scoreIA > 70 ? 'alto' : ''}" title="Score de risco (IA)">IA ${s.scoreIA}</span>
      </div>
      <div class="card-footer-row">
        <div class="card-alertas-icons">${iconesAlerta}</div>
        <span class="card-avatar" title="${escapeHtml(s.responsavelAtual.nome)}">${s.responsavelAtual.iniciais}</span>
      </div>
    </div>
  `
}

function renderKanban() {
  const ativas = aplicarFiltros(solicitacoesAtivas())
  const board = document.createElement('div')
  board.className = 'kanban-board'
  board.innerHTML = MOCK.COLUNAS_KANBAN.map((col) => {
    const itens = ativas.filter((s) => s.colunaKanban === col)
    return `
      <div class="kanban-col" data-col="${col}">
        <div class="kanban-col-header">
          <span>${col}</span>
          <span class="kanban-col-count">${itens.length}</span>
        </div>
        <div class="kanban-col-body" data-col-body="${col}">
          ${itens.length ? itens.map(cardHtml).join('') : '<div class="empty-state" style="padding:1rem;">Nenhuma solicitação</div>'}
        </div>
      </div>
    `
  }).join('')

  const wrap = document.createElement('div')
  wrap.className = 'kanban-scroll-wrap'
  wrap.appendChild(board)

  const container = document.getElementById('view-kanban')
  container.innerHTML = ''
  container.appendChild(wrap)
  attachDragAndDrop()
  attachKanbanScrollHint(wrap, board)
}

function attachKanbanScrollHint(wrap, board) {
  const update = () => {
    const overflowing = board.scrollWidth > board.clientWidth + 1
    wrap.classList.toggle('has-overflow', overflowing)
    wrap.classList.toggle('scrolled-end', board.scrollLeft + board.clientWidth >= board.scrollWidth - 2)
  }
  board.addEventListener('scroll', update)
  window.addEventListener('resize', update)
  update()
}

function attachDragAndDrop() {
  document.querySelectorAll('.solicitacao-card').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      e.stopPropagation()
      card.classList.add('dragging')
      e.dataTransfer.setData('text/plain', card.dataset.id)
    })
    card.addEventListener('dragend', () => card.classList.remove('dragging'))
  })
  document.querySelectorAll('.kanban-col').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over') })
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'))
    col.addEventListener('drop', (e) => {
      e.preventDefault()
      col.classList.remove('drag-over')
      const id = e.dataTransfer.getData('text/plain')
      const destino = col.dataset.col
      moverSolicitacao(id, destino)
    })
  })
}

function moverSolicitacao(id, destino) {
  const s = findSolicitacao(id)
  if (!s || s.colunaKanban === destino) return
  const origemIdx = MOCK.COLUNAS_KANBAN.indexOf(s.colunaKanban)
  const destinoIdx = MOCK.COLUNAS_KANBAN.indexOf(destino)

  if (destinoIdx === origemIdx + 1) {
    if (s.pendenciasProximaEtapa.length > 0) {
      abrirModalAviso({
        titulo: `Gate de "${s.colunaKanban}" não cumprido`,
        itens: s.pendenciasProximaEtapa,
      })
      return
    }
    s.colunaKanban = destino
    s.pendenciasProximaEtapa = MOCK.GATE_LABELS[destino] ? MOCK.GATE_LABELS[destino].slice(0, 1).filter(() => false) : []
    s.timeline.push({ timestamp: new Date().toISOString(), tipo: 'Manual', origem: 'usuario', descricao: `Etapa avançada manualmente (Kanban) para "${destino}"` })
    toast(`${s.pacienteNome} avançou para "${destino}"`)
    renderAll()
  } else if (destinoIdx < origemIdx) {
    abrirModalMotivo({
      titulo: 'Retorno de etapa',
      descricao: `Mover "${s.pacienteNome}" de volta para "${destino}" exige justificativa (registrado como evento retroativo na Timeline).`,
      onConfirm: (motivo) => {
        s.colunaKanban = destino
        s.timeline.push({ timestamp: new Date().toISOString(), tipo: 'Manual', origem: 'usuario', descricao: `Retorno para "${destino}" — Justificativa: ${motivo}` })
        toast('Retorno registrado na timeline')
        renderAll()
      },
    })
  } else {
    abrirModalAviso({
      titulo: 'Não é possível pular etapas',
      itens: [`É necessário cumprir os gates de "${MOCK.COLUNAS_KANBAN[origemIdx + 1]}" antes de chegar em "${destino}"`],
    })
  }
}

function renderLista() {
  const ativas = aplicarFiltros(solicitacoesAtivas())
  const html = `
    <div class="card" style="overflow-x:auto;">
      <table class="lista-tabela">
        <thead><tr>
          <th>Paciente</th><th>Olho</th><th>Médico</th><th>Etapa</th><th>Prioridade</th><th>SLA</th><th>Parado</th>
        </tr></thead>
        <tbody>
          ${ativas.map((s) => `
            <tr onclick="window.location.href='solicitacao.html?id=${s.id}'">
              <td><strong>${escapeHtml(s.pacienteNome)}</strong><br/><span style="color:var(--slate-400); font-size:.72rem;">${s.id}</span></td>
              <td><span class="badge badge-olho-${s.olho}">${s.olho}</span></td>
              <td>${escapeHtml(s.medicoNome)}</td>
              <td>${s.estado}</td>
              <td><span class="badge badge-prioridade-${s.prioridade}">${s.prioridade}</span></td>
              <td><span class="sla-bar-label ${slaColorClass(s.slaStatus)}" style="display:inline-block;">${s.slaLabel}</span></td>
              <td>${s.tempoParadoDias}d</td>
            </tr>
          `).join('') || `<tr><td colspan="7" class="empty-state">Nenhuma solicitação encontrada</td></tr>`}
        </tbody>
      </table>
    </div>
  `
  document.getElementById('view-lista').innerHTML = html
}

function scoreFila(s) {
  let score = s.scoreIA
  if (s.slaStatus === 'vencido') score += 40
  else if (s.slaStatus === 'risco') score += 18
  if (s.prioridade === 'P1') score += 25
  else if (s.prioridade === 'P2') score += 10
  score += s.tempoParadoDias * 2
  return score
}

function renderFila() {
  const ativas = aplicarFiltros(solicitacoesAtivas()).slice().sort((a, b) => scoreFila(b) - scoreFila(a))
  const html = ativas.map((s, i) => `
    <div class="card" style="padding: 0.85rem 1rem; margin-bottom: 0.6rem; display:flex; align-items:center; gap: 1rem;">
      <div style="font-weight:800; color:var(--slate-300); font-size:1.1rem; width:1.6rem;">${i + 1}</div>
      <div style="flex:1; cursor:pointer;" onclick="window.location.href='solicitacao.html?id=${s.id}'">
        <div style="display:flex; align-items:center; gap:.5rem;">
          <strong>${escapeHtml(s.pacienteNome)}</strong>
          <span class="badge badge-olho-${s.olho}">${s.olho}</span>
          <span class="badge badge-prioridade-${s.prioridade}">${s.prioridade}</span>
        </div>
        <div style="font-size:.78rem; color:var(--slate-500); margin-top:.15rem;">
          ${s.estado} · ${escapeHtml(s.medicoNome)} · <span class="${slaColorClass(s.slaStatus)}" style="font-weight:700;">${s.slaLabel}</span> · score ${scoreFila(s)}
        </div>
      </div>
      <div style="display:flex; gap:.4rem;">
        <button class="btn-secondary" onclick="event.stopPropagation(); toast('Atribuído a você (demo)')">Atribuir</button>
        <button class="btn-secondary" onclick="event.stopPropagation(); toast('Comentário adicionado (demo)')">Comentar</button>
      </div>
    </div>
  `).join('') || `<div class="empty-state">Nenhuma solicitação encontrada</div>`
  document.getElementById('view-fila').innerHTML = html
}

function renderAll() {
  renderKpiStrip()
  renderFilterBar()
  if (state.view === 'kanban') renderKanban()
  if (state.view === 'lista') renderLista()
  if (state.view === 'fila') renderFila()
}

function setupViewSwitch() {
  document.querySelectorAll('#view-switch button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view
      document.querySelectorAll('#view-switch button').forEach((b) => b.classList.toggle('active', b === btn))
      document.getElementById('view-kanban').style.display = state.view === 'kanban' ? '' : 'none'
      document.getElementById('view-lista').style.display = state.view === 'lista' ? '' : 'none'
      document.getElementById('view-fila').style.display = state.view === 'fila' ? '' : 'none'
      renderAll()
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('central')
  setupViewSwitch()
  document.getElementById('busca').addEventListener('input', (e) => { state.busca = e.target.value; renderAll() })
  renderAll()
})
