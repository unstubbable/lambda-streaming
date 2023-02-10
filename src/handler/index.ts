import {z} from 'zod';

const Event = z.object({
  origin: z.string(),
  url: z.string(),
  requestId: z.string(),
});

const firstBigChunk = `
  <!doctype html>
  <html>
  <body style="font-family: sans-serif;">
  <span style="font-size: 10px;">This is a first big chunk to prevent Safari from buffering the whole response before starting to render. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi.</span>
`;

const htmlLines = [
  `<h1>Streaming Test</h1>`,
  `<div>1 </div>`,
  `<div>2 </div>`,
  `<style>div{color: red}</style>`,
  `<div>3 </div>`,
  `<script>document.title = 'A script set the title!'</script>`,
  `<div>4 </div>`,
  `<div>5 </div>`,
  `</body>`,
  `</html>`,
];

export const handler = async (event: unknown) => {
  const {origin, url, requestId} = Event.parse(event);

  if (url.includes(`.`)) {
    return void fetch(origin, {
      method: `POST`,
      headers: {'x-request-id': requestId, 'x-status-code': '404'},
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(firstBigChunk);

      for (const line of htmlLines) {
        await wait(300);
        controller.enqueue(line);
      }

      controller.close();
    },
  }).pipeThrough(new TextEncoderStream());

  return void fetch(origin, {
    method: `POST`,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-request-id': requestId,
      'x-status-code': '200',
    },
    body: stream,
  });
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
