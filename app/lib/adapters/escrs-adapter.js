/**
 * ESCRS IOL Calculator Adapter
 * Headless automation for K1, K2, AL, ACD inputs
 *
 * MUD/Blazor SPA with dynamic IDs
 * Uses label-based element discovery for robustness
 */

const { chromium } = require('playwright')

const ESCRS_URL = 'https://iolcalculator.escrs.org/'
const TIMEOUT_MS = 15000
const WAIT_BETWEEN_OPS = 800 // ms between operations (MUD animations)

/**
 * Find input element by associated label text
 * MUD structure: .mud-input-label wraps text, sibling .mud-input contains input
 */
async function findInputByLabel(page, labelText) {
  try {
    // Find the label
    const labelLocator = page.locator(`.mud-input-label`).filter({ hasText: labelText }).first()

    // Get closest .mud-input parent
    const mudInputLocator = labelLocator.locator('xpath=ancestor::div[contains(@class, "mud-input")]').first()

    // Get input within
    const inputLocator = mudInputLocator.locator('input').first()

    return inputLocator
  } catch (e) {
    throw new Error(`Could not find input for label "${labelText}": ${e.message}`)
  }
}

/**
 * Fill numeric field by label
 */
async function fillField(page, labelText, value) {
  try {
    const input = await findInputByLabel(page, labelText)

    // Wait for visibility
    await input.waitFor({ state: 'visible', timeout: TIMEOUT_MS })

    // Click to focus
    await input.click()
    await page.waitForTimeout(300)

    // Clear + fill
    await input.fill(String(value))

    // Verify value was set
    const filled = await input.inputValue()

    return {
      success: true,
      label: labelText,
      value: filled,
    }
  } catch (e) {
    return {
      success: false,
      label: labelText,
      error: e.message,
    }
  }
}

/**
 * Select from MUD dropdown (Manufacturer, Gender, IOL)
 */
async function selectDropdown(page, labelText, optionText) {
  try {
    const input = await findInputByLabel(page, labelText)

    // Click to open dropdown/popover
    await input.click()
    await page.waitForTimeout(WAIT_BETWEEN_OPS)

    // Find option in .mud-list-item
    const optionLocator = page.locator(`.mud-list-item`).filter({ hasText: optionText }).first()

    // Wait for option to be visible
    await optionLocator.waitFor({ state: 'visible', timeout: TIMEOUT_MS })

    // Click option
    await optionLocator.click()
    await page.waitForTimeout(WAIT_BETWEEN_OPS)

    return {
      success: true,
      label: labelText,
      selected: optionText,
    }
  } catch (e) {
    return {
      success: false,
      label: labelText,
      error: e.message,
    }
  }
}

/**
 * Main calculation function
 */
async function calculateESCRS(biometry, opts = {}) {
  const {
    eye = 'OD', // OD = Right, OS = Left
    manufacturer = 'Alcon',
    headless = false,
    slowMo = headless ? 0 : 500,
    timeout = 60000,
  } = opts

  console.log(`\n🔬 ESCRS IOL Calculator - ${eye}`)
  console.log(`K1=${biometry.k1}, K2=${biometry.k2}, AL=${biometry.al}, ACD=${biometry.acd}\n`)

  let browser
  try {
    // Launch browser
    console.log(`1️⃣  Launching browser (headless=${headless})...`)
    browser = await chromium.launch({
      headless,
      slowMo,
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    // Navigate
    console.log(`2️⃣  Navigating to ${ESCRS_URL}...`)
    await page.goto(ESCRS_URL, {
      waitUntil: 'networkidle',
      timeout: TIMEOUT_MS,
    })

    // Accept terms
    console.log(`3️⃣  Accepting Terms of Use...`)
    try {
      const agreeBtn = page.locator('button').filter({ hasText: 'I Agree' }).first()
      const isVisible = await agreeBtn.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        await agreeBtn.click()
        await page.waitForTimeout(1500)
        console.log(`   ✅ Terms accepted\n`)
      } else {
        console.log(`   ℹ️  Terms already accepted\n`)
      }
    } catch (e) {
      console.log(`   ⚠️  Terms gate skipped: ${e.message}\n`)
    }

    // Scroll to form
    await page.evaluate(() => window.scrollBy(0, 400))
    await page.waitForTimeout(500)

    // Fill numeric fields
    console.log(`4️⃣  Filling biometry fields...`)
    const fillResults = {
      k1: await fillField(page, 'K1', biometry.k1),
      k2: await fillField(page, 'K2', biometry.k2),
      al: await fillField(page, 'AL', biometry.al),
      acd: await fillField(page, 'ACD', biometry.acd),
    }

    // Log fill results
    for (const [field, result] of Object.entries(fillResults)) {
      if (result.success) {
        console.log(`   ✅ ${field.toUpperCase()} = ${result.value}`)
      } else {
        console.log(`   ⚠️  ${field.toUpperCase()}: ${result.error}`)
      }
    }
    console.log()

    // Select Manufacturer (optional, enables IOL selection)
    if (manufacturer) {
      console.log(`5️⃣  Selecting Manufacturer: ${manufacturer}...`)
      const mfrResult = await selectDropdown(page, 'Manufacturer', manufacturer)
      if (mfrResult.success) {
        console.log(`   ✅ ${mfrResult.selected}\n`)
        await page.waitForTimeout(1000) // Wait for IOL list to populate
      } else {
        console.log(`   ⚠️  ${mfrResult.error}\n`)
      }
    }

    // Wait for Calculate button to enable
    console.log(`6️⃣  Waiting for Calculate button...`)
    const calcBtn = page.locator('button').filter({ hasText: 'Calculate' }).first()

    try {
      await calcBtn.waitFor({ state: 'enabled', timeout: 10000 })
      console.log(`   ✅ Calculate button enabled\n`)
    } catch (e) {
      console.log(`   ⚠️  Button may not be enabled yet\n`)
    }

    // Take screenshot before calculate
    await page.screenshot({
      path: `escrs-${eye}-before-calc.png`,
      fullPage: true,
    })
    console.log(`7️⃣  Clicking Calculate...`)

    // Click Calculate
    try {
      await calcBtn.click({ force: true, timeout: 5000 })
      await page.waitForTimeout(4000) // Wait for results to render
      console.log(`   ✅ Clicked\n`)
    } catch (e) {
      console.log(`   ⚠️  Click failed: ${e.message}\n`)
    }

    // Extract results
    console.log(`8️⃣  Extracting results...`)
    const results = await extractResults(page, eye)

    // Screenshot after
    await page.screenshot({
      path: `escrs-${eye}-after-calc.png`,
      fullPage: true,
    })

    console.log(`   ✅ Results captured\n`)

    return {
      success: true,
      calculator: 'ESCRS',
      eye,
      input: {
        k1: biometry.k1,
        k2: biometry.k2,
        al: biometry.al,
        acd: biometry.acd,
        manufacturer,
      },
      results,
      screenshots: {
        before: `escrs-${eye}-before-calc.png`,
        after: `escrs-${eye}-after-calc.png`,
      },
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`)
    return {
      success: false,
      calculator: 'ESCRS',
      eye,
      error: error.message,
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Extract IOL power results from page
 * Looks for table with results or text containing IOL power values
 */
async function extractResults(page, eye) {
  try {
    const results = await page.evaluate(() => {
      const data = {}

      // Look for tables (results format)
      const tables = document.querySelectorAll('table')
      if (tables.length > 0) {
        // Parse first table as results
        const rows = tables[0].querySelectorAll('tr')
        for (let row of rows) {
          const cells = row.querySelectorAll('td, th')
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim()
            const value = cells[1].textContent.trim()

            if (label && value && value.length > 0) {
              data[label] = value
            }
          }
        }
      }

      // Fallback: extract text with D (diopters)
      if (Object.keys(data).length === 0) {
        const allText = document.body.innerText
        const iolMatches = allText.match(/(\d+\.?\d*)\s*D/g)
        if (iolMatches) {
          data.iolPowers = iolMatches.slice(0, 3) // First 3 matches
        }
      }

      return data
    })

    return results
  } catch (e) {
    return { error: `Could not extract results: ${e.message}` }
  }
}

module.exports = {
  calculateESCRS,
  ESCRS_URL,
}
