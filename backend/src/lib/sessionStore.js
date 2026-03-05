export default class SessionStore {
  constructor(ttlSeconds) {
    this.ttlMs = ttlSeconds * 1000;
    this.sessions = new Map();
  }

  create(token, payload = {}) {
    this.sessions.set(token, {
      ...payload,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.ttlMs
    });
  }

  has(token) {
    const record = this.sessions.get(token);
    if (!record) {
      return false;
    }
    if (record.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  delete(token) {
    this.sessions.delete(token);
  }
}
