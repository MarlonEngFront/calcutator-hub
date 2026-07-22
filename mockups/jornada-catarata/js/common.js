/* Utilidades e header compartilhados entre as 3 telas do protótipo. */

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name)
}

function slaColorClass(status) {
  return { ok: 'sla-ok', risco: 'sla-risco', vencido: 'sla-vencido' }[status] || 'sla-ok'
}

function prioridadeLabel(p) {
  return { P1: 'P1 — Urgente', P2: 'P2 — Prioritário', P3: 'P3 — Normal' }[p] || p
}

function iniciaisNome(nome) {
  return String(nome).replace(/^(Dra?\.)\s*/, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const ALERTA_ICONES = {
  clinico: { emoji: '🔴', label: 'Clínico' },
  sla: { emoji: '🟡', label: 'SLA' },
  convenio: { emoji: '🔵', label: 'Convênio' },
  operacional: { emoji: '⚫', label: 'Operacional' },
  farmacia: { emoji: '🟣', label: 'Farmácia' },
  cirurgia: { emoji: '🟠', label: 'Cirurgia' },
  exames: { emoji: '🟢', label: 'Exames' },
}

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function findSolicitacao(id) {
  return MOCK.solicitacoes.find((s) => s.id === id)
}

/* Etapas ativas da clínica: defaults do mock-data, sobrescritos pela tela de
   Configuração via localStorage (jc_etapas). */
function getEtapasConfiguradas() {
  try {
    const raw = localStorage.getItem('jc_etapas')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch (e) { /* localStorage indisponível — usa default */ }
  return MOCK.ETAPAS_DEFAULT.map((e) => ({ ...e }))
}

function salvarEtapasConfiguradas(etapas) {
  try { localStorage.setItem('jc_etapas', JSON.stringify(etapas)) } catch (e) { /* demo segue em memória */ }
}

function getEtapasAtivas() {
  return getEtapasConfiguradas().filter((e) => e.visivel)
}

/* Central de Médicos: cadastro persistido em localStorage (jc_medicos), com
   fallback nos defaults do mock-data. É a fonte usada pelas notificações
   para saber telefone/WhatsApp/e-mail de quem notificar. */
function getMedicosConfigurados() {
  try {
    const raw = localStorage.getItem('jc_medicos')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch (e) { /* localStorage indisponível — usa default */ }
  return MOCK.MEDICOS_PERFIS_DEFAULT.map((m) => ({ ...m }))
}

function salvarMedicosConfigurados(medicos) {
  try { localStorage.setItem('jc_medicos', JSON.stringify(medicos)) } catch (e) { /* demo segue em memória */ }
}

function getMedicosAtivos() {
  return getMedicosConfigurados().filter((m) => m.ativo)
}

function findMedicoPorNome(nome) {
  return getMedicosConfigurados().find((m) => m.nome === nome) || null
}

function renderHeader(active) {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { key: 'central', label: 'Central de Planejamento', href: 'index.html' },
  ]
  const el = document.getElementById('app-header')
  if (!el) return
  el.innerHTML = `
    <div class="header-inner">
      <a class="brand" href="dashboard.html">
        <span class="brand-mark">V</span>
        <span class="brand-text">
          <strong>Voiston</strong>
          <small>Jornada Inteligente da Catarata</small>
        </span>
      </a>
      <div class="header-datetime" id="header-datetime" title="Data e hora atuais">
        <span class="hd-icon">📅</span>
        <span class="hd-text">
          <strong id="hd-dia">—</strong>
          <small id="hd-data-hora">—</small>
        </span>
      </div>
      <nav class="header-nav">
        ${tabs.map((t) => `<a href="${t.href}" class="${t.key === active ? 'active' : ''}">${t.label}</a>`).join('')}
      </nav>
      <div class="header-right">
        <a href="pacientes.html" class="config-link ${active === 'pacientes' ? 'active' : ''}" title="Central de Pacientes">🧑‍🤝‍🧑 Pacientes</a>
        <a href="medicos.html" class="config-link ${active === 'medicos' ? 'active' : ''}" title="Central de Médicos">🩺 Médicos</a>
        <a href="config.html" class="config-link ${active === 'config' ? 'active' : ''}" title="Configuração de Etapas">⚙️ Configuração de Etapas</a>
        <span class="mock-badge" title="Protótipo estático com dados mockados — sem backend real">MOCK</span>
        <div class="notif-bell-wrap" id="notif-bell-wrap"></div>
        <div class="user-chip" title="${escapeHtml(MOCK.USUARIO_LOGADO.nome)} · ${escapeHtml(MOCK.USUARIO_LOGADO.papel)}">
          <span class="user-avatar">${MOCK.USUARIO_LOGADO.iniciais}</span>
          <span class="user-chip-text">
            <strong>${escapeHtml(MOCK.USUARIO_LOGADO.nome)}</strong>
            <small>${escapeHtml(MOCK.USUARIO_LOGADO.papel)} · ${escapeHtml(MOCK.CLINICA)}</small>
          </span>
        </div>
      </div>
    </div>
  `
  if (typeof renderNotificacoes === 'function') renderNotificacoes()
  iniciarRelogioHeader()
}

function capitalizar(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/* Relógio real do navegador (não é a data-referência usada pelos cálculos de SLA do mock) */
function iniciarRelogioHeader() {
  const elDia = document.getElementById('hd-dia')
  const elDataHora = document.getElementById('hd-data-hora')
  if (!elDia || !elDataHora) return

  const atualizar = () => {
    const agora = new Date()
    elDia.textContent = capitalizar(agora.toLocaleDateString('pt-BR', { weekday: 'long' }))
    const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    elDataHora.textContent = `${data} · ${hora}`
  }
  atualizar()
  setInterval(atualizar, 1000)
}

/* Modal genérico de confirmação com motivo obrigatório (Suspender / Cancelar / Retornar) */
function abrirModalMotivo({ titulo, descricao, corBotao = 'primary', onConfirm }) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>${escapeHtml(titulo)}</h3>
      <p class="modal-desc">${escapeHtml(descricao)}</p>
      <label class="modal-label" for="modal-motivo">Motivo (obrigatório)</label>
      <textarea id="modal-motivo" rows="3" placeholder="Descreva o motivo desta ação..."></textarea>
      <div class="modal-actions">
        <button class="btn-secondary" data-action="cancelar">Cancelar</button>
        <button class="btn-${corBotao === 'danger' ? 'danger' : 'primary'}" data-action="confirmar" disabled>Confirmar</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  const textarea = overlay.querySelector('#modal-motivo')
  const btnConfirmar = overlay.querySelector('[data-action="confirmar"]')
  textarea.addEventListener('input', () => {
    btnConfirmar.disabled = textarea.value.trim().length < 3
  })
  overlay.querySelector('[data-action="cancelar"]').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
  btnConfirmar.addEventListener('click', () => {
    const motivo = textarea.value.trim()
    overlay.remove()
    onConfirm(motivo)
  })
  textarea.focus()
}

/* Modal simples de aviso (ex.: bloqueio de gate) */
function abrirModalAviso({ titulo, itens }) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>${escapeHtml(titulo)}</h3>
      <ul class="modal-lista-pendencias">
        ${itens.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}
      </ul>
      <div class="modal-actions">
        <button class="btn-primary" data-action="ok">Entendi</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  overlay.querySelector('[data-action="ok"]').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
}

function toast(msg) {
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300) }, 2600)
}
