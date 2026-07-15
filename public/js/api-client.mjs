export function formatApiError(payload, status) {
  return payload?.error || `请求失败 (${status})`;
}

export function createApiClient({ getToken, fetchImpl = fetch } = {}) {
  function authorizedHeaders(input) {
    const headers = new Headers(input || {});
    const token = getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  async function request(path, options = {}) {
    const headers = authorizedHeaders(options.headers);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetchImpl(path, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) throw new Error(formatApiError(payload, response.status));
    return payload;
  }

  async function download(path, options = {}) {
    const response = await fetchImpl(path, {
      ...options,
      headers: authorizedHeaders(options.headers)
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(formatApiError(payload, response.status));
    }
    const disposition = response.headers.get('content-disposition') || '';
    return {
      blob: await response.blob(),
      filename: /filename="?([^";]+)"?/i.exec(disposition)?.[1] || 'download'
    };
  }

  return { request, download };
}
