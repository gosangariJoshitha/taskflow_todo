import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// tests override this with TASKFLOW_DB_PATH so they don't touch the real db
const DB_PATH = process.env.TASKFLOW_DB_PATH || path.join(__dirname, '..', 'taskflow.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;
