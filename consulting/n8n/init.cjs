// One-shot setup for the automations stack (n8n + Postgres). Runs as root before either starts,
// on every deploy, and is safe to re-run:
//   - generates the database password, the n8n encryption key and Charles's n8n password on the
//     first run only (stored in the automation_secrets volume, never in git or logs);
//   - writes the bcrypt hash n8n uses to keep the owner account in sync;
//   - prefills n8n's IMAP and SMTP credentials with the mailbox already used by the intake;
//   - emails Charles his sign-in once (live deploy only).
// It uses the n8n image so it can borrow n8n's own bcryptjs and nodemailer.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');

const DIR = process.env.SECRETS_PATH || '/secrets';     // volume shared with postgres and n8n
const SMTP_PASSWORD_FILE = process.env.SMTP_PASSWORD_FILE || '/host-secrets/smtp_password'; // /opt/ecm/secrets (read-only)
const N8N_DIR = process.env.N8N_PACKAGE_DIR || '/usr/local/lib/node_modules/n8n';
const SMTP = { host: process.env.SMTP_HOST || 'smtp.hostinger.com', port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_SECURE !== '0' };
const NODE_UID = 1000;                                    // n8n runs as "node"
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'charles@executivecapacitymap.com';
const N8N_URL = process.env.N8N_URL || 'https://automations.executivecapacitymap.com';
const SEND_WELCOME = process.env.WELCOME_EMAIL === '1';

const log = msg => console.log('[automations-init] ' + msg);
const p = name => path.join(DIR, name);
const has = name => { try { return fs.statSync(p(name)).size > 0; } catch (e) { return false; } };
const read = file => fs.readFileSync(file, 'utf8').trim();

function put(name, value) {
  const tmp = p(name) + '.tmp';
  fs.writeFileSync(tmp, value, { mode: 0o400 });
  fs.chownSync(tmp, NODE_UID, NODE_UID);
  fs.renameSync(tmp, p(name));
}

// Unambiguous characters, grouped so the password is easy to copy: 5 groups of 5 (~145 bits).
function password() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const groups = [];
  for (let g = 0; g < 5; g++) {
    let s = '';
    for (let i = 0; i < 5; i++) s += abc[crypto.randomInt(abc.length)];
    groups.push(s);
  }
  return groups.join('-');
}

function n8nRequire() {
  const candidates = [N8N_DIR];
  try { candidates.push(path.dirname(path.dirname(fs.realpathSync('/usr/local/bin/n8n')))); } catch (e) { /* not linked */ }
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return createRequire(path.join(dir, 'package.json'));
  }
  throw new Error('n8n is not installed where expected');
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });
  fs.chownSync(DIR, NODE_UID, NODE_UID);
  fs.chmodSync(DIR, 0o700);
  const req = n8nRequire();
  const bcrypt = req('bcryptjs');

  for (const [name, make] of [['pg_password', () => crypto.randomBytes(24).toString('base64url')],
                              ['n8n_encryption_key', () => crypto.randomBytes(32).toString('base64url')],
                              ['owner_password', password]]) {
    if (has(name)) log(name + ': kept');
    else { put(name, make()); log(name + ': generated'); }
  }

  const owner = read(p('owner_password'));
  if (has('owner_password_hash') && bcrypt.compareSync(owner, read(p('owner_password_hash')))) log('owner password hash: kept');
  else { put('owner_password_hash', bcrypt.hashSync(owner, 10)); log('owner password hash: written'); }

  // n8n fills these fields into every IMAP / SMTP credential and hides them in the editor,
  // so a credential for the business mailbox can be created without typing the password.
  let mailbox = '';
  try { mailbox = read(SMTP_PASSWORD_FILE); } catch (e) { /* reported below */ }
  const overwrite = mailbox ? {
    imap: { host: 'imap.hostinger.com', port: 993, secure: true, user: OWNER_EMAIL, password: mailbox, allowUnauthorizedCerts: false },
    smtp: { host: 'smtp.hostinger.com', port: 465, secure: true, user: OWNER_EMAIL, password: mailbox }
  } : {};
  put('credentials_overwrite.json', JSON.stringify(overwrite));
  log(mailbox ? 'mailbox credentials: prefilled' : 'mailbox credentials: skipped (no smtp_password on the server yet)');

  const nodemailer = req('nodemailer');
  if (!SEND_WELCOME) { log('welcome email: off for this deploy (mailer ready)'); return; }
  if (has('welcome_sent')) { log('welcome email: already sent'); return; }
  if (!mailbox) { log('welcome email: not sent (no smtp_password); see DEPLOY.md to read the password on the server'); return; }
  const text = [
    'Your automations workspace is ready: ' + N8N_URL,
    '',
    'Sign in with',
    '  Email: ' + OWNER_EMAIL,
    '  Password: ' + owner,
    '',
    'Then:',
    '1. Save the password in your password manager and delete this email.',
    '2. Turn on two-step login: click your initials (bottom left) > Settings > Personal > Two-factor authentication.',
    '3. Connect n8n to Claude: Settings > Instance-level MCP > Connect a client > Claude > One-click setup.',
    '',
    'The server sets this password, so changing it inside n8n will not stick. Ask Claude to rotate it if you ever need a new one.'
  ].join('\n');
  try {
    const mailer = nodemailer.createTransport({ host: SMTP.host, port: SMTP.port, secure: SMTP.secure, auth: { user: OWNER_EMAIL, pass: mailbox } });
    await mailer.sendMail({ from: '"Automations" <' + OWNER_EMAIL + '>', to: OWNER_EMAIL, subject: 'Your n8n sign-in', text });
    put('welcome_sent', new Date().toISOString());
    log('welcome email: sent to ' + OWNER_EMAIL);
  } catch (e) {
    // Not fatal: n8n still starts, and the password can be read on the server (DEPLOY.md).
    log('welcome email: failed (' + (e && e.code || e && e.name || 'error') + ')');
  }
}

main().catch(e => { log('failed: ' + (e && e.message || e)); process.exit(1); });
