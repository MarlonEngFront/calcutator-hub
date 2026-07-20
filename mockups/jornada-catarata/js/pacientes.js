/* Central de Pacientes — listagem agrupada por médico responsável (derivada das solicitações). */

const filtroPac = { busca: '', medico: 'Todos', unidade: 'Todas' }

function pacientesFiltrados() {
  return MOCK.solicitacoes.filter((s) => {
    if (filtroPac.busca) {
      const q = filtroPac.busca.toLowerCase()
      if (!s.pacienteNome.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false
    }
    if (filtroPac.medico !== 'Todos' && s.medicoNome !== filtroPac.medico) return false
    if (filtroPac.unidade !== 'Todas' && s.centroReferencia !== filtroPac.unidade) return false
    return true
  })
}

function pacienteRowHtml(s) {
  return `
    <div class="item-row" style="cursor:pointer;" onclick="window.location.href='solicitacao.html?id=${s.id}'">
      <span style="display:flex; align-items:center; gap:.5rem;">
        <strong>${escapeHtml(s.pacienteNome)}</strong>
        <span style="color:var(--slate-400); font-size:.72rem;">${s.idade} anos · ${escapeHtml(s.convenio)}</span>
        <span class="badge badge-olho-${s.olho}">${s.olho}</span>
      </span>
      <span style="display:flex; align-items:center; gap:.5rem;">
        <span class="badge badge-status">${escapeHtml(s.centroReferencia)}</span>
        <span style="font-size:.78rem; color:var(--slate-500);">${escapeHtml(s.estado)}</span>
        <span class="${slaColorClass(s.slaStatus)} sla-bar-label">${escapeHtml(s.slaLabel)}</span>
      </span>
    </div>
  `
}

function renderPacientes() {
  const lista = pacientesFiltrados()
  const medicos = getMedicosConfigurados().filter((m) => filtroPac.medico === 'Todos' || m.nome === filtroPac.medico)

  const el = document.getElementById('pacientes-por-medico')
  el.innerHTML = medicos.map((m) => {
    const pacientes = lista.filter((s) => s.medicoNome === m.nome)
    if (!pacientes.length) return ''
    return `
      <div class="section-card" style="margin-bottom: 1rem;">
        <h3 style="display:flex; align-items:center; gap:.6rem; justify-content:space-between; text-transform:none; letter-spacing:0; font-size:1rem;">
          <span style="display:flex; align-items:center; gap:.5rem;">
            <span class="card-avatar">${iniciaisNome(m.nome)}</span>
            ${escapeHtml(m.nome)}
            <span class="badge" style="background:var(--blue-50); color:var(--color-primary);">${escapeHtml(m.especialidade)}</span>
            ${m.ativo ? '' : '<span class="badge" style="background:var(--slate-100); color:var(--slate-400);">inativo</span>'}
          </span>
          <span class="kanban-col-count">${pacientes.length} paciente${pacientes.length > 1 ? 's' : ''}</span>
        </h3>
        <p style="font-size:.74rem; color: var(--slate-400); margin: -.4rem 0 .6rem;">Atende: ${m.unidades.map(escapeHtml).join(' · ')}</p>
        ${pacientes.map(pacienteRowHtml).join('')}
      </div>
    `
  }).join('') || '<div class="empty-state">Nenhum paciente encontrado para este filtro</div>'

  if (!lista.length || el.innerHTML.trim() === '') {
    el.innerHTML = '<div class="empty-state">Nenhum paciente encontrado para este filtro</div>'
  }
}

function setupFiltros() {
  const selMedico = document.getElementById('f-medico-pac')
  selMedico.innerHTML = ['Todos', ...getMedicosConfigurados().map((m) => m.nome)]
    .map((m) => `<option value="${escapeHtml(m)}">${m === 'Todos' ? 'Médico: todos' : escapeHtml(m)}</option>`).join('')
  selMedico.addEventListener('change', (e) => { filtroPac.medico = e.target.value; renderPacientes() })

  const selUnidade = document.getElementById('f-unidade-pac')
  selUnidade.innerHTML = ['Todas', ...MOCK.UNIDADES]
    .map((u) => `<option value="${escapeHtml(u)}">${u === 'Todas' ? 'Unidade: todas' : escapeHtml(u)}</option>`).join('')
  selUnidade.addEventListener('change', (e) => { filtroPac.unidade = e.target.value; renderPacientes() })

  document.getElementById('busca-paciente').addEventListener('input', (e) => { filtroPac.busca = e.target.value; renderPacientes() })
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('pacientes')
  setupFiltros()
  renderPacientes()
})
