export class AuthenticationError extends Error {}

export async function authenticatedFetch(
  accessToken: string,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    throw new AuthenticationError("Your session has expired");
  }
  return response;
}
