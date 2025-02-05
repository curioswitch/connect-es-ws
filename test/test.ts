import { create } from "@bufbuild/protobuf";
import { createClient } from "@connectrpc/connect";
import { createTransport } from "@connectrpc/connect/protocol-connect";
import { createWebSocketClient } from "../src/index";
import { CumSumRequestSchema, PingService } from "./ping_pb";

async function main() {
  const client = createClient(
    PingService,
    createTransport({
      httpClient: createWebSocketClient(),
      baseUrl: "http://localhost:8080/",
      useBinaryFormat: true,
      interceptors: [],
      sendCompression: null,
      acceptCompression: [],
      compressMinBytes: 0,
      readMaxBytes: 0xffffffff,
      writeMaxBytes: 0xffffffff,
    }),
  );

  const req = async function* () {
    for (let i = 0; i < 100; i++) {
      const msg = create(CumSumRequestSchema, {
        number: BigInt(i),
      });
      yield msg;
    }
  };

  const res = client.cumSum(req());
  for await (const msg of res) {
    console.log(msg);
  }
}

main().catch(console.error);
