/* Detalhe da Solicitação — layout 3 colunas + rodapé (pág. 8 do PDF) */

let ATUAL = null

function checklistItemHtml(item) {
  return `
    <div class="checklist-item ${item.status}">
      <span class="checklist-dot"></span>
      <span class="label">${escapeHtml(item.item)}</span>
    </div>
  `
}

function alertCardHtml(a) {
  const icone = ALERTA_ICONES[a.categoria] || { emoji: '•', label: a.categoria }
  return `
    <div class="alert-card sev-${a.severidade}">
      <span>${icone.emoji}</span>
      <div>
        <div class="cat">${icone.label} · ${a.severidade}</div>
        <div class="msg">${escapeHtml(a.mensagem)}</div>
        <div class="dest">Destinatário: ${escapeHtml(a.destinatario)}</div>
      </div>
    </div>
  `
}

function taskItemHtml(t) {
  return `
    <div class="task-item">
      <div class="titulo">${escapeHtml(t.titulo)}</div>
      <div class="meta">
        <span class="task-origem ${t.origem}">${t.origem}</span>
        <span>${escapeHtml(t.responsavel)}</span>
        <span>Prazo: ${t.prazo}</span>
        <span class="badge badge-prioridade-${t.prioridade}">${t.prioridade}</span>
      </div>
    </div>
  `
}

function itemRowHtml(nome, status) {
  return `
    <div class="item-row">
      <span>${escapeHtml(nome)}</span>
      <span class="status-pill ${status}">${status}</span>
    </div>
  `
}

function miniTimelineHtml(timeline) {
  const ultimos = timeline.slice(-5).reverse()
  return `<ul class="mini-timeline">${ultimos.map((e) => `
    <li><span class="t-time">${formatDateTime(e.timestamp)}</span>${escapeHtml(e.descricao)}</li>
  `).join('')}</ul>`
}

function timelineEventHtml(e) {
  return `
    <li class="timeline-event origem-${e.origem}">
      <div class="t-time">${formatDateTime(e.timestamp)}</div>
      <div class="t-desc">${escapeHtml(e.descricao)}</div>
      <div class="t-tipo">${e.tipo} · origem: ${e.origem}</div>
    </li>
  `
}

function render() {
  const s = ATUAL
  const painelEsquerdo = `
    <div class="painel-esquerdo">
      <h2>${escapeHtml(s.pacienteNome)}</h2>
      <p class="sub">${s.idade} anos · ${escapeHtml(s.convenio)}</p>
      <div class="info-row"><span>Olho</span><span class="badge badge-olho-${s.olho}">${s.olho}</span></div>
      <div class="info-row"><span>Médico</span><span>${escapeHtml(s.medicoNome)}</span></div>
      <div class="info-row"><span>Status</span><span class="badge badge-status">${s.estado}</span></div>
      <div class="info-row"><span>Prioridade</span><span class="badge badge-prioridade-${s.prioridade}">${s.prioridade}</span></div>
      <div class="info-row"><span>Centro</span><span>${escapeHtml(s.centroReferencia)}</span></div>
      <div style="margin: .9rem 0;">
        <div class="sla-bar-wrap ${slaColorClass(s.slaStatus)}">
          <div class="sla-bar-track"><div class="sla-bar-fill" style="width:${Math.min(100, s.slaPercentual)}%"></div></div>
          <span class="sla-bar-label">${s.slaLabel}</span>
        </div>
      </div>
      <h3 style="color:#fff; font-size:.78rem; text-transform:uppercase; letter-spacing:.03em; opacity:.7; margin: 1rem 0 .5rem;">Mini-timeline</h3>
      ${miniTimelineHtml(s.timeline)}
    </div>
  `

  const painelCentral = `
    <div class="painel-central">
      <div class="section-card">
        <h3>Checklist — ${s.colunaKanban || s.estado}</h3>
        ${s.checklist.map(checklistItemHtml).join('') || '<div class="empty-state">Nenhum item de checklist</div>'}
      </div>
      <div class="section-card">
        <h3>Alertas ativos</h3>
        ${s.alertas.length ? s.alertas.map(alertCardHtml).join('<div style="height:.5rem"></div>') : '<div class="empty-state">Nenhum alerta ativo</div>'}
      </div>
      <div class="section-card">
        <h3>Tarefas atribuídas</h3>
        ${s.tarefas.length ? s.tarefas.map(taskItemHtml).join('') : '<div class="empty-state">Nenhuma tarefa pendente</div>'}
      </div>
    </div>
  `

  const painelDireito = `
    <div class="painel-direito">
      <div class="section-card">
        <h3>Exames</h3>
        ${s.exames.map((e) => itemRowHtml(e.nome, e.status)).join('')}
      </div>
      <div class="section-card">
        <h3>Documentos</h3>
        ${s.documentos.map((d) => itemRowHtml(d.nome, d.status)).join('')}
      </div>
      <div class="section-card">
        <h3>LIO selecionada</h3>
        ${s.lioSelecionada
          ? `<p style="font-size:.88rem; font-weight:700; color:var(--slate-800); margin:0;">${escapeHtml(s.lioSelecionada)}</p>`
          : '<div class="empty-state">Ainda não definida</div>'}
      </div>
      <div class="section-card">
        <h3>Calculadoras</h3>
        <button class="btn-secondary" style="width:100%;" onclick="toast('Abriria a calculadora de LIO real do Voiston Hub (integração futura)')">Abrir calculadora de LIO →</button>
      </div>
    </div>
  `

  const acoes = `
    <div class="card" style="padding: .9rem 1.1rem; margin: 1rem 0; display:flex; flex-wrap:wrap; gap:.6rem;">
      <button class="btn-primary" id="acao-avancar">Avançar etapa</button>
      <button class="btn-secondary" id="acao-atribuir">Atribuir responsável</button>
      <button class="btn-secondary" id="acao-comentar">Adicionar comentário</button>
      <button class="btn-secondary" id="acao-upload">Fazer upload</button>
      <button class="btn-secondary" id="acao-autorizacao">Solicitar autorização</button>
      <button class="btn-secondary" id="acao-suspender">Suspender</button>
      <button class="btn-secondary" id="acao-retornar">Retornar etapa</button>
      <button class="btn-danger" id="acao-cancelar">Cancelar</button>
    </div>
  `

  const rodape = `
    <div class="rodape">
      <button class="rodape-toggle" id="rodape-toggle">
        <span>Comentários · Histórico · Auditoria · Timeline completa</span>
        <span id="rodape-seta">▾</span>
      </button>
      <div class="rodape-content" id="rodape-content">
        <div class="section-card" style="margin-bottom:1rem;">
          <h3>Comentários</h3>
          <div id="lista-comentarios">
            ${s.comentarios.map((c) => `
              <div class="comment">
                <div class="autor">${escapeHtml(c.autor)}</div>
                <div class="texto">${escapeHtml(c.texto)}</div>
              </div>
            `).join('') || '<div class="empty-state">Sem comentários ainda</div>'}
          </div>
          <div style="display:flex; gap:.5rem; margin-top:.75rem;">
            <input id="novo-comentario" placeholder="Escreva um comentário... use @ para mencionar" style="flex:1; padding:.5rem .7rem; border:1px solid var(--slate-300); border-radius: var(--radius-sm); font-size:.85rem;" />
            <button class="btn-primary" id="btn-comentar">Enviar</button>
          </div>
        </div>

        <div class="section-card" style="margin-bottom:1rem;">
          <h3>Auditoria de acessos</h3>
          <div class="item-row"><span>${escapeHtml(s.medicoNome)}</span><span style="color:var(--slate-400); font-size:.75rem;">${formatDateTime(new Date().toISOString())} · IP 10.0.4.22</span></div>
          <div class="item-row"><span>Secretária do centro</span><span style="color:var(--slate-400); font-size:.75rem;">${formatDateTime(s.timeline[0]?.timestamp)} · IP 10.0.4.31</span></div>
        </div>

        <div class="section-card">
          <h3>Timeline completa (append-only)</h3>
          <div class="filter-bar" style="margin-bottom: .85rem;">
            <span class="chip"><select id="tl-filtro-tipo">
              <option value="Todos">Tipo: todos</option>
              <option>Manual</option><option>Automático</option><option>IA</option><option>Sistema</option>
            </select></span>
            <span class="chip"><select id="tl-filtro-origem">
              <option value="Todos">Origem: todas</option>
              <option value="usuario">Usuário</option><option value="sistema">Sistema</option><option value="ia">IA</option>
            </select></span>
          </div>
          <ul class="timeline-list" id="timeline-lista"></ul>
        </div>
      </div>
    </div>
  `

  document.getElementById('conteudo').innerHTML = `
    <a href="index.html" style="display:inline-block; margin-bottom: .75rem; color: var(--color-primary); font-weight:600; font-size:.88rem;">← Voltar à Central de Planejamento</a>
    <h1 style="font-size:1.2rem; margin: 0 0 1rem; color: var(--slate-900);">Solicitação ${s.id}${s.suspensa ? ' <span class="badge" style="background:var(--amber-50); color:var(--amber-700);">SUSPENSA</span>' : ''}${s.cancelada ? ' <span class="badge" style="background:var(--red-50); color:var(--color-error);">CANCELADA</span>' : ''}</h1>
    <div class="solicitacao-grid">
      ${painelEsquerdo}
      ${painelCentral}
      ${painelDireito}
    </div>
    ${acoes}
    ${rodape}
  `

  renderTimelineFiltrada('Todos', 'Todos')
  attachAcoes()
}

function renderTimelineFiltrada(tipo, origem) {
  const s = ATUAL
  const lista = s.timeline
    .filter((e) => tipo === 'Todos' || e.tipo === tipo)
    .filter((e) => origem === 'Todos' || e.origem === origem)
    .slice().reverse()
  document.getElementById('timeline-lista').innerHTML = lista.map(timelineEventHtml).join('') || '<div class="empty-state">Nenhum evento para este filtro</div>'
}

function attachAcoes() {
  const s = ATUAL

  document.getElementById('rodape-toggle').addEventListener('click', () => {
    const content = document.getElementById('rodape-content')
    const seta = document.getElementById('rodape-seta')
    content.classList.toggle('open')
    seta.textContent = content.classList.contains('open') ? '▴' : '▾'
  })

  document.getElementById('tl-filtro-tipo').addEventListener('change', (e) => {
    renderTimelineFiltrada(e.target.value, document.getElementById('tl-filtro-origem').value)
  })
  document.getElementById('tl-filtro-origem').addEventListener('change', (e) => {
    renderTimelineFiltrada(document.getElementById('tl-filtro-tipo').value, e.target.value)
  })

  document.getElementById('btn-comentar').addEventListener('click', () => {
    const input = document.getElementById('novo-comentario')
    const texto = input.value.trim()
    if (!texto) return
    s.comentarios.push({ autor: 'Você', texto, mencionado: texto.includes('@') })
    input.value = ''
    render()
    document.getElementById('rodape-content').classList.add('open')
    document.getElementById('rodape-seta').textContent = '▴'
    toast('Comentário adicionado')
  })

  document.getElementById('acao-avancar').addEventListener('click', () => {
    if (s.pendenciasProximaEtapa.length > 0) {
      abrirModalAviso({ titulo: `Gate de "${s.colunaKanban}" não cumprido`, itens: s.pendenciasProximaEtapa })
      return
    }
    const idx = MOCK.COLUNAS_KANBAN.indexOf(s.colunaKanban)
    const proxima = MOCK.COLUNAS_KANBAN[idx + 1]
    if (!proxima) { toast('Solicitação já está na última etapa do Kanban'); return }
    s.colunaKanban = proxima
    s.timeline.push({ timestamp: new Date().toISOString(), tipo: 'Manual', origem: 'usuario', descricao: `Etapa avançada manualmente para "${proxima}"` })
    toast(`Avançou para "${proxima}"`)
    render()
  })

  document.getElementById('acao-suspender').addEventListener('click', () => {
    abrirModalMotivo({
      titulo: 'Suspender solicitação', corBotao: 'danger',
      descricao: 'A suspensão exige motivo obrigatório e é registrada na Timeline. Reativação é controlada.',
      onConfirm: (motivo) => {
        s.suspensa = true
        s.timeline.push({ timestamp: new Date().toISOString(), tipo: 'Manual', origem: 'usuario', descricao: `Solicitação suspensa — Motivo: ${motivo}` })
        toast('Solicitação suspensa')
        render()
      },
    })
  })

  document.getElementById('acao-retornar').addEventListener('click', () => {
    const idx = MOCK.COLUNAS_KANBAN.indexOf(s.colunaKanban)
    const anterior = MOCK.COLUNAS_KANBAN[idx - 1]
    if (!anterior) { toast('Não há etapa anterior no Kanban'); return }
    abrirModalMotivo({
      titulo: 'Retornar à etapa anterior',
      descricao: `Voltar para "${anterior}" será registrado como evento retroativo na Timeline.`,
      onConfirm: (motivo) => {
        s.colunaKanban = anterior
        s.timeline.push({ timestamp: new Date().toISOString(), tipo: 'Manual', origem: 'usuario', descricao: `Retorno para "${anterior}" — Justificativa: ${motivo}` })
        toast('Retorno registrado')
        render()
      },
    })
  })

  document.getElementById('acao-cancelar').addEventListener('click', () => {
    abrirModalMotivo({
      titulo: 'Cancelar solicitação', corBotao: 'danger',
      descricao: 'Ação irreversível. Justificativa obrigatória. A auditoria é preservada.',
      onConfirm: (motivo) => {
        s.cancelada = true
        s.timeline.push({ timestamp: new Date().toISOString(), tipo: 'Manual', origem: 'usuario', descricao: `Solicitação cancelada — Justificativa: ${motivo}` })
        toast('Solicitação cancelada')
        render()
      },
    })
  })

  document.getElementById('acao-atribuir').addEventListener('click', () => toast('Responsável reatribuído (demo)'))
  document.getElementById('acao-upload').addEventListener('click', () => toast('Upload simulado — documento anexado (demo)'))
  document.getElementById('acao-autorizacao').addEventListener('click', () => toast('Autorização solicitada ao convênio (demo)'))
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('central')
  const id = qs('id')
  ATUAL = findSolicitacao(id) || MOCK.solicitacoes[0]
  render()
})
