import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Miembros de la banda
export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  image: text('image'),
  order: integer('order').default(0),
  bio: text('bio'), // Contenido markdown
  createdAt: text('created_at').default(''),
  updatedAt: text('updated_at').default(''),
});

// Conciertos
export const concerts = sqliteTable('concerts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(), // ISO date string
  venue: text('venue').notNull(),
  city: text('city').notNull(),
  ticketUrl: text('ticket_url'),
  isSoldOut: integer('is_sold_out', { mode: 'boolean' }).default(false),
  description: text('description'), // Contenido markdown
  createdAt: text('created_at').default(''),
  updatedAt: text('updated_at').default(''),
});

// Productos de merchandising
export const merch = sqliteTable('merch', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  image: text('image'),
  price: text('price'),
  buyUrl: text('buy_url'), // Si vacío = sin stock
  order: integer('order').default(0),
  createdAt: text('created_at').default(''),
  updatedAt: text('updated_at').default(''),
});

// Posts del blog/archivo
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  date: text('date').notNull(), // ISO date string
  image: text('image'),
  excerpt: text('excerpt'),
  tags: text('tags'), // JSON array como string: '["tag1", "tag2"]'
  gallery: text('gallery'), // JSON array como string: '["/img1.jpg", "/img2.jpg"]'
  body: text('body'), // Contenido markdown
  createdAt: text('created_at').default(''),
  updatedAt: text('updated_at').default(''),
});

// Configuración general (key-value)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON para valores complejos
  updatedAt: text('updated_at').default(''),
});

// Tipos inferidos de Drizzle
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

export type Concert = typeof concerts.$inferSelect;
export type NewConcert = typeof concerts.$inferInsert;

export type MerchItem = typeof merch.$inferSelect;
export type NewMerchItem = typeof merch.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
