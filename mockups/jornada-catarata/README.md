# Jornada Inteligente da Catarata — protótipo navegável (mock)

Protótipo estático (HTML/CSS/JS puro, **sem build, sem backend**) das telas principais descritas na especificação
`Jornada Inteligente da Catarata` (uso interno). Serve para validar a experiência de navegação e a composição das
telas com o time (Dev/Design/PO) **antes** de iniciar a implementação real (Fases 1–4 do roadmap do documento).

## Como abrir

Este protótipo **não funciona bem via `file://` direto** (alguns navegadores bloqueiam scripts locais
carregados dessa forma). Sirva a pasta com qualquer servidor estático simples, por exemplo:

```bash
# a partir da raiz do repo
python -m http.server 4173 --directory mockups/jornada-catarata
```

Depois abra `http://localhost:4173`. Também já existe uma configuração pronta em `.claude/launch.json`
(`jornada-catarata-mock`, porta 4173) para quem estiver usando o preview do Claude Code.

## Telas

- **`dashboard.html`** — Indicadores gerenciais: KPIs, heatmap de gargalos, benchmark vs tempo real por etapa,
  fila de casos críticos, tendências.
- **`index.html`** — Central de Planejamento: KPIs, Kanban (7 colunas, com split Aguardando Cálculo / Em Cálculo) /
  Lista / Fila de Prioridade, filtros, bloqueio de drag-and-drop quando o gate da próxima etapa não foi cumprido.
- **`solicitacao.html?id=SOL-XXXX`** — Detalhe da Solicitação: layout de 3 colunas + rodapé expansível
  (checklist, alertas, tarefas, exames/documentos, timeline auditável, comentários, ações com motivo obrigatório).
  Inclui o **nó funcional da calculadora** (simula o Hub calculando → sistema reconhece → libera avanço) e
  **gates com evidência** (itens tipo documento exigem anexo comprovante).
- **`config.html`** — Configuração de Etapas: cada clínica monta o próprio fluxo (ocultar, remover,
  adicionar etapa com tipo Tarefa/Aprovação/Decisão). Persistido em localStorage; Kanban reflete na hora.
- **`medicos.html`** — Central de Médicos: cadastro (nome, CRM, especialidade, telefone, WhatsApp, e-mail,
  unidades que atende, ativo/inativo). É a fonte de contato usada pelas notificações — sem cadastro ou com
  médico inativo, o botão "Enviar mensagem ao médico" fica bloqueado.

Header comum: sino de **notificações** (push PWA simulado — ex.: paciente parado há 2 dias → atendente
envia mensagem ao médico, com registro na timeline) + avatar do usuário logado e clínica.

## O que é mock vs o que é real

Tudo aqui roda 100% client-side com dados fictícios em `js/mock-data.js` (14 estados da máquina, 6 colunas de
Kanban, gates por etapa, alertas, tarefas, timeline). Nada é persistido além do estado da aba atual (recarregar
a página reseta os dados). Não há:

- Motor de IA real (score de risco é um número fixo por registro mock)
- Integrações reais (PEP, OCR, convênio, agenda, centro cirúrgico)
- WebSocket / tempo real
- Banco de dados ou API

Essas peças ficam para as Fases 5–6 do roadmap real do documento-fonte.

## Identidade visual

Os tokens de cor em `css/tokens.css` foram extraídos de `app/globals.css` do Voiston Calculator Hub
(`--color-primary`, `--color-teal`, `--color-od`, `--color-oe`) para que este módulo pareça parte do mesmo
produto. O link "← Calculator Hub" no cabeçalho aponta para `http://localhost:3003` (app real, rodando via
`npm run dev`).

## Roteiro de teste sugerido

1. Central de Planejamento → trocar entre Kanban / Lista / Fila de Prioridade
2. Filtrar por prioridade, SLA ou médico
3. Arrastar um card para a coluna seguinte:
   - se houver pendências, aparece um modal listando os gates não cumpridos
   - se não houver, o card avança e um evento é registrado na timeline
4. Arrastar um card para uma coluna anterior → modal exige motivo antes de confirmar o retorno
5. Clicar em um card → abre o Detalhe da Solicitação
6. Testar as ações (Avançar etapa, Suspender, Cancelar, Retornar) e conferir que a Timeline no rodapé é
   atualizada
7. Abrir o Dashboard e conferir KPIs, heatmap e gráfico de tempo por etapa
