# Exames de referência (APACRS / JJVision Pro)

PDFs de biometria de vários equipamentos para **testes de comparação** entre:

1. Cálculo **manual** no [Barrett True-K Toric](https://calc.apacrs.org/TrueKToricTK_preview/TrueKToricTK.aspx)
2. Cálculo **headless** via `jjvision-calculation-gateway`

## Arquivos

| PDF | Equipamento |
|-----|-------------|
| Alcon OcuScan RxP.pdf | Alcon OcuScan |
| Argos.pdf | Alcon Argos |
| Haag Lenstar 900.pdf | Haag-Streit Lenstar |
| Heidelberg.pdf | Heidelberg |
| IOL Master 500.pdf | Zeiss IOLMaster 500 |
| IOL Master 700.pdf | Zeiss IOLMaster 700 |
| Moptim Colombo IOL.pdf | Moptim |
| Nidek AL-Scan.pdf | Nidek |
| Tomey AO-2000.pdf | Tomey |
| Topcon Aladdin.pdf | Topcon |
| Ziemer Galilei G6.pdf | Ziemer |

Guia da calculadora: [Barrett True-K Toric Calculator V2.0.pdf](../Barrett%20True-K%20Toric%20Calculator%20V2.0.pdf)

## Extração automática (texto no PDF)

| PDF | Texto extraível | OD / OE (AL mm) |
|-----|-----------------|-----------------|
| IOL Master 700.pdf | Sim | 22,36 / 22,31 |
| Topcon Aladdin.pdf | Sim | 23,88 / 23,86 |
| Haag Lenstar 900.pdf | Sim | 22,78 / 22,63 |
| Demais (Argos, Nidek, Heidelberg, …) | Só imagem no PDF | usar **upload no JJVision Pro** (Voiston OCR) |

## Runner em lote (gateway)

No repositório `jjvision-calculation-gateway`:

```powershell
# Só extração de biometria (rápido)
npx tsx scripts/exames-batch-apacrs.ts --extract-only

# Um arquivo + APACRS headless
npx tsx scripts/exames-batch-apacrs.ts --file "IOL Master 700.pdf"

# Lote completo (demorado: ~1–2 min por PDF)
npx tsx scripts/exames-batch-apacrs.ts
```

Relatório: `jjvision-calculation-gateway/artifacts/exames-batch/report.json`

## Comparação 100%

Para cada exame:

1. Anotar no site APACRS (mesma lente/A-constant, History, Pre/Post se LASIK) os valores da aba **Toric IOL**.
2. Conferir `report.json` → `apacrs.results[]` (modelo, S.E., residual, eixo).
3. Divergências de modelo (`T2` vs `ZCU100`) indicam **lente diferente** no dropdown — alinhar lente entre manual e gateway.

No JJVision Pro, o fluxo ideal é upload → Voiston parse → validação → gateway (payload idêntico ao formulário).
