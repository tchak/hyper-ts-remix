import { pipe } from 'fp-ts/function';
import type { Reader } from 'fp-ts/Reader';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as L from 'fp-ts-contrib/List';
import type {
  Connection,
  CookieOptions,
  HeadersOpen,
  ResponseEnded,
  StatusOpen,
} from 'hyper-ts';
import { MediaType, Status } from 'hyper-ts';
import type { LoaderFunction, Session, SessionStorage } from 'remix';
import { createSession } from 'remix';

import * as M from './Middleware';
export * from 'hyper-ts';
export { M as Middleware };
export * from './errors';

type Params = Parameters<LoaderFunction>[0]['params'];
export type SessionOptions = { flash: boolean };

export type Action =
  | { type: 'setBody'; body: unknown }
  | { type: 'endResponse' }
  | { type: 'setStatus'; status: Status }
  | { type: 'setHeader'; name: string; value: string }
  | { type: 'clearCookie'; name: string; options: CookieOptions }
  | { type: 'setCookie'; name: string; value: string; options: CookieOptions }
  | { type: 'setSession'; name: string; value: string; options: SessionOptions }
  | { type: 'clearSession'; name: string }
  | { type: 'pipeStream'; stream: unknown };

const endResponse: Action = { type: 'endResponse' };

export class RemixConnection<S> implements Connection<S> {
  readonly _S!: S;
  constructor(
    readonly req: Request,
    readonly params: Params,
    readonly body: unknown,
    readonly session: Session = createSession(),
    readonly actions: L.List<Action> = L.nil,
    readonly ended: boolean = false
  ) {}

  chain<T>(action: Action, ended = false): RemixConnection<T> {
    return new RemixConnection<T>(
      this.req,
      this.params,
      this.body,
      this.session,
      L.cons(action, this.actions),
      ended
    );
  }

  getRequest(): any {
    return this.req;
  }

  getBody(): unknown {
    return this.body;
  }

  getHeader(name: string): unknown {
    return this.req.headers.get(name);
  }

  getParams(): unknown {
    return this.params;
  }

  getQuery(): unknown {
    const url = new URL(this.req.url);
    return Object.fromEntries(url.searchParams);
  }

  getOriginalUrl(): string {
    return this.req.url;
  }

  getMethod(): string {
    return this.req.method;
  }

  getSession(name: string): unknown {
    return this.session.get(name);
  }

  setSession(
    name: string,
    value: string,
    options: { flash: boolean }
  ): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setSession', name, value, options });
  }

  clearSession(name: string): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'clearSession', name });
  }

  setCookie(
    name: string,
    value: string,
    options: CookieOptions
  ): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setCookie', name, value, options });
  }

  clearCookie(
    name: string,
    options: CookieOptions
  ): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'clearCookie', name, options });
  }

  setHeader(name: string, value: string): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setHeader', name, value });
  }

  setStatus(status: Status): RemixConnection<HeadersOpen> {
    return this.chain({ type: 'setStatus', status });
  }

  setBody(body: unknown): RemixConnection<ResponseEnded> {
    return this.chain({ type: 'setBody', body }, true);
  }

  pipeStream(stream: unknown): RemixConnection<ResponseEnded> {
    return this.chain({ type: 'pipeStream', stream }, true);
  }

  endResponse(): RemixConnection<ResponseEnded> {
    return this.chain(endResponse, true);
  }
}

type ResponseT = [number, Headers, Session, BodyInit | undefined];

function run(
  [status, headers, session, body]: ResponseT,
  action: Action
): ResponseT {
  switch (action.type) {
    case 'setCookie':
      //return res.cookie(action.name, action.value, action.options);
      return [status, headers, session, body];
    case 'clearCookie':
      //return res.clearCookie(action.name, action.options);
      return [status, headers, session, body];
    case 'setStatus':
      return [action.status, headers, session, body];
    case 'setHeader':
      headers.set(action.name, action.value);
      return [status, headers, session, body];
    case 'setBody':
      return [status, headers, session, action.body as BodyInit];
    case 'setSession':
      if (action.options.flash) {
        session.flash(action.name, action.value);
      } else {
        session.set(action.name, action.value);
      }
      return [status, headers, session, body];
    case 'clearSession':
      session.unset(action.name);
      return [status, headers, session, body];
    case 'pipeStream':
    case 'endResponse':
      return [status, headers, session, body];
  }
}

function error<E>(e: E): Response {
  return new Response(JSON.stringify(e), {
    status: Status.InternalServerError,
  });
}

function execConnection<O, E>(c: Connection<O>): TE.TaskEither<E, Response> {
  const { actions, session } = c as RemixConnection<O>;
  const response = [Status.OK, new Headers(), session, undefined] as ResponseT;
  const [status, headers, , body] = pipe(
    actions,
    L.reduce(response, (res, action) => run(res, action))
  );
  return TE.of<E, Response>(new Response(body || '', { status, headers }));
}

function exec<I, O, E>(
  middleware: M.Middleware<I, O, E, void>,
  req: Request,
  params: Params,
  body: unknown
): Promise<Response> {
  return pipe(
    M.execMiddleware(middleware, new RemixConnection<I>(req, params, body)),
    TE.chain(execConnection),
    TE.getOrElse((e) => T.of(error(e)))
  )();
}

function execWithSession<I, O, E>(
  middleware: M.Middleware<I, O, E, void>,
  req: Request,
  params: Params,
  body: unknown,
  session: RemixSession
): Promise<Response> {
  return pipe(
    M.execMiddleware(
      middleware,
      new RemixConnection<I>(req, params, body, session.get())
    ),
    TE.chain((c) =>
      pipe(
        execConnection(c),
        TE.chainTaskK((response) =>
          pipe(
            () => session.commit(),
            T.map((cookie) => {
              response.headers.append('set-cookie', cookie);
              return response;
            })
          )
        )
      )
    ),
    TE.getOrElse((e) => T.of(error(e)))
  )();
}

type RemixHandlerParams = Parameters<LoaderFunction>[0];

export function toHandler<E>(
  middleware: M.Middleware<StatusOpen, ResponseEnded, E, void>
): Reader<RemixHandlerParams, Promise<Response>> {
  return async ({ request, params }: Parameters<LoaderFunction>[0]) =>
    exec(middleware, request, params, await getBody(request));
}

export function toHandlerWithSession<E>(
  sessionStorage: SessionStorage
): (
  middleware: M.Middleware<StatusOpen, ResponseEnded, E, void>
) => Reader<RemixHandlerParams, Promise<Response>> {
  return (middleware: M.Middleware<StatusOpen, ResponseEnded, E, void>) =>
    async ({ request, params }: Parameters<LoaderFunction>[0]) =>
      execWithSession(
        middleware,
        request,
        params,
        await getBody(request),
        await getSession(request, sessionStorage)
      );
}

type RemixSession = { get: () => Session; commit: () => Promise<string> };

async function getSession(
  request: Request,
  sessionStorage: SessionStorage
): Promise<RemixSession> {
  const session = await sessionStorage.getSession(
    request.headers.get('cookie')
  );
  return {
    get: () => session,
    commit: () => sessionStorage.commitSession(session),
  };
}

async function getBody(request: Request): Promise<unknown> {
  if (request.method != 'GET' && request.method != 'HEAD') {
    const contentType = request.headers.get('content-type');
    if (contentType?.startsWith(MediaType.applicationJSON)) {
      return request.json();
    } else if (contentType?.startsWith(MediaType.applicationFormURLEncoded)) {
      return parseFormURLEncoded(await request.text());
    }
    return request.text();
  }
  return null;
}

function parseFormURLEncoded(body: string): unknown {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params);
}
