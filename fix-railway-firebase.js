#!/usr/bin/env node
/**
 * Legacy Railway helper — DISABLED.
 *
 * A previous version of this file contained a Firebase private key in plaintext.
 * That key MUST be rotated in Google Cloud IAM / Firebase Console.
 *
 * Do not put service-account keys in the repo. Use env vars on the VPS only
 * (see env.example and /opt/asafievbar/.env).
 */

console.error('❌ fix-railway-firebase.js was removed for security.');
console.error('Rotate any leaked Firebase keys, then configure FIREBASE_* in server .env.');
process.exit(1);
