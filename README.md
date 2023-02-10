# Testing response streaming with AWS Lambda

The AWS Lambda Node.js runtime has an
[undocumented feature](https://gist.github.com/magJ/63bac8198469b6a25d5697ad490d31e6)
where the handler, instead of resolving with a fully built response, can stream
its response into a duplex stream, chunk by chunk. This can be accomplished by
passing the handler function into `globalThis.awslambda.streamifyResponse`,
which is provided by the runtime. The handler then receives the three arguments
`event`, `responseStream`, and `ctx`. The runtime expects a streamified handler
to return `void`.

Unfortunately, there does not seem to exist a publicly available integration in
the whole suit of AWS services to utilize this, e.g. for streaming of an HTML
document or React Server Components to the client. In fact, even with using the
[Invoke API](https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html)
directly, the web server that is used for that API does not expose the response
stream.

So, as far as I know there is no real "serverless" way of using AWS Lambda for
streaming server-side rendering (SSSR).

Vercel accomplished this nevertheless, as
[tweeted by its CTO Malte Ubl](https://twitter.com/cramforce/status/1584966279030792192):

> It’s no big secret that our serverless functions are running on AWS Lambda,
> and, uhm, AWS Lambda does not support streaming. I’m not going to reveal how
> we made it work, but maybe you can guess.

This repo contains a very basic proof-of-concept that's implementing my
[guess](https://twitter.com/unstubbable/status/1620771363580694534) of how this
could be done. It's basically a Node.js proxy server that:

- accepts the incoming GET requests from the client,
- invokes the SSSR lambda asynchronously to do the heavy lifting, passing a
  generated request ID along with the payload,
- stores the response object in a map using the request ID as key
- accepts callback POST requests by the SSSR lambda to pipe the stream body
  directly into the original response back to the client, using the request ID
  to look it up.

To sketch out that this PoC might also work at scale the Node.js proxy server is
deployed into EC2 instances together with an Auto Scaling Group, an Application
Load Balancer, and a CloudFront CDN in front of it, using the
[aws-cdk](https://aws.amazon.com/cdk/) to describe the infrastucture in code.

_Disclaimers:_

- _I don't think that this solution is anywhere near Vercel's actual solution,
  especially because they also made it work for their Edge Runtime._
- _For a real-world web application there are of course many essential parts
  omitted from this PoC to keep the focus on the actual problem to solve._
