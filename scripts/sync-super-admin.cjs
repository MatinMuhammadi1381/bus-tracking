const path = require('node:path');
const fs = require('node:fs');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const envFile = fs.readFileSync(path.resolve(__dirname, '../apps/api/.env'), 'utf8');
for (const line of envFile.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const username = process.env.SUPER_ADMIN_USERNAME?.trim();
const password = process.env.SUPER_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD must be configured');
}

const prisma = new PrismaClient();

async function syncSuperAdmin() {
  const passwordHash = await argon2.hash(password);
  const admin = await prisma.adminUser.upsert({
    where: { username },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      username,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: { username: true, role: true, isActive: true },
  });

  console.log(`Synchronized ${admin.username} (${admin.role}, active=${admin.isActive})`);
}

syncSuperAdmin()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
