import type { Either } from 'fp-ts/Either';
import type { HeadersOpen, ResponseEnded, StatusOpen } from 'hyper-ts';
import type { ReaderMiddleware } from 'hyper-ts/lib/ReaderMiddleware';
import * as RM from 'hyper-ts/lib/ReaderMiddleware';

import type { JSONError, MethodNotAllowed } from './errors';
import * as M from './Middleware';
export * from 'hyper-ts/lib/ReaderMiddleware';

export function session<R, E = never>(
  name: string,
  value: string,
  options: { flash: boolean } = { flash: false }
): ReaderMiddleware<R, HeadersOpen, HeadersOpen, E, void> {
  return RM.fromMiddleware(M.session(name, value, options));
}

export function clearSession<R, E = never>(
  name: string
): ReaderMiddleware<R, HeadersOpen, HeadersOpen, E, void> {
  return RM.fromMiddleware(M.clearSession(name));
}

export function decodeSession<R, E, A>(
  name: string,
  f: (input: unknown) => Either<E, A>
): ReaderMiddleware<R, StatusOpen, StatusOpen, E, A> {
  return RM.fromMiddleware(M.decodeSession(name, f));
}

export function sendRedirect<R, E = never>(
  uri: string
): ReaderMiddleware<R, StatusOpen, ResponseEnded, E, void> {
  return RM.fromMiddleware(M.sendRedirect(uri));
}

export function sendJson<R>(
  body: unknown
): ReaderMiddleware<R, StatusOpen, ResponseEnded, JSONError, void> {
  return RM.fromMiddleware(M.sendJson(body));
}

export function GET<R>(): ReaderMiddleware<
  R,
  StatusOpen,
  StatusOpen,
  MethodNotAllowed,
  'GET'
> {
  return RM.fromMiddleware(M.GET);
}

export function POST<R>(): ReaderMiddleware<
  R,
  StatusOpen,
  StatusOpen,
  MethodNotAllowed,
  'POST'
> {
  return RM.fromMiddleware(M.POST);
}

export function PUT<R>(): ReaderMiddleware<
  R,
  StatusOpen,
  StatusOpen,
  MethodNotAllowed,
  'PUT'
> {
  return RM.fromMiddleware(M.PUT);
}

export function PATCH<R>(): ReaderMiddleware<
  R,
  StatusOpen,
  StatusOpen,
  MethodNotAllowed,
  'PATCH'
> {
  return RM.fromMiddleware(M.PATCH);
}

export function DELETE<R>(): ReaderMiddleware<
  R,
  StatusOpen,
  StatusOpen,
  MethodNotAllowed,
  'DELETE'
> {
  return RM.fromMiddleware(M.DELETE);
}
