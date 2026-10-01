import { NextRequest } from 'next/server';

const apiOrigin = 'http://127.0.0.1:3000';

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  const target = `${apiOrigin}/api/v1/${context.params.path.join('/')}${request.nextUrl.search}`;
  const headers = new Headers(request.headers);
  headers.delete('host');

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    duplex: 'half',
  } as RequestInit);

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
