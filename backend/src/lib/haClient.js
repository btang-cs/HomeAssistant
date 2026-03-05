import axios from 'axios';
import https from 'https';

export class HomeAssistantClient {
  constructor({ baseUrl, token, verifySSL = true }) {
    this.baseUrl = baseUrl;
    this.token = token;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent: verifySSL ? undefined : new https.Agent({ rejectUnauthorized: false })
    });
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.token);
  }

  assertConfigured() {
    if (!this.isConfigured()) {
      const error = new Error('Home Assistant is not configured.');
      error.code = 'HA_NOT_CONFIGURED';
      throw error;
    }
  }

  async getStates() {
    this.assertConfigured();
    const response = await this.client.get('/api/states');
    return response.data;
  }

  async getState(entityId) {
    this.assertConfigured();
    const response = await this.client.get(`/api/states/${encodeURIComponent(entityId)}`);
    return response.data;
  }

  async callService(domain, service, payload) {
    this.assertConfigured();
    const response = await this.client.post(`/api/services/${domain}/${service}`, payload);
    return response.data;
  }
}
