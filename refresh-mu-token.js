#!/usr/bin/env node
/**
 * refresh-mu-token.js
 *
 * Standalone helper - NOT part of the app's runtime, just a manual/cron
 * utility you run when the fast scanner starts failing with 401s.
 *
 * What we actually know, confirmed from MangaUpdates' own OpenAPI docs and
 * from a developer's live report on their forum:
 *   - Login is PUT /account/login with {username, password} JSON body.
 *   - It returns a JWT.
 *   - MangaUpdates only keeps ONE active session token per account at a
 *     time - logging in again just returns the same JWT if it's still
 *     valid, rather than issuing a new one. So re-running this script is
 *     always safe and idempotent.
 *
 * What we could NOT confirm from documentation:
 *   - The exact JSON key the token comes back under (the docs' sample
 *     response for /account/login only shows the generic error-shape
 *     placeholder, not the real 200 success body).
 *   - The token's TTL / expiry window.
 *
 * So this script does NOT assume a specific key name. It prints the full
 * raw response on every run so you can see the actual shape once, then
 * checks a few plausible key names as a convenience. Trust the raw JSON
 * output over the "detected token" guess until you've confirmed it works.
 *
 * Usage:
 *   MU_USERNAME=yourname MU_PASSWORD=yourpass node refresh-mu-token.js
 *
 * Or interactively (it will prompt) if env vars aren't set:
 *   node refresh-mu-token.js
 */

const readline = require('readline')

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer) })
      return
    }
    // Minimal hidden-input handling for password prompts in a plain TTY.
    const stdin = process.stdin
    process.stdout.write(question)
    let input = ''
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (char) => {
      char = char.toString()
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode?.(false)
        stdin.pause()
        stdin.removeListener('data', onData)
        process.stdout.write('\n')
        rl.close()
        resolve(input)
      } else if (char === '\u0003') {
        process.exit(1)
      } else if (char === '\u007f') {
        input = input.slice(0, -1)
      } else {
        input += char
      }
    }
    stdin.on('data', onData)
  })
}

async function main() {
  const username = process.env.MU_USERNAME || await prompt('MangaUpdates username: ')
  const password = process.env.MU_PASSWORD || await prompt('MangaUpdates password: ', true)

  console.log('\nLogging in to MangaUpdates...\n')

  let res
  try {
    res = await fetch('https://api.mangaupdates.com/v1/account/login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch (err) {
    console.error('Network error contacting MangaUpdates:', err.message)
    process.exit(1)
  }

  let body
  const rawText = await res.text()
  try {
    body = JSON.parse(rawText)
  } catch {
    console.error('Response was not valid JSON. Raw response:\n', rawText)
    process.exit(1)
  }

  if (!res.ok) {
    console.error(`Login failed (HTTP ${res.status}):`)
    console.error(JSON.stringify(body, null, 2))
    process.exit(1)
  }

  console.log('Login succeeded. Full raw response (trust this over the guess below):\n')
  console.log(JSON.stringify(body, null, 2))

  // Best-effort guesses at common key names for the token. Not confirmed
  // against MangaUpdates' actual schema - verify against the raw output
  // above before trusting this.
  const candidateKeys = ['session_token', 'token', 'sessionToken', 'context.session_token', 'context.token']
  let foundToken = null
  let foundAt = null

  for (const key of candidateKeys) {
    const parts = key.split('.')
    let val = body
    for (const p of parts) val = val?.[p]
    if (typeof val === 'string' && val.length > 10) {
      foundToken = val
      foundAt = key
      break
    }
  }

  console.log('\n---')
  if (foundToken) {
    console.log(`Best guess: found a token-shaped string at "${foundAt}".`)
    console.log('\nSet this as your env var:')
    console.log(`MANGAUPDATES_API_TOKEN=${foundToken}`)
  } else {
    console.log('Could not auto-detect which field holds the token.')
    console.log('Inspect the raw JSON above and copy the token value manually.')
  }
  console.log('---\n')
  console.log('Reminder: MangaUpdates keeps only one active session per account,')
  console.log('so re-running this script later is always safe - it will just')
  console.log('return the same token if the old one is still valid, or a fresh')
  console.log('one if it expired.')
}

main()