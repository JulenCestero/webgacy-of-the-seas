/**
 * Script de migración: Markdown -> Turso Database
 *
 * Migra el contenido existente de archivos markdown a la base de datos Turso.
 *
 * Uso: npx tsx scripts/migrate.ts
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as dotenv from 'dotenv';
import * as schema from '../src/lib/schema';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

const CONTENT_DIR = './src/content';

async function migrateMembers() {
  console.log('\n📦 Migrando miembros...');
  const dir = join(CONTENT_DIR, 'members');

  try {
    const files = await readdir(dir);
    let count = 0;

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const content = await readFile(join(dir, file), 'utf-8');
      const { data, content: body } = matter(content);

      await db.insert(schema.members).values({
        id: crypto.randomUUID(),
        name: data.name,
        role: data.role,
        image: data.image || null,
        order: data.order || 0,
        bio: body.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();

      count++;
      console.log(`  ✓ ${data.name}`);
    }

    console.log(`  Total: ${count} miembros migrados`);
  } catch (e) {
    console.log('  ⚠ No se encontró carpeta de miembros o está vacía');
  }
}

async function migrateConcerts() {
  console.log('\n🎸 Migrando conciertos...');
  const dir = join(CONTENT_DIR, 'concerts');

  try {
    const files = await readdir(dir);
    let count = 0;

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const content = await readFile(join(dir, file), 'utf-8');
      const { data, content: body } = matter(content);

      // Convert date to ISO string if it's a Date object
      let dateStr = data.date;
      if (dateStr instanceof Date) {
        dateStr = dateStr.toISOString().split('T')[0];
      }

      await db.insert(schema.concerts).values({
        id: crypto.randomUUID(),
        title: data.title,
        date: dateStr,
        venue: data.venue,
        city: data.city,
        ticketUrl: data.ticketUrl || null,
        isSoldOut: data.isSoldOut || false,
        description: body.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();

      count++;
      console.log(`  ✓ ${data.title}`);
    }

    console.log(`  Total: ${count} conciertos migrados`);
  } catch (e) {
    console.log('  ⚠ No se encontró carpeta de conciertos o está vacía');
  }
}

async function migrateMerch() {
  console.log('\n🛒 Migrando productos...');
  const dir = join(CONTENT_DIR, 'merch');

  try {
    const files = await readdir(dir);
    let count = 0;

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const content = await readFile(join(dir, file), 'utf-8');
      const { data } = matter(content);

      await db.insert(schema.merch).values({
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        image: data.image || null,
        price: data.price || null,
        buyUrl: data.buyUrl || null,
        order: data.order || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();

      count++;
      console.log(`  ✓ ${data.name}`);
    }

    console.log(`  Total: ${count} productos migrados`);
  } catch (e) {
    console.log('  ⚠ No se encontró carpeta de merch o está vacía');
  }
}

async function migratePosts() {
  console.log('\n📝 Migrando posts...');
  const dir = join(CONTENT_DIR, 'archivo');

  try {
    const files = await readdir(dir);
    let count = 0;

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const content = await readFile(join(dir, file), 'utf-8');
      const { data, content: body } = matter(content);

      // Generate slug from filename
      const slug = file.replace('.md', '');

      // Convert date to ISO string if it's a Date object
      let dateStr = data.date;
      if (dateStr instanceof Date) {
        dateStr = dateStr.toISOString().split('T')[0];
      }

      // Convert tags and gallery to JSON strings
      const tags = data.tags ? JSON.stringify(data.tags) : null;
      const gallery = data.gallery ? JSON.stringify(data.gallery) : null;

      await db.insert(schema.posts).values({
        id: crypto.randomUUID(),
        slug,
        title: data.title,
        date: dateStr,
        image: data.image || null,
        excerpt: data.excerpt || null,
        tags,
        gallery,
        body: body.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();

      count++;
      console.log(`  ✓ ${data.title}`);
    }

    console.log(`  Total: ${count} posts migrados`);
  } catch (e) {
    console.log('  ⚠ No se encontró carpeta de archivo o está vacía');
  }
}

async function migrateSettings() {
  console.log('\n⚙️ Migrando configuración...');

  try {
    // Load media settings
    const mediaPath = join(CONTENT_DIR, 'settings', 'media.json');
    const mediaContent = await readFile(mediaPath, 'utf-8');
    const media = JSON.parse(mediaContent);

    const settingsToMigrate = [
      { key: 'youtubeVideoUrl', value: media.youtubeVideoUrl || '' },
      { key: 'spotifyAlbumUri', value: media.spotifyAlbumUri || '' },
    ];

    // Load general settings if exists
    try {
      const generalPath = join(CONTENT_DIR, 'settings', 'general.json');
      const generalContent = await readFile(generalPath, 'utf-8');
      const general = JSON.parse(generalContent);

      if (general.bandName) settingsToMigrate.push({ key: 'bandName', value: general.bandName });
      if (general.tagline) settingsToMigrate.push({ key: 'tagline', value: general.tagline });
      if (general.bookingEmail) settingsToMigrate.push({ key: 'bookingEmail', value: general.bookingEmail });
      if (general.pressEmail) settingsToMigrate.push({ key: 'pressEmail', value: general.pressEmail });
    } catch {
      // General settings file doesn't exist, skip
    }

    for (const setting of settingsToMigrate) {
      await db.insert(schema.settings).values({
        key: setting.key,
        value: setting.value,
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();

      console.log(`  ✓ ${setting.key}`);
    }

    console.log(`  Total: ${settingsToMigrate.length} configuraciones migradas`);
  } catch (e) {
    console.log('  ⚠ No se encontraron archivos de configuración');
  }
}

async function main() {
  console.log('🚀 Iniciando migración de contenido a Turso...\n');
  console.log('━'.repeat(50));

  await migrateMembers();
  await migrateConcerts();
  await migrateMerch();
  await migratePosts();
  await migrateSettings();

  console.log('\n' + '━'.repeat(50));
  console.log('✅ Migración completada!\n');

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Error en la migración:', e);
  process.exit(1);
});
