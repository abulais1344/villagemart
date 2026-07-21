/**
 * One-time migration: hash all plaintext merchant and rider portal_passwords.
 *
 * Safe to re-run: bcrypt hashes start with "$2b$" — rows already hashed are skipped.
 *
 * Usage:
 *   node scripts/hash-passwords.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 * Load a .env.local before running, e.g.:
 *   node --env-file=.env.local scripts/hash-passwords.mjs
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function isAlreadyHashed(password) {
  return typeof password === 'string' && (password.startsWith('$2b$') || password.startsWith('$2a$'));
}

async function hashTable(table, idCol = 'id') {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`${idCol}, portal_username, portal_password`);

  if (error) {
    console.error(`Failed to fetch ${table}:`, error.message);
    return;
  }

  let skipped = 0;
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.portal_password || isAlreadyHashed(row.portal_password)) {
      skipped++;
      continue;
    }

    const hash = await bcrypt.hash(row.portal_password, 10);
    const { error: updateError } = await supabase
      .from(table)
      .update({ portal_password: hash })
      .eq(idCol, row[idCol]);

    if (updateError) {
      console.error(`  FAIL [${row.portal_username}]:`, updateError.message);
      failed++;
    } else {
      console.log(`  OK   [${row.portal_username}]`);
      updated++;
    }
  }

  console.log(`${table}: ${updated} hashed, ${skipped} already-hashed skipped, ${failed} failed`);
}

console.log('=== Hashing merchants ===');
await hashTable('merchants');

console.log('\n=== Hashing vm_riders ===');
await hashTable('vm_riders');

console.log('\nDone.');
