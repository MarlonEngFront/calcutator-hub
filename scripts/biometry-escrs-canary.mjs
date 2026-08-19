// Canário automatizado: testa o fluxo completo de upload de biometria + cálculo
// via calculadora ESCRS (a única com pipeline de reCAPTCHA/2captcha — o elo mais
// frágil da aplicação, por isso o foco só nela em vez de cobrir as 6 calculadoras).
//
// Pensado para rodar no GitHub Actions (.github/workflows/biometry-escrs-canary.yml),
// mas também roda localmente: `HEADED=1 node scripts/biometry-escrs-canary.mjs`.
//
// Sessão do Google: login automatizado via popup falha silenciosamente em modo
// headless (bug conhecido do Firebase Auth com Chromium headless — visto em produção
// nos testes que originaram este script). Por isso sempre roda com uma janela real
// (headed) — no CI isso significa rodar sob xvfb-run — e reaproveita uma sessão
// salva via AUTH_STATE_JSON em vez de repetir o popup a cada execução.
//
// Variáveis de ambiente:
//   AUTH_STATE_JSON      (obrigatória) conteúdo de um storageState do Playwright já
//                         autenticado — gere localmente com Playwright e guarde como
//                         secret VOISTON_AUTH_STATE_JSON no repo.
//   SLACK_WEBHOOK_URL     (opcional) alerta via Slack quando a execução falhar.
//   VOISTON_EMAIL/PASSWORD (opcional) fallback só usado se a sessão salva expirar.
//   HEADED=1              roda com janela visível (necessário sempre — ver acima).

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const CONFIG = {
  url: 'https://voiston-hub.web.app/',
  filePath: path.join(REPO_ROOT, 'test-assets', 'biometry', 'Nidek AL-Scan.pdf'),
  lensBrand: 'J&J Vision',
  lensModel: /ZCB00/i,
  calculator: /ESCRS/i,
  loginTimeoutMs: 60_000,
  uploadRetryTimeoutMs: 480_000, // extração pode levar até ~8 minutos
  navigationTimeoutMs: 180_000, // ESCRS resolve captcha via 2captcha; pode levar ~2-8min
  sessionCheckTimeoutMs: 15_000,
  silentLoginTimeoutMs: 10_000,
  authStateFile: path.join(REPO_ROOT, 'auth-state.json'),
  artifactsDir: path.join(REPO_ROOT, 'biometry-artifacts'),
};

function loadCredentials() {
  if (process.env.VOISTON_EMAIL && process.env.VOISTON_PASSWORD) {
    return { email: process.env.VOISTON_EMAIL, password: process.env.VOISTON_PASSWORD };
  }
  throw new Error(
    'Sessão salva ausente/expirada e sem fallback: defina VOISTON_EMAIL/VOISTON_PASSWORD ' +
      'ou gere um novo AUTH_STATE_JSON localmente e atualize o secret.'
  );
}

function nowIso() {
  return new Date().toISOString();
}

async function captureDebugArtifacts(page, label) {
  const stamp = nowIso().replace(/[:.]/g, '-');
  const shotPath = path.join(CONFIG.artifactsDir, `${label}-${stamp}.png`);
  const infoPath = path.join(CONFIG.artifactsDir, `${label}-${stamp}.txt`);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch {
    // página pode já ter navegado/fechado; ignora
  }
  try {
    const url = page.url();
    const bodyText = await page.innerText('body').catch(() => '(não foi possível ler o texto da página)');
    writeFileSync(infoPath, `URL: ${url}\n\n--- texto visível da página ---\n${bodyText.slice(0, 5000)}`);
  } catch {
    // idem
  }
  return { shotPath, infoPath };
}

async function notifySlackOnFailure(run) {
  if (run.outcome === 'success') return;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const step = run.failedAtStep || 'unknown';
  const error = run.steps[step]?.error || 'desconhecido';
  const runUrl = process.env.GITHUB_SERVER_URL
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
  const text =
    `🔴 *Canário ESCRS falhou* — voiston-hub.web.app\n` +
    `Etapa: \`${step}\`\n` +
    `Erro: ${error}\n` +
    `Início: ${run.startedAt}` +
    (runUrl ? `\nRun: ${runUrl}` : '');

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error(`Falha ao enviar alerta para o Slack: ${err.message}`);
  }
}

// getCreds: função que retorna { email, password } — só é chamada se o Google exigir
// login manual. Quando já existe sessão do Google válida (via AUTH_STATE_JSON), o
// popup completa sozinho (SSO silencioso) e nunca mostra o campo de e-mail.
async function login(page, getCreds) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Entrar com Google' }).click();
  const popup = await popupPromise;

  try {
    const emailField = popup.getByRole('textbox', { name: 'Insira seu e-mail' });
    const needsManualLogin = await emailField
      .waitFor({ state: 'visible', timeout: CONFIG.silentLoginTimeoutMs })
      .then(() => true)
      .catch(() => false);

    if (needsManualLogin) {
      const creds = getCreds();
      await emailField.click();
      await emailField.fill(creds.email);
      await popup.getByRole('button', { name: 'Avançar' }).click();

      await popup.getByRole('checkbox', { name: 'Mostrar senha' }).check();
      await popup.getByRole('textbox', { name: 'Digite sua senha' }).click();
      await popup.getByRole('textbox', { name: 'Digite sua senha' }).fill(creds.password);
      await popup.getByRole('button', { name: 'Avançar' }).click();
    }

    // Espera o popup fechar (login concluído) e a página principal ficar pronta para upload.
    await page.getByText('Selecionar arquivo').waitFor({ state: 'visible', timeout: CONFIG.loginTimeoutMs });
  } catch (err) {
    // captura o estado do popup (não só da página principal) para diagnosticar qualquer
    // tela do Google — manual, silenciosa ou inesperada (seletor de conta, 2FA, etc.)
    if (!popup.isClosed()) {
      await captureDebugArtifacts(popup, 'login-popup').catch(() => {});
    }
    throw err;
  }
}

// Faz upload e trata o botão "Fechar e tentar novamente" que aparece quando a extração falha.
// Tenta no máximo 2 vezes (1 tentativa original + 1 retry), igual ao fluxo observado manualmente.
async function uploadAndExtract(page) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    await page.getByText('Selecionar arquivo').click();
    await page.getByLabel('Selecionar arquivo').setInputFiles(CONFIG.filePath);

    const outcome = await Promise.race([
      page
        .getByRole('button', { name: 'Fechar e tentar novamente' })
        .waitFor({ state: 'visible', timeout: CONFIG.uploadRetryTimeoutMs })
        .then(() => 'retry'),
      page
        .waitForURL('**/validate/**', { timeout: CONFIG.uploadRetryTimeoutMs })
        .then(() => 'success'),
    ]).catch(() => 'timeout');

    if (outcome === 'success') return;
    if (outcome === 'retry') {
      if (attempt === 2) throw new Error('Extração falhou novamente após retry ("Fechar e tentar novamente")');
      await page.getByRole('button', { name: 'Fechar e tentar novamente' }).click();
      continue;
    }
    throw new Error('Timeout esperando resultado da extração (nem sucesso, nem erro detectado)');
  }
}

async function selectLens(page) {
  await page.getByRole('button', { name: 'Confirmar e selecionar lentes' }).click();
  await page.getByRole('button', { name: CONFIG.lensBrand }).click();
  await page.getByRole('button', { name: CONFIG.lensModel }).click();
  await page.getByRole('button', { name: /Ir para calculadoras/i }).click();
}

async function selectCalculator(page) {
  await page.getByRole('button', { name: CONFIG.calculator }).click();
}

async function calculate(page) {
  await page.getByRole('button', { name: /Calcular/i }).click();
  await page.waitForURL('**/results/**', { timeout: CONFIG.navigationTimeoutMs });
}

async function runTest() {
  const run = {
    startedAt: nowIso(),
    finishedAt: null,
    steps: {
      navigate: { ok: false, error: null },
      login: { ok: false, error: null },
      upload: { ok: false, error: null },
      extraction: { ok: false, error: null },
      lensSelection: { ok: false, error: null },
      calculatorSelection: { ok: false, error: null },
      calculation: { ok: false, error: null },
    },
    outcome: 'failed',
    failedAtStep: null,
  };

  // declarados fora do try para o catch/finally conseguirem fechar o browser e
  // capturar debug mesmo se o erro acontecer antes da página existir
  let browser;
  let page;

  try {
    browser = await chromium.launch({ headless: !process.env.HEADED });
    const hasSavedSession = existsSync(CONFIG.authStateFile);
    const context = await browser.newContext(
      hasSavedSession ? { storageState: CONFIG.authStateFile } : {}
    );
    page = await context.newPage();

    await page.goto(CONFIG.url, { waitUntil: 'networkidle' });
    run.steps.navigate.ok = true;

    const alreadyLoggedIn = hasSavedSession
      ? await page
          .getByText('Selecionar arquivo')
          .waitFor({ state: 'visible', timeout: CONFIG.sessionCheckTimeoutMs })
          .then(() => true)
          .catch(() => false)
      : false;

    if (alreadyLoggedIn) {
      run.steps.login.ok = true;
    } else {
      await login(page, loadCredentials);
      run.steps.login.ok = true;
      // sessão nova/renovada: persiste no arquivo local (best-effort — se falhar,
      // o login desta execução já funcionou mesmo assim; não interrompe o teste).
      // No CI isso não sobrevive entre execuções (runner efêmero) a menos que o
      // workflow re-exporte esse arquivo pra um novo secret manualmente.
      await context.storageState({ path: CONFIG.authStateFile }).catch((err) => {
        console.error(`Aviso: falha ao salvar sessão em ${CONFIG.authStateFile}: ${err.message}`);
      });
    }

    await uploadAndExtract(page);
    run.steps.upload.ok = true;
    run.steps.extraction.ok = true; // upload bem-sucedido == extração concluída (chegou em /validate/)

    await selectLens(page);
    run.steps.lensSelection.ok = true;

    await selectCalculator(page);
    run.steps.calculatorSelection.ok = true;

    await calculate(page);
    run.steps.calculation.ok = true;

    run.outcome = 'success';
    // guarda screenshot/texto da página de resultados como evidência do valor calculado
    // (não valida o número em si — é pra permitir checagem manual de regressões silenciosas)
    const { shotPath, infoPath } = await captureDebugArtifacts(page, 'result');
    run.resultScreenshot = shotPath;
    run.resultInfo = infoPath;
  } catch (err) {
    run.failedAtStep = Object.entries(run.steps).find(([, v]) => !v.ok)?.[0] || 'unknown';
    if (!run.steps[run.failedAtStep]) run.steps[run.failedAtStep] = { ok: false, error: null };
    run.steps[run.failedAtStep].error = err.message;
    console.error(`[${nowIso()}] Falha na etapa "${run.failedAtStep}": ${err.message}`);
    // `page` pode não existir ainda se o erro aconteceu no lançamento do próprio Chromium
    if (page) {
      const { shotPath, infoPath } = await captureDebugArtifacts(page, run.failedAtStep);
      run.steps[run.failedAtStep].debugScreenshot = shotPath;
      run.steps[run.failedAtStep].debugInfo = infoPath;
      console.error(`Screenshot de depuração salvo em: ${shotPath}`);
    }
  } finally {
    run.finishedAt = nowIso();
    if (browser) await browser.close().catch(() => {});
    console.log(JSON.stringify(run, null, 2));
    await notifySlackOnFailure(run);
  }

  return run;
}

mkdirSync(CONFIG.artifactsDir, { recursive: true });

runTest()
  .then((run) => {
    console.log(`\nResultado desta execução: ${run.outcome === 'success' ? 'SUCESSO' : 'FALHA'}`);
    process.exit(run.outcome === 'success' ? 0 : 1);
  })
  .catch((err) => {
    // rede de segurança final: nada dentro de runTest() deveria mais escapar até aqui,
    // mas se escapar, ainda queremos ver o erro no console em vez de um crash silencioso
    console.error('Erro inesperado fora do fluxo de teste:', err);
    process.exit(1);
  });
