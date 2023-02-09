import {z} from 'zod';

const Event = z.object({origin: z.string(), requestId: z.string()});

const htmlLines = [
  `<!doctype html>`,
  `<html>`,
  `<body>`,
  `<h1>Streaming Test</h1>`,
  `<div>1</div>`,
  `<div>2</div>`,
  `<div>3</div>`,
  `<style>div{color: red}</style>`,
  `<div>4</div>`,
  `<div>5</div>`,
  `<script>document.title = 'A script set the title!'</script>`,
  `</body>`,
  `</html>`,
];

export const handler = async (event: unknown) => {
  const {origin, requestId} = Event.parse(event);

  const stream = new ReadableStream({
    async start(controller) {
      for (const line of htmlLines) {
        await wait(300);
        controller.enqueue(line);
      }

      controller.close();
    },
  }).pipeThrough(new TextEncoderStream());

  await fetch(origin, {
    method: `POST`,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'x-request-id': requestId,
    },
    body: stream,
  });
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
