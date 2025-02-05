import type {
  UniversalClientFn,
  UniversalClientRequest,
  UniversalClientResponse,
} from "@connectrpc/connect/protocol";
import { connect } from "it-ws/client";

async function handleRequest(
  req: UniversalClientRequest,
): Promise<UniversalClientResponse> {
  const stream = connect(req.url);
  await stream.connected();

  const headers: string[] = [];
  for (const [key, value] of req.header) {
    headers.push(key);
    headers.push(value);
  }

  stream.socket.send(JSON.stringify(headers));

  setTimeout(async () => {
    if (req.body) {
      for await (const chunk of req.body) {
        stream.socket.send(chunk);
      }
    }
    stream.socket.send("close");
  }, 0);

  const resHdrsJson = await stream.source.next();
  const resHdrsStr: string[] = JSON.parse(
    new TextDecoder().decode(resHdrsJson.value),
  );
  const resHdrs = new Headers();
  let status = 0;
  for (let i = 0; i < resHdrsStr.length; i += 2) {
    const key = resHdrsStr[i];
    const value = resHdrsStr[i + 1];

    if (key === "x-wshttp-status") {
      status = Number(value);
      continue;
    }

    resHdrs.append(key, value);
  }

  if (status === 0) {
    throw new Error("Response missing status header");
  }

  const res: UniversalClientResponse = {
    status,
    header: resHdrs,
    body: stream.source,
    trailer: new Headers(), // Connect protocol does not use trailers.
  };
  return res;
}

export function createWebSocketClient(): UniversalClientFn {
  return handleRequest;
}
