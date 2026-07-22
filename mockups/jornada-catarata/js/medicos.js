/* Central de Médicos — cadastro usado pelas notificações para saber pra quem/como notificar. */

let medicoEmEdicaoId = null

function medicoCardHtml(m) {
  return `
    <div class="medico-card ${m.ativo ? '' : 'inativo'}">
      <div class="medico-card-topo">
        <span class="card-avatar" style="width:2.3rem; height:2.3rem; font-size:.85rem;">${iniciaisNome(m.nome)}</span>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:.92rem; color: var(--slate-900);">${escapeHtml(m.nome)}</div>
          <div style="font-size:.74rem; color: var(--slate-500);">${escapeHtml(m.crm)}</div>
        </div>
        <span class="badge" style="background: var(--blue-50); color: var(--color-primary);">${escapeHtml(m.especialidade)}</span>
      </div>
      <div class="medico-card-contato">
        <span>📞 ${escapeHtml(m.telefone || '—')}</span>
        <span>💬 ${escapeHtml(m.whatsapp || '—')}</span>
        <span>✉️ ${escapeHtml(m.email || '—')}</span>
      </div>
      <div class="medico-card-unidades">
        ${m.unidades.map((u) => `<span class="badge badge-status">${escapeHtml(u)}</span>`).join('')}
      </div>
      <div class="medico-card-rodape">
        <span style="font-size:.72rem; font-weight:700; color: ${m.ativo ? 'var(--color-success)' : 'var(--slate-400)'};">
          ${m.ativo ? '● Ativo — recebe notificações' : '○ Inativo'}
        </span>
        <div style="display:flex; gap:.4rem;">
          <button class="btn-secondary" data-editar="${m.id}" style="font-size:.72rem; padding:.25rem .7rem;">Editar</button>
          <button class="btn-danger" data-remover="${m.id}" style="font-size:.72rem; padding:.25rem .7rem;">Remover</button>
        </div>
      </div>
    </div>
  `
}

function renderListaMedicos() {
  const medicos = getMedicosConfigurados()
  const el = document.getElementById('lista-medicos')
  el.innerHTML = medicos.length
    ? medicos.map(medicoCardHtml).join('')
    : '<div class="empty-state">Nenhum médico cadastrado</div>'

  el.querySelectorAll('[data-editar]').forEach((btn) => {
    btn.addEventListener('click', () => carregarParaEdicao(btn.dataset.editar))
  })
  el.querySelectorAll('[data-remover]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const medicos = getMedicosConfigurados()
      const alvo = medicos.find((m) => m.id === btn.dataset.remover)
      const restante = medicos.filter((m) => m.id !== btn.dataset.remover)
      salvarMedicosConfigurados(restante)
      if (medicoEmEdicaoId === btn.dataset.remover) resetarForm()
      renderListaMedicos()
      toast(`${alvo?.nome || 'Médico'} removido do cadastro`)
    })
  })
}

function renderCheckboxesUnidades(selecionadas = []) {
  const el = document.getElementById('med-unidades')
  el.innerHTML = MOCK.UNIDADES.map((u) => `
    <label class="unidade-check">
      <input type="checkbox" value="${escapeHtml(u)}" ${selecionadas.includes(u) ? 'checked' : ''} />
      ${escapeHtml(u)}
    </label>
  `).join('')
  el.querySelectorAll('input').forEach((i) => i.addEventListener('change', validarForm))
}

function unidadesSelecionadas() {
  return [...document.querySelectorAll('#med-unidades input:checked')].map((i) => i.value)
}

function validarForm() {
  const nome = document.getElementById('med-nome').value.trim()
  const crm = document.getElementById('med-crm').value.trim()
  const ok = nome.length >= 3 && crm.length >= 3 && unidadesSelecionadas().length > 0
  document.getElementById('btn-salvar-medico').disabled = !ok
}

function carregarParaEdicao(id) {
  const m = getMedicosConfigurados().find((x) => x.id === id)
  if (!m) return
  medicoEmEdicaoId = id
  document.getElementById('form-titulo').textContent = `Editar médico`
  document.getElementById('med-id').value = m.id
  document.getElementById('med-nome').value = m.nome
  document.getElementById('med-crm').value = m.crm
  document.getElementById('med-especialidade').value = m.especialidade
  document.getElementById('med-telefone').value = m.telefone || ''
  document.getElementById('med-whatsapp').value = m.whatsapp || ''
  document.getElementById('med-email').value = m.email || ''
  document.getElementById('med-ativo').checked = m.ativo
  renderCheckboxesUnidades(m.unidades)
  document.getElementById('btn-cancelar-edicao').style.display = ''
  document.getElementById('btn-salvar-medico').textContent = 'Salvar alterações'
  validarForm()
  window.scrollTo({ top: document.querySelector('.config-form').offsetTop - 20, behavior: 'smooth' })
}

function resetarForm() {
  medicoEmEdicaoId = null
  document.getElementById('form-titulo').textContent = 'Adicionar médico'
  document.getElementById('med-id').value = ''
  document.getElementById('med-nome').value = ''
  document.getElementById('med-crm').value = ''
  document.getElementById('med-especialidade').value = MOCK.ESPECIALIDADES[0]
  document.getElementById('med-telefone').value = ''
  document.getElementById('med-whatsapp').value = ''
  document.getElementById('med-email').value = ''
  document.getElementById('med-ativo').checked = true
  renderCheckboxesUnidades([])
  document.getElementById('btn-cancelar-edicao').style.display = 'none'
  document.getElementById('btn-salvar-medico').textContent = 'Adicionar médico'
  validarForm()
}

function setupForm() {
  document.getElementById('med-especialidade').innerHTML = MOCK.ESPECIALIDADES.map((e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('')
  ;['med-nome', 'med-crm'].forEach((id) => document.getElementById(id).addEventListener('input', validarForm))
  document.getElementById('btn-cancelar-edicao').addEventListener('click', resetarForm)

  document.getElementById('btn-salvar-medico').addEventListener('click', () => {
    const medicos = getMedicosConfigurados()
    const dados = {
      nome: document.getElementById('med-nome').value.trim(),
      crm: document.getElementById('med-crm').value.trim(),
      especialidade: document.getElementById('med-especialidade').value,
      telefone: document.getElementById('med-telefone').value.trim(),
      whatsapp: document.getElementById('med-whatsapp').value.trim(),
      email: document.getElementById('med-email').value.trim(),
      unidades: unidadesSelecionadas(),
      ativo: document.getElementById('med-ativo').checked,
    }
    if (medicoEmEdicaoId) {
      const idx = medicos.findIndex((m) => m.id === medicoEmEdicaoId)
      medicos[idx] = { ...medicos[idx], ...dados }
      salvarMedicosConfigurados(medicos)
      toast(`${dados.nome} atualizado`)
    } else {
      medicos.push({ id: `MED-${Date.now()}`, ...dados })
      salvarMedicosConfigurados(medicos)
      toast(`${dados.nome} adicionado ao cadastro`)
    }
    resetarForm()
    renderListaMedicos()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('medicos')
  document.getElementById('medicos-clinica').textContent = MOCK.CLINICA
  setupForm()
  resetarForm()
  renderListaMedicos()
})
