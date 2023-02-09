import {handler} from './handler/index.js';
import {mockClient} from 'aws-sdk-client-mock';
import {
  InvokeCommand,
  InvokeCommandInput,
  LambdaClient,
} from '@aws-sdk/client-lambda';

const lambdaClientMock = mockClient(LambdaClient);

lambdaClientMock.on(InvokeCommand).callsFake((input: InvokeCommandInput) => {
  handler(JSON.parse(new TextDecoder().decode(input.Payload)));
});

import('./proxy/index.js');
