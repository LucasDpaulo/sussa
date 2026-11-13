const { DatabaseSync } = require('node:sqlite');

function openStore(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const read = db.prepare('SELECT value FROM settings WHERE key = ?');
  const write = db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  return {
    getItem: key => read.get(key)?.value ?? null,
    setItem(key, value) {
      if (key !== 'meu-espaco-v1' || typeof value !== 'string' || value.length > 20_000_000) throw new Error('Dados inválidos');
      const state = JSON.parse(value);
      if (state.version !== 1 || !Array.isArray(state.tasks) || !Array.isArray(state.sessions)) throw new Error('Estado inválido');
      write.run(key, value);
    },
    close: () => db.close()
  };
}
module.exports = { openStore };
