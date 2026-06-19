import axios, { AxiosInstance } from "axios";

export class HubSpotClient {
  private client: AxiosInstance;

  constructor(private token: string) {
    this.client = axios.create({
      baseURL: "https://api.hubapi.com",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async getProperties(objectType: string) {
    const res = await this.client.get(`/crm/v3/properties/${objectType}`);
    return res.data.results;
  }

  async getPipelines(objectType: string) {
    const res = await this.client.get(`/crm/v3/pipelines/${objectType}`);
    return res.data.results;
  }

  async getSchemas() {
    const res = await this.client.get(`/crm/v3/schemas`);
    return res.data.results;
  }

  async createProperty(objectType: string, property: any) {
    const url = `https://api.hubapi.com/crm/v3/properties/${objectType}`;

    const response = await axios.post(url, property, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  }
}
