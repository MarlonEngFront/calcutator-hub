/* Dashboard — indicadores gerenciais (pág. 20 do PDF) */

const BENCHMARK_DIAS = {
  'Avaliação': 3, 'Pré-op': 6, 'Aguardando Exames': 4, 'Em Cálculo': 1, 'Autorização': 3, 'Agendada': 2,
}

function mediaTempoParadoPorColuna(coluna) {
  const itens = MOCK.solicitacoes.filter((s) => s.colunaKanban === coluna)
  if (!itens.length) return BENCHMARK_DIAS[coluna] * 1.1
  return itens.reduce((acc, s) => acc + s.tempoParadoDias, 0) / itens.length
}

function renderKpis() {
  const ativas = MOCK.solicitacoes.filter((s) => !['Concluída'].includes(s.estado))
  const concluidas = MOCK.solicitacoes.filter((s) => s.estado === 'Concluída')
  const slaOk = MOCK.solicitacoes.filter((s) => s.slaStatus === 'ok').length
  const slaCumpridoPct = Math.round((slaOk / MOCK.solicitacoes.length) * 100)
  const tempoMedio = (MOCK.solicitacoes.reduce((acc, s) => acc + s.tempoParadoDias, 0) / MOCK.solicitacoes.length).toFixed(1)
  const criticos = MOCK.solicitacoes.filter((s) => s.slaStatus === 'vencido' || s.scoreIA > 70).length

  const kpis = [
    { label: 'Tempo médio de jornada (dias)', valor: tempoMedio },
    { label: 'Casos ativos', valor: ativas.length },
    { label: 'SLA cumprido', valor: slaCumpridoPct + '%' },
    { label: 'Casos críticos', valor: criticos, destaque: criticos > 0 },
    { label: 'Cirurgias no período', valor: MOCK.solicitacoes.filter((s) => s.cirurgiaData).length },
    { label: 'Concluídas no período', valor: concluidas.length },
  ]
  document.getElementById('dash-kpi-strip').innerHTML = kpis.map((k) => `
    <div class="kpi-tile ${k.destaque ? 'destaque' : ''}">
      <div class="valor">${k.valor}</div>
      <div class="label">${k.label}</div>
    </div>
  `).join('')
}

function renderBarras() {
  const max = Math.max(...MOCK.COLUNAS_KANBAN.map((c) => Math.max(BENCHMARK_DIAS[c], mediaTempoParadoPorColuna(c)))) * 1.15
  document.getElementById('dash-barras').innerHTML = MOCK.COLUNAS_KANBAN.map((col) => {
    const bench = BENCHMARK_DIAS[col]
    const real = mediaTempoParadoPorColuna(col)
    return `
      <div>
        <div class="barra-etapa-label">${col}</div>
        <div class="barra-linha">
          <div class="barra-fundo"><div class="barra-fill benchmark" style="width:${(bench / max) * 100}%"></div></div>
          <div class="barra-valor">${bench.toFixed(1)}d</div>
        </div>
        <div class="barra-linha">
          <div class="barra-fundo"><div class="barra-fill real" style="width:${(real / max) * 100}%"></div></div>
          <div class="barra-valor">${real.toFixed(1)}d</div>
        </div>
      </div>
    `
  }).join('')
}

function corHeatmap(valor, max) {
  const t = Math.min(1, valor / max)
  if (t < 0.4) return '#4db6ac'
  if (t < 0.7) return '#f59e0b'
  return '#dc2626'
}

function renderHeatmap() {
  const valores = MOCK.COLUNAS_KANBAN.map((c) => mediaTempoParadoPorColuna(c))
  const max = Math.max(...valores)
  document.getElementById('dash-heatmap').innerHTML = MOCK.COLUNAS_KANBAN.map((col, i) => `
    <div class="heatmap-cell" style="background:${corHeatmap(valores[i], max)}">
      ${col}<br/>${valores[i].toFixed(1)}d
    </div>
  `).join('')
}

function renderCriticos() {
  const criticos = MOCK.solicitacoes
    .filter((s) => s.slaStatus === 'vencido' || s.scoreIA > 70)
    .slice()
    .sort((a, b) => b.scoreIA - a.scoreIA)
    .slice(0, 6)

  document.getElementById('dash-criticos').innerHTML = criticos.map((s) => `
    <div class="item-row" style="cursor:pointer;" onclick="window.location.href='solicitacao.html?id=${s.id}'">
      <span>
        <strong>${escapeHtml(s.pacienteNome)}</strong>
        <span style="color:var(--slate-400); font-size:.72rem;"> · ${s.estado}</span>
      </span>
      <span class="${slaColorClass(s.slaStatus)} sla-bar-label">${s.slaLabel}</span>
    </div>
  `).join('') || '<div class="empty-state">Nenhum caso crítico no momento</div>'
}

function renderTendencias() {
  const motivos = ['Paciente não compareceu', 'Reavaliação clínica solicitada', 'Pendência de convênio', 'Intercorrência de saúde']
  document.getElementById('dash-tendencias').innerHTML = `
    <div class="item-row"><span>Volume de casos (30 dias)</span><span style="font-weight:700;">${MOCK.solicitacoes.length + 18}</span></div>
    <div class="item-row"><span>Taxa de cancelamento</span><span style="font-weight:700;">4.2%</span></div>
    <div class="item-row"><span>Suspensões no período</span><span style="font-weight:700;">7</span></div>
    <h3 style="margin: 1rem 0 .5rem;">Motivos de suspensão mais frequentes</h3>
    ${motivos.map((m, i) => `<div class="item-row"><span>${m}</span><span style="color:var(--slate-400);">${4 - i * 1}x</span></div>`).join('')}
  `
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader('dashboard')
  renderKpis()
  renderBarras()
  renderHeatmap()
  renderCriticos()
  renderTendencias()
})
