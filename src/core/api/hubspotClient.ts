import axios from "axios";

export class HubSpotClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async getProperties(objectType: string) {
    const url = `https://api.hubapi.com/crm/v3/properties/${objectType}`;
    const response = await axios.get(url, { headers: this.headers });
    return response.data.results || [];
  }

  async getPipelines(objectType: string) {
    const url = `https://api.hubapi.com/crm/v3/pipelines/${objectType}`;

    try {
      const response = await axios.get(url, {
        headers: this.headers,
      });
      return response.data.results || [];
    } catch {
      return [];
    }
  }

  async getSchemas() {
    const url = `https://api.hubapi.com/crm/v3/schemas`;
    const response = await axios.get(url, {
      headers: this.headers,
    });
    return response.data.results || [];
  }

  async createProperty(objectType: string, property: any) {
    const url = `https://api.hubapi.com/crm/v3/properties/${objectType}`;
    const response = await axios.post(url, property, {
      headers: this.headers,
    });
    return response.data;
  }

  async updateProperty(objectType: string, propertyName: string, payload: any) {
    const url = `https://api.hubapi.com/crm/v3/properties/${objectType}/${propertyName}`;

    const response = await axios.patch(url, payload, {
      headers: this.headers,
    });

    return response.data;
  }
}
