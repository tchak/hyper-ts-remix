import type { Either } from 'fp-ts/Either';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import type {
  Connection,
  HeadersOpen,
  ResponseEnded,
  StatusOpen,
} from 'hyper-ts';
import { Status } from 'hyper-ts';
import type { Middleware } from 'hyper-ts/lib/Middleware';
import * as M from 'hyper-ts/lib/Middleware';

import type { RemixConnection } from '.';
import { JSONError, MethodNotAllowed } from './errors';
export * from 'hyper-ts/lib/Middleware';

function toRemixConnection<I>(c: Connection<I>): RemixConnection<I> {
  return c as unknown as RemixConnection<I>;
}

function fromConnection<I = StatusOpen, E = never, A = never>(
  f: (c: RemixConnection<I>) => Either<E, A>
): Middleware<I, I, E, A> {
  return M.fromConnection((c) => f(toRemixConnection(c)));
}

function modifyConnection<I, O, E>(
  f: (c: RemixConnection<I>) => RemixConnection<O>
): Middleware<I, O, E, void> {
  return (c) => TE.right([undefined, f(toRemixConnection(c))]);
}

export function session<E = never>(
  name: string,
  value: string,
  options: { flash: boolean } = { flash: false }
): Middleware<HeadersOpen, HeadersOpen, E, void> {
  return modifyConnection((c) => c.setSession(name, value, options));
}

export function clearSession<E = never>(
  name: string
): M.Middleware<HeadersOpen, HeadersOpen, E, void> {
  return modifyConnection((c) => c.clearSession(name));
}

export function decodeSession<E, A>(
  name: string,
  f: (input: unknown) => Either<E, A>
): M.Middleware<StatusOpen, StatusOpen, E, A> {
  return fromConnection((c) => f(c.getSession(name)));
}

export const sendRedirect = <E = never>(
  uri: string
): M.Middleware<StatusOpen, ResponseEnded, E, void> =>
  pipe(
    M.redirect<E>(uri),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end())
  );

export const sendJson = (
  body: unknown
): M.Middleware<StatusOpen, ResponseEnded, JSONError, void> =>
  pipe(
    M.status(Status.OK),
    M.ichain(() => M.json(body, () => JSONError))
  );

export const GET = M.decodeMethod((s) =>
  s.toUpperCase() == 'get' ? E.right('GET' as const) : E.left(MethodNotAllowed)
);

export const POST = M.decodeMethod((s) =>
  s.toLowerCase() == 'post'
    ? E.right('POST' as const)
    : E.left(MethodNotAllowed)
);

export const PATCH = M.decodeMethod((s) =>
  s.toLowerCase() == 'patch'
    ? E.right('PATCH' as const)
    : E.left(MethodNotAllowed)
);

export const PUT = M.decodeMethod((s) =>
  s.toLowerCase() == 'put' ? E.right('PUT' as const) : E.left(MethodNotAllowed)
);

export const DELETE = M.decodeMethod((s) =>
  s.toLowerCase() == 'delete'
    ? E.right('DELETE' as const)
    : E.left(MethodNotAllowed)
);
