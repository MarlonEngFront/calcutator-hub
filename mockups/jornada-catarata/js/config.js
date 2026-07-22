/* Configuração de Etapas — cada clínica monta o próprio fluxo (demo client-side em localStorage). */

function renderListaEtapas() {
  const etapas = getEtapasConfiguradas()
  const el = document.getElementById('lista-etapas')
  el.innerHTML = etapas.map((e, i) => `
    <div class="etapa-row ${e.visivel ? '' : 'oculta'}">
      <label class="switch" title="${e.visivel ? 'Ocultar do Kanban' : 'Mostrar no Kanban'}">
        <input type="checkbox" data-toggle="${i}" ${e.visivel ? 'checked' : ''} />
        <span class="slider"></span>
      </label>
      <span class="e-nome">${escapeHtml(e.nome)}</span>
      <span class="e-tipo ${e.tipo}">${MOCK.TIPO_ETAPA_LABELS[e.tipo] || e.tipo}${e.subtipo ? ' · ' + (MOCK.SUBTIPO_ETAPA_LABELS[e.subtipo] || e.subtipo) : ''}</span>
      ${e.customizada
        ? `<button class="btn-danger" data-remover="${i}">Remover</button>`
        : `<span style="font-size:.68rem; color: var(--slate-400);">padrão</span>`}
    </div>
  `).join('')

  el.querySelectorAll('[data-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      const etapas = getEtapasConfiguradas()
      const idx = Number(input.dataset.toggle)
      etapas[idx].visivel = input.checked
      salvarEtapasConfiguradas(etapas)
      renderListaEtapas()
      toast(`Etapa "${etapas[idx].nome}" ${input.checked ? 'visível no Kanban' : 'oculta do Kanban'}`)
    })
  })
  el.querySelectorAll('[data-remover]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const etapas = getEtapasConfiguradas()
      const idx = Number(btn.dataset.remover)
      const nome = etapas[idx].nome
      etapas.splice(idx, 1)
      salvarEtapasConfiguradas(etapas)
      renderListaEtapas()
      toast(`Etapa "${nome}" removida`)
    })
  })
}

function setupForm() {
  const nome = document.getElementById('nova-nome')
  const tipo = document.getElementById('novo-tipo')
  const subtipoWrap = document.getElementById('wrap-subtipo')
  const subtipo = document.getElementById('novo-subtipo')
  const btn = document.getElementById('btn-adicionar')

  nome.addEventListener('input', () => { btn.disabled = nome.value.trim().length < 2 })
  tipo.addEventListener('change', () => {
    subtipoWrap.style.display = tipo.value === 'decisao' ? '' : 'none'
  })

  btn.addEventListener('click', () => {
    const etapas = getEtapasConfiguradas()
    const nova = {
      nome: nome.value.trim(),
      tipo: tipo.value,
      visivel: true,
      customizada: true,
    }
    if (tipo.value === 'decisao') nova.subtipo = subtipo.value
    if (etapas.some((e) => e.nome.toLowerCase() === nova.nome.toLowerCase())) {
      toast('Já existe uma etapa com esse nome')
      return
    }
    etapas.push(nova)
    salvarEtapasConfiguradas(etapas)
    nome.value = ''
    btn.disabled = true
    renderListaEtapas()
    toast(`Etapa "${nova.nome}" adicionada — já aparece no Kanban`)
  })
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('config')
  document.getElementById('config-clinica').textContent = MOCK.CLINICA
  renderListaEtapas()
  setupForm()
  document.getElementById('btn-restaurar').addEventListener('click', () => {
    try { localStorage.removeItem('jc_etapas') } catch (e) { /* ok */ }
    renderListaEtapas()
    toast('Etapas restauradas para o padrão')
  })
})
