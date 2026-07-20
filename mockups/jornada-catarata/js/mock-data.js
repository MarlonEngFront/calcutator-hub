/* Dados mock — em memória, sem persistência real (exceto ações de demo via localStorage opcional).
   Cobre os 14 estados da máquina, 3 prioridades, 3 status de SLA e as 8 categorias de alerta. */

const ESTADOS = [
  'Nova', 'Elegível', 'Avaliação', 'Pré-operatório', 'Aguardando Exames', 'Pronta',
  'Em Cálculo', 'Revisão', 'LIO Definida', 'Autorização', 'Cirurgia Agendada',
  'Cirurgia', 'Pós-op', 'Concluída',
]

// Mapeia estado -> coluna do Kanban (split "Em Cálculo": aguardando informação/lente vs aguardando aprovação médica)
const ESTADO_PARA_COLUNA = {
  'Nova': 'Avaliação', 'Elegível': 'Avaliação', 'Avaliação': 'Avaliação',
  'Pré-operatório': 'Pré-op',
  'Aguardando Exames': 'Aguardando Exames', 'Pronta': 'Aguardando Exames',
  'Em Cálculo': 'Aguardando Cálculo', 'Revisão': 'Em Cálculo', 'LIO Definida': 'Em Cálculo',
  'Autorização': 'Autorização',
  'Cirurgia Agendada': 'Agendada',
}

/* Etapas configuráveis por clínica (feedback do Well 20/07):
   cada etapa tem tipo (tarefa | aprovacao | decisao) e, se decisão, um subtipo
   (documento | aprovacao | calculo). A tela de Configuração lê/edita uma cópia
   disso em localStorage (jc_etapas); estes são os defaults. */
const ETAPAS_DEFAULT = [
  { nome: 'Avaliação', tipo: 'tarefa', visivel: true },
  { nome: 'Pré-op', tipo: 'tarefa', visivel: true },
  { nome: 'Aguardando Exames', tipo: 'decisao', subtipo: 'documento', visivel: true },
  { nome: 'Aguardando Cálculo', tipo: 'tarefa', visivel: true },
  { nome: 'Em Cálculo', tipo: 'decisao', subtipo: 'calculo', visivel: true },
  { nome: 'Autorização', tipo: 'aprovacao', visivel: true },
  { nome: 'Agendada', tipo: 'tarefa', visivel: true },
]

const TIPO_ETAPA_LABELS = {
  tarefa: 'Tarefa',
  aprovacao: 'Aprovação',
  decisao: 'Decisão',
}
const SUBTIPO_ETAPA_LABELS = {
  documento: 'Documento',
  aprovacao: 'Aprovação',
  calculo: 'Cálculo',
}

const COLUNAS_KANBAN = ETAPAS_DEFAULT.map((e) => e.nome)

// Gate de saída de cada coluna — se a solicitação tem pendências, não pode avançar.
// Itens com "(anexo)" exigem comprovante anexado, não só check (feedback do Well).
const GATE_LABELS = {
  'Avaliação': ['Diagnóstico CID registrado', 'Indicação cirúrgica confirmada', 'Olho (OD/OE) definido'],
  'Pré-op': ['Biometria recebida', 'Topografia recebida', 'Consentimento assinado', 'Convênio ativo'],
  'Aguardando Exames': ['Todos exames recebidos', 'Aprovação do plano de saúde', 'Sem rejeição de exame'],
  'Aguardando Cálculo': ['Categoria de LIO definida', 'Biometria validada', 'Dados completos para cálculo'],
  'Em Cálculo': ['Cálculo realizado', 'Fórmula selecionada', 'Médico assinou digitalmente'],
  'Autorização': ['Código de autorização do convênio', 'Validade OK', 'Procedimento coberto'],
  'Agendada': ['Data/hora definida', 'Sala confirmada', 'LIO disponível em estoque'],
}

// Itens de gate que exigem documento anexado como evidência (não basta o check)
const GATES_COM_ANEXO = ['Aprovação do plano de saúde', 'Consentimento assinado', 'Código de autorização do convênio']

const MEDICOS = ['Dra. Camila Rosseti', 'Dr. Eduardo Vale', 'Dra. Fernanda Brito', 'Dr. Otávio Menck']

// Contexto de acesso da demo: 1 clínica, atendente logada
const CLINICA = 'Hospital Dia Visão'
const USUARIO_LOGADO = { nome: 'Juliana Prates', papel: 'Atendimento', iniciais: 'JP' }

function gerarSolicitacoes() {
  const hoje = new Date('2026-07-16T09:00:00')
  const diasAtras = (n) => new Date(hoje.getTime() - n * 86400000).toISOString()
  const diasNaFrente = (n) => new Date(hoje.getTime() + n * 86400000).toISOString().slice(0, 10)

  const base = [
    {
      id: 'SOL-2031', pacienteNome: 'Antônio Ferreira Lima', idade: 71, convenio: 'Unimed Nacional', olho: 'OD',
      medicoNome: 'Dra. Camila Rosseti', estado: 'Avaliação', prioridade: 'P2', tempoParadoDias: 6,
      slaStatus: 'risco', slaPercentual: 82, slaLabel: '1 dia restante', scoreIA: 64,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: ['Indicação cirúrgica confirmada'],
      alertasAtivos: [{ categoria: 'clinico', severidade: 'critica' }, { categoria: 'sla', severidade: 'alta' }],
    },
    {
      id: 'SOL-2032', pacienteNome: 'Maria Aparecida Souza', idade: 68, convenio: 'Bradesco Saúde', olho: 'OE',
      medicoNome: 'Dr. Eduardo Vale', estado: 'Avaliação', prioridade: 'P3', tempoParadoDias: 2,
      slaStatus: 'ok', slaPercentual: 35, slaLabel: '5 dias restantes', scoreIA: 22,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: [],
      alertasAtivos: [],
    },
    {
      id: 'SOL-2033', pacienteNome: 'José Roberto Alencar', idade: 74, convenio: 'SulAmérica', olho: 'OD',
      medicoNome: 'Dra. Fernanda Brito', estado: 'Pré-operatório', prioridade: 'P1', tempoParadoDias: 9,
      slaStatus: 'vencido', slaPercentual: 118, slaLabel: 'VENCIDO há 2 dias', scoreIA: 88,
      centroReferencia: 'Hospital Dia Visão', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: ['Topografia recebida', 'Consentimento assinado'],
      alertasAtivos: [{ categoria: 'sla', severidade: 'critica' }, { categoria: 'operacional', severidade: 'media' }],
    },
    {
      id: 'SOL-2034', pacienteNome: 'Helena Martins Costa', idade: 63, convenio: 'Amil', olho: 'OE',
      medicoNome: 'Dr. Otávio Menck', estado: 'Pré-operatório', prioridade: 'P2', tempoParadoDias: 3,
      slaStatus: 'ok', slaPercentual: 48, slaLabel: '4 dias restantes', scoreIA: 31,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: ['Convênio ativo'],
      alertasAtivos: [{ categoria: 'convenio', severidade: 'alta' }],
    },
    {
      id: 'SOL-2035', pacienteNome: 'Sebastião Nunes Prado', idade: 79, convenio: 'Unimed Nacional', olho: 'OD',
      medicoNome: 'Dra. Camila Rosseti', estado: 'Aguardando Exames', prioridade: 'P2', tempoParadoDias: 2,
      slaStatus: 'risco', slaPercentual: 80, slaLabel: '1 dia restante', scoreIA: 55,
      centroReferencia: 'Hospital Dia Visão', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: ['Aprovação do plano de saúde'],
      alertasAtivos: [{ categoria: 'exames', severidade: 'media' }],
    },
    {
      id: 'SOL-2036', pacienteNome: 'Rita de Cássia Oliveira', idade: 66, convenio: 'Porto Seguro Saúde', olho: 'OE',
      medicoNome: 'Dr. Eduardo Vale', estado: 'Pronta', prioridade: 'P3', tempoParadoDias: 1,
      slaStatus: 'ok', slaPercentual: 20, slaLabel: '6 dias restantes', scoreIA: 12,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: [],
      alertasAtivos: [],
    },
    {
      id: 'SOL-2037', pacienteNome: 'Francisco das Chagas Melo', idade: 70, convenio: 'SulAmérica', olho: 'OD',
      medicoNome: 'Dra. Fernanda Brito', estado: 'Em Cálculo', prioridade: 'P1', tempoParadoDias: 4,
      slaStatus: 'risco', slaPercentual: 90, slaLabel: '4 horas restantes', scoreIA: 76,
      centroReferencia: 'Hospital Dia Visão', cirurgiaData: null, lioSelecionada: null,
      pendenciasProximaEtapa: ['Categoria de LIO definida'],
      alertasAtivos: [{ categoria: 'sla', severidade: 'alta' }],
    },
    {
      id: 'SOL-2038', pacienteNome: 'Ana Lúcia Barbosa', idade: 61, convenio: 'Bradesco Saúde', olho: 'OE',
      medicoNome: 'Dr. Otávio Menck', estado: 'Revisão', prioridade: 'P2', tempoParadoDias: 2,
      slaStatus: 'ok', slaPercentual: 40, slaLabel: '3 dias restantes', scoreIA: 28,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: null, lioSelecionada: 'AcrySof IQ +21.0D',
      pendenciasProximaEtapa: ['Cálculo realizado'],
      alertasAtivos: [],
    },
    {
      id: 'SOL-2039', pacienteNome: 'Waldemar Pereira Gomes', idade: 77, convenio: 'Amil', olho: 'OD',
      medicoNome: 'Dra. Camila Rosseti', estado: 'LIO Definida', prioridade: 'P2', tempoParadoDias: 1,
      slaStatus: 'ok', slaPercentual: 15, slaLabel: '5 dias restantes', scoreIA: 18,
      centroReferencia: 'Hospital Dia Visão', cirurgiaData: null, lioSelecionada: 'TECNIS Eyhance +22.5D',
      pendenciasProximaEtapa: [],
      alertasAtivos: [],
    },
    {
      id: 'SOL-2040', pacienteNome: 'Terezinha Alves Ribeiro', idade: 69, convenio: 'Unimed Nacional', olho: 'OE',
      medicoNome: 'Dr. Eduardo Vale', estado: 'Autorização', prioridade: 'P1', tempoParadoDias: 7,
      slaStatus: 'vencido', slaPercentual: 105, slaLabel: 'VENCIDO há 6 horas', scoreIA: 71,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: null, lioSelecionada: 'AcrySof IQ +20.5D',
      pendenciasProximaEtapa: ['Código de autorização do convênio'],
      alertasAtivos: [{ categoria: 'convenio', severidade: 'alta' }, { categoria: 'sla', severidade: 'critica' }],
    },
    {
      id: 'SOL-2041', pacienteNome: 'Geraldo Henrique Souza', idade: 72, convenio: 'Porto Seguro Saúde', olho: 'OD',
      medicoNome: 'Dra. Fernanda Brito', estado: 'Cirurgia Agendada', prioridade: 'P2', tempoParadoDias: 2,
      slaStatus: 'ok', slaPercentual: 30, slaLabel: '2 dias restantes', scoreIA: 24,
      centroReferencia: 'Hospital Dia Visão', cirurgiaData: diasNaFrente(2), lioSelecionada: 'TECNIS Eyhance +21.5D',
      pendenciasProximaEtapa: [],
      alertasAtivos: [{ categoria: 'cirurgia', severidade: 'media' }],
    },
    {
      id: 'SOL-2042', pacienteNome: 'Cleusa Regina Fontes', idade: 65, convenio: 'SulAmérica', olho: 'OE',
      medicoNome: 'Dr. Otávio Menck', estado: 'Cirurgia Agendada', prioridade: 'P1', tempoParadoDias: 1,
      slaStatus: 'risco', slaPercentual: 85, slaLabel: 'Cirurgia em 18h', scoreIA: 82,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: diasNaFrente(1), lioSelecionada: null,
      pendenciasProximaEtapa: ['LIO disponível em estoque'],
      alertasAtivos: [{ categoria: 'farmacia', severidade: 'alta' }, { categoria: 'cirurgia', severidade: 'critica' }],
    },
    {
      id: 'SOL-2043', pacienteNome: 'Ivone Cristina Duarte', idade: 73, convenio: 'Amil', olho: 'OD',
      medicoNome: 'Dra. Camila Rosseti', estado: 'Pós-op', prioridade: 'P3', tempoParadoDias: 1,
      slaStatus: 'ok', slaPercentual: 10, slaLabel: 'Retorno D1 em 1 dia', scoreIA: 8,
      centroReferencia: 'Hospital Dia Visão', cirurgiaData: diasAtras(1).slice(0, 10), lioSelecionada: 'AcrySof IQ +19.5D',
      pendenciasProximaEtapa: [],
      alertasAtivos: [],
    },
    {
      id: 'SOL-2044', pacienteNome: 'Benedito Carlos Vieira', idade: 80, convenio: 'Bradesco Saúde', olho: 'OE',
      medicoNome: 'Dr. Eduardo Vale', estado: 'Concluída', prioridade: 'P3', tempoParadoDias: 0,
      slaStatus: 'ok', slaPercentual: 0, slaLabel: 'Concluída', scoreIA: 5,
      centroReferencia: 'Centro Oftalmológico Central', cirurgiaData: diasAtras(14).slice(0, 10), lioSelecionada: 'TECNIS Eyhance +20.0D',
      pendenciasProximaEtapa: [],
      alertasAtivos: [],
    },
  ]

  return base.map((s) => {
    const iniciais = s.medicoNome.replace('Dra.', '').replace('Dr.', '').trim().split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    return {
      ...s,
      colunaKanban: ESTADO_PARA_COLUNA[s.estado] || null,
      // "Cálculo realizado" some das pendências quando a calculadora do Hub retorna resultado
      calculoRealizado: !s.pendenciasProximaEtapa.includes('Cálculo realizado') && ESTADOS.indexOf(s.estado) > ESTADOS.indexOf('Em Cálculo'),
      responsavelAtual: { nome: s.medicoNome, iniciais },
      checklist: gerarChecklist(s.estado, s.pendenciasProximaEtapa),
      exames: gerarExames(s.estado),
      documentos: gerarDocumentos(s.estado),
      tarefas: gerarTarefas(s),
      alertas: gerarAlertasDetalhados(s.alertasAtivos, s.pacienteNome),
      timeline: gerarTimeline(s, hoje),
      comentarios: gerarComentarios(s),
    }
  })
}

function gerarChecklist(estado, pendencias) {
  const coluna = ESTADO_PARA_COLUNA[estado]
  const labels = GATE_LABELS[coluna] || GATE_LABELS['Avaliação']
  return labels.map((label) => ({
    item: label,
    status: pendencias.includes(label) ? 'pendente' : 'concluido',
    exigeAnexo: GATES_COM_ANEXO.includes(label),
    anexo: null,
  }))
}

function gerarExames(estado) {
  const idx = ESTADOS.indexOf(estado)
  const base = [
    { nome: 'Biometria (IOLMaster)', status: idx >= 3 ? 'validado' : idx >= 2 ? 'recebido' : 'aguardando' },
    { nome: 'Topografia corneana', status: idx >= 4 ? 'validado' : idx >= 3 ? 'recebido' : 'aguardando' },
    { nome: 'Paquimetria', status: idx >= 4 ? 'validado' : 'aguardando' },
    { nome: 'Contagem endotelial', status: idx >= 5 ? 'validado' : 'aguardando' },
  ]
  return base
}

function gerarDocumentos(estado) {
  const idx = ESTADOS.indexOf(estado)
  return [
    { nome: 'Termo de consentimento', status: idx >= 3 ? 'assinado' : 'pendente' },
    { nome: 'Laudo de indicação cirúrgica', status: idx >= 2 ? 'anexado' : 'pendente' },
    { nome: 'Guia de autorização (convênio)', status: idx >= 9 ? 'anexado' : 'pendente' },
  ]
}

function gerarTarefas(s) {
  const tarefas = []
  if (s.pendenciasProximaEtapa.length) {
    tarefas.push({
      titulo: `Resolver: ${s.pendenciasProximaEtapa[0]}`,
      origem: s.slaStatus === 'vencido' ? 'Sistema' : 'IA',
      responsavel: s.medicoNome,
      prazo: s.slaStatus === 'vencido' ? 'Atrasada' : 'Hoje',
      prioridade: s.prioridade,
      status: 'Aberta',
    })
  }
  if (s.alertasAtivos.some((a) => a.categoria === 'sla')) {
    tarefas.push({
      titulo: 'Justificar atraso de etapa para supervisor',
      origem: 'Sistema',
      responsavel: 'Secretária do centro',
      prazo: 'Hoje',
      prioridade: 'P1',
      status: 'Aberta',
    })
  }
  return tarefas
}

function gerarAlertasDetalhados(alertasAtivos, pacienteNome) {
  const textos = {
    clinico: `Inconsistência entre biometria e topografia detectada para ${pacienteNome}`,
    sla: 'SLA da etapa atual em risco ou vencido',
    convenio: 'Autorização do convênio pendente ou vencida',
    operacional: 'Documento com falha de OCR — revisão manual necessária',
    farmacia: 'LIO selecionada sem disponibilidade confirmada em estoque',
    cirurgia: 'Cirurgia próxima com pendência em aberto',
    exames: 'Exame solicitado sem retorno do laboratório',
  }
  const destinatarios = {
    clinico: 'Médico responsável', sla: 'Responsável + Supervisor', convenio: 'Secretária + Auditoria',
    operacional: 'Técnico / Secretária', farmacia: 'Farmácia + Centro Cirúrgico', cirurgia: 'Médico + Enfermagem',
    exames: 'Secretária / Médico',
  }
  return alertasAtivos.map((a) => ({
    categoria: a.categoria,
    severidade: a.severidade,
    mensagem: textos[a.categoria] || 'Alerta ativo',
    destinatario: destinatarios[a.categoria] || '—',
  }))
}

function gerarTimeline(s, hoje) {
  const t = (dias, tipo, origem, descricao) => ({
    timestamp: new Date(hoje.getTime() - dias * 86400000 * 3600000 / 3600000).toISOString(),
    tipo, origem, descricao,
  })
  const iso = (dias, horas) => new Date(hoje.getTime() - (dias * 24 + (horas || 0)) * 3600000).toISOString()
  const eventos = [
    { timestamp: iso(s.tempoParadoDias + 3), tipo: 'Sistema', origem: 'sistema', descricao: 'Solicitação criada a partir da triagem' },
    { timestamp: iso(s.tempoParadoDias + 2), tipo: 'Automático', origem: 'sistema', descricao: `Transição automática para "${ESTADOS[Math.max(0, ESTADOS.indexOf(s.estado) - 1)]}"` },
    { timestamp: iso(s.tempoParadoDias + 1), tipo: 'Manual', origem: 'usuario', descricao: `Etapa avançada manualmente por ${s.medicoNome}` },
    { timestamp: iso(s.tempoParadoDias), tipo: 'Sistema', origem: 'sistema', descricao: `Entrada na etapa "${s.estado}"` },
  ]
  if (s.alertasAtivos.length) {
    eventos.push({ timestamp: iso(Math.max(0, s.tempoParadoDias - 1)), tipo: 'IA', origem: 'ia', descricao: `Alerta gerado: ${s.alertasAtivos[0].categoria} (severidade ${s.alertasAtivos[0].severidade})` })
  }
  return eventos.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

function gerarComentarios(s) {
  if (s.prioridade !== 'P1') return []
  return [
    { autor: 'Secretária do centro', texto: `@${s.medicoNome.split(' ')[1] || s.medicoNome} pode confirmar a pendência assim que possível?`, mencionado: true },
  ]
}

const MOCK = {
  ESTADOS, ESTADO_PARA_COLUNA, COLUNAS_KANBAN, GATE_LABELS, GATES_COM_ANEXO, MEDICOS,
  ETAPAS_DEFAULT, TIPO_ETAPA_LABELS, SUBTIPO_ETAPA_LABELS,
  CLINICA, USUARIO_LOGADO,
  solicitacoes: gerarSolicitacoes(),
}

window.MOCK = MOCK
