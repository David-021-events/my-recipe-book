#!/usr/bin/env node
/**
 * Generates a PBKDF2 password hash you can paste into Supabase.
 *
 * Usage:
 *   node scripts/set-password.mjs
 *
 * It will prompt you for a password, then print the SQL to run.
 */

import { createInterface } from 'readline'

const rl = createInterface({ input: process.stdin, output: process.stdout })
rl.question('Enter your new password: ', async (password) => {
  rl.close()

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const salt = new Uint8Array(new ArrayBuffer(16))
  globalThis.crypto.getRandomValues(salt)

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const derived = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  )

  const toHex = (bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const hash = `pbkdf2:${toHex(salt)}:${toHex(new Uint8Array(derived))}`

  console.log('\nRun this in the Supabase SQL editor:\n')
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'your@email.com';`)
  console.log('\n(Replace your@email.com with your actual email if needed)')
})
