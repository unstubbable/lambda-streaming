import crypto from 'crypto';
import http from 'http';
import {TextEncoder} from 'util';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';

const responseTimeout = 30000;
const origin = process.env.ORIGIN;
const port = process.env.PORT || 3000;
const lambdaClient = new LambdaClient({region: process.env.AWS_REGION});

/** @type {Map<string, http.ServerResponse>} */
const responses = new Map();

/** @type {Map<string, NodeJS.Timeout>} */
const responseTimeoutIds = new Map();

const server = http.createServer((req, res) => {
  if (req.method === `GET`) {
    handleIncomingRequest(req, res);
  } else if (req.method === `POST`) {
    handleCallbackRequest(req, res);
  } else {
    res.writeHead(405);
    res.end();
  }
});

server.listen(port, () =>
  console.log(`Started server at port ${port} (${process.env.ORIGIN})`),
);

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleIncomingRequest(req, res) {
  const requestId = crypto.randomBytes(16).toString(`hex`);

  responses.set(requestId, res);

  responseTimeoutIds.set(
    requestId,
    setTimeout(() => {
      responses.delete(requestId);
      responseTimeoutIds.delete(requestId);
      res.writeHead(500).end();
    }, responseTimeout),
  );

  await lambdaClient.send(
    new InvokeCommand({
      FunctionName: process.env.LAMBDA_FUNCTION_NAME,
      InvocationType: InvocationType.Event,
      Payload: new TextEncoder().encode(
        JSON.stringify({origin, url: req.url, requestId}),
      ),
    }),
  );
}

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleCallbackRequest(req, res) {
  const requestId = req.headers[`x-request-id`];

  if (typeof requestId === `string`) {
    const originalResponse = responses.get(requestId);

    responses.delete(requestId);
    clearTimeout(responseTimeoutIds.get(requestId));
    responseTimeoutIds.delete(requestId);

    if (originalResponse) {
      const statusCodeHeader = req.headers[`x-status-code`];

      const statusCode =
        (Array.isArray(statusCodeHeader)
          ? statusCodeHeader[0]
          : statusCodeHeader) ?? `200`;

      originalResponse.writeHead(
        parseInt(statusCode, 10),
        filterPassthroughHeaders(req.headers),
      );

      req.pipe(originalResponse);
      req.on(`end`, () => res.writeHead(200).end());
    } else {
      res.writeHead(500).end();
    }
  } else {
    res.writeHead(400).end();
  }
}

const passthroughHeaderNames = [
  `content-type`,
  `content-length`,
  `transfer-encoding`,
];

/**
 * @param {http.IncomingHttpHeaders} requestHeaders
 * @return {http.OutgoingHttpHeaders}
 */
function filterPassthroughHeaders(requestHeaders) {
  /** @type {http.OutgoingHttpHeaders} */
  const headers = {};

  for (const headerName of passthroughHeaderNames) {
    const headerValue = requestHeaders[headerName];

    if (headerValue) {
      headers[headerName] = headerValue;
    }
  }

  return headers;
}
