import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve('public/icons')

// Mesmo ícone de app/icon.svg (bg azul arredondado + check branco), usado para
// os ícones "any" (192/512) e apple-touch-icon.
const ICON_ANY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#2563eb"/>
  <path d="M9 10L16 22L23 10" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim()

// Versão "maskable": fundo azul cobrindo 100% do canvas (sem cantos
// arredondados, quem arredonda é a máscara do SO) e o check reduzido/centrado
// dentro da safe zone (círculo de 80% de diâmetro).
const ICON_MASKABLE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb"/>
  <g transform="translate(77,77) scale(11.1875)">
    <path d="M9 10L16 22L23 10" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>
`.trim()

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const anySvg = Buffer.from(ICON_ANY_SVG)
  const maskableSvg = Buffer.from(ICON_MASKABLE_SVG)

  await Promise.all([
    sharp(anySvg, { density: 384 }).resize(192, 192).png().toFile(path.join(OUT_DIR, 'icon-192.png')),
    sharp(anySvg, { density: 384 }).resize(512, 512).png().toFile(path.join(OUT_DIR, 'icon-512.png')),
    sharp(anySvg, { density: 384 }).resize(180, 180).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png')),
    sharp(maskableSvg).resize(512, 512).png().toFile(path.join(OUT_DIR, 'icon-maskable-512.png')),
  ])

  await writeFile(path.join(OUT_DIR, 'icon-maskable.svg'), ICON_MASKABLE_SVG)

  console.log('Ícones PWA gerados em public/icons/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
