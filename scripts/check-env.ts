import { existsSync } from 'node:fs';
import path from 'node:path';

import { config } from 'dotenv';

const loadEnvFiles = () => {
  const candidates = [
    '.env',
    '.env.development',
    '.env.local',
    '.env.development.local',
  ];

  for (const filename of candidates) {
    const filepath = path.join(process.cwd(), filename);
    if (!existsSync(filepath)) {
      continue;
    }

    config({ path: filepath, override: true });
  }
};

type EnvCheck = {
  key: string;
  description: string;
  isSecret?: boolean;
  validate?: (value: string) => string | null;
};

const envChecks: EnvCheck[] = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL',
    validate: (value) =>
      value.includes('your-project') || !value.startsWith('https://')
        ? 'Replace with the URL from your Supabase project (https://xyz.supabase.co)'
        : null,
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anon public key',
    validate: (value) =>
      value.includes('your-anon-public-key') || value.length < 32
        ? 'Paste the anon public key from the Supabase dashboard'
        : null,
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (server only)',
    isSecret: true,
    validate: (value) =>
      value.includes('your-service-role-key') || value.length < 32
        ? 'Use the service role key from the Supabase dashboard (Settings → API)'
        : null,
  },
];

const run = () => {
  loadEnvFiles();

  const missing: string[] = [];
  const invalid: { key: string; reason: string }[] = [];

  for (const check of envChecks) {
    const raw = process.env[check.key];

    if (!raw || raw.trim().length === 0) {
      missing.push(`${check.key} (${check.description})`);
      continue;
    }

    if (check.validate) {
      const reason = check.validate(raw.trim());
      if (reason) {
        invalid.push({ key: check.key, reason });
      }
    }
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('\nEnvironment check failed.');

    if (missing.length > 0) {
      console.error('\nMissing variables:');
      for (const item of missing) {
        console.error(`  • ${item}`);
      }
    }

    if (invalid.length > 0) {
      console.error('\nVariables that still need attention:');
      for (const item of invalid) {
        console.error(`  • ${item.key}: ${item.reason}`);
      }
    }

    console.error('\nUpdate your .env.local and try again.');
    process.exitCode = 1;
    return;
  }

  console.log('✅ Supabase environment looks good.');
};

run();
