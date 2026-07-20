/* Notificações mock (visão do atendente) — simula o sistema PWA com push notifications.
   Geradas a partir do mock-data: paciente parado, SLA vencido, exame pendente.
   O fluxo-chave da demo: notificação de paciente parado → "Enviar mensagem ao médico"
   → push PWA simulado + evento na timeline da solicitação. */

function gerarNotificacoes() {
  const notifs = []
  MOCK.solicitacoes.forEach((s) => {
    if (['Concluída', 'Cirurgia', 'Pós-op'].includes(s.estado)) return
    if (s.tempoParadoDias >= 2 && s.pendenciasProximaEtapa.length > 0) {
      notifs.push({
        id: `parado-${s.id}`,
        solicitacaoId: s.id,
        titulo: `Paciente parado há ${s.tempoParadoDias} dias`,
        corpo: `${s.pacienteNome} está em "${s.colunaKanban}" aguardando: ${s.pendenciasProximaEtapa.join(', ')}.`,
        medico: s.medicoNome,
        tipo: 'parado',
        podeNotificarMedico: true,
      })
    }
    if (s.slaStatus === 'vencido') {
      notifs.push({
        id: `sla-${s.id}`,
        solicitacaoId: s.id,
        titulo: 'SLA vencido',
        corpo: `${s.pacienteNome} — ${s.slaLabel} na etapa "${s.colunaKanban}".`,
        medico: s.medicoNome,
        tipo: 'sla',
        podeNotificarMedico: true,
      })
    }
  })
  // Notificações do Sebastião primeiro (cenário da demo), depois SLA, depois demais
  return notifs.sort((a, b) => {
    const peso = (n) => (n.solicitacaoId === 'SOL-2035' ? 0 : n.tipo === 'sla' ? 1 : 2)
    return peso(a) - peso(b)
  })
}

function getNotifsTratadas() {
  try { return JSON.parse(localStorage.getItem('jc_notifs') || '[]') } catch (e) { return [] }
}
function marcarNotifTratada(id) {
  try {
    const tratadas = getNotifsTratadas()
    if (!tratadas.includes(id)) tratadas.push(id)
    localStorage.setItem('jc_notifs', JSON.stringify(tratadas))
  } catch (e) { /* demo segue em memória */ }
}

let notifPanelAberto = false

function renderNotificacoes() {
  const wrap = document.getElementById('notif-bell-wrap')
  if (!wrap) return
  const tratadas = getNotifsTratadas()
  const notifs = gerarNotificacoes()
  const naoTratadas = notifs.filter((n) => !tratadas.includes(n.id))

  wrap.innerHTML = `
    <button class="notif-bell" id="notif-bell" title="Notificações (push PWA simulado)">
      🔔
      ${naoTratadas.length ? `<span class="notif-badge">${naoTratadas.length}</span>` : ''}
    </button>
    ${notifPanelAberto ? `
      <div class="notif-panel" id="notif-panel">
        <div class="notif-panel-header">
          <span>Notificações</span>
          <span style="font-size:.7rem; color: var(--slate-400); font-weight:600;">PWA push · ${escapeHtml(MOCK.USUARIO_LOGADO.papel)}</span>
        </div>
        ${notifs.length ? notifs.map((n) => notifItemHtml(n, tratadas.includes(n.id))).join('') : '<div class="notif-vazio">Nenhuma notificação</div>'}
      </div>
    ` : ''}
  `

  document.getElementById('notif-bell').addEventListener('click', () => {
    notifPanelAberto = !notifPanelAberto
    renderNotificacoes()
  })

  if (notifPanelAberto) {
    wrap.querySelectorAll('[data-notificar-medico]').forEach((btn) => {
      btn.addEventListener('click', () => abrirModalMensagemMedico(btn.dataset.notificarMedico))
    })
    wrap.querySelectorAll('[data-abrir-solicitacao]').forEach((btn) => {
      btn.addEventListener('click', () => { window.location.href = `solicitacao.html?id=${btn.dataset.abrirSolicitacao}` })
    })
  }
}

function notifItemHtml(n, tratada) {
  return `
    <div class="notif-item ${tratada ? 'tratada' : 'nao-lida'}">
      <div class="n-titulo">${escapeHtml(n.titulo)}</div>
      <div class="n-corpo">${escapeHtml(n.corpo)}</div>
      <div class="n-acoes">
        ${n.podeNotificarMedico && !tratada ? `<button class="btn-primary" data-notificar-medico="${n.id}">Enviar mensagem ao médico</button>` : ''}
        <button class="btn-secondary" data-abrir-solicitacao="${n.solicitacaoId}">Ver solicitação</button>
      </div>
      <div class="n-meta">${escapeHtml(n.medico)} · ${n.solicitacaoId}${tratada ? ' · ✓ médico notificado' : ''}</div>
    </div>
  `
}

function abrirModalMensagemMedico(notifId) {
  const n = gerarNotificacoes().find((x) => x.id === notifId)
  if (!n) return
  const s = findSolicitacao(n.solicitacaoId)
  const mensagemPadrao = `Olá ${n.medico}, o paciente ${s.pacienteNome} (${s.id}) está parado há ${s.tempoParadoDias} dias na etapa "${s.colunaKanban}", necessitando de: ${s.pendenciasProximaEtapa.join(', ') || 'ação da equipe'} para evoluir para a próxima etapa.`

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>Enviar mensagem ao médico</h3>
      <p class="modal-desc">Push PWA + mensagem interna para <strong>${escapeHtml(n.medico)}</strong>. Edite se quiser:</p>
      <textarea id="msg-medico" rows="5">${escapeHtml(mensagemPadrao)}</textarea>
      <div class="modal-actions">
        <button class="btn-secondary" data-action="cancelar">Cancelar</button>
        <button class="btn-primary" data-action="enviar">Enviar push</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('[data-action="cancelar"]').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
  overlay.querySelector('[data-action="enviar"]').addEventListener('click', () => {
    const msg = overlay.querySelector('#msg-medico').value.trim()
    overlay.remove()
    s.timeline.push({
      timestamp: new Date().toISOString(), tipo: 'Sistema', origem: 'sistema',
      descricao: `Push PWA enviado para ${n.medico} por ${MOCK.USUARIO_LOGADO.nome} (${MOCK.USUARIO_LOGADO.papel}): "${msg}"`,
    })
    marcarNotifTratada(n.id)
    toast(`Push PWA enviado para ${n.medico}`)
    renderNotificacoes()
    // se a página de detalhe da própria solicitação estiver aberta, re-renderiza a timeline
    if (typeof ATUAL !== 'undefined' && ATUAL && ATUAL.id === s.id && typeof render === 'function') render()
  })
}
