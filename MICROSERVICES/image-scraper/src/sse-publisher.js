export class SseHubPublisher {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl ?? "").trim().replace(/\/$/, "");
  }

  enabled() {
    return Boolean(this.baseUrl);
  }

  async publish(eventData) {
    if (!this.enabled()) return;
    const res = await fetch(`${this.baseUrl}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`SSE Hub publish falhou: ${res.status} ${msg}`);
    }
  }
}

