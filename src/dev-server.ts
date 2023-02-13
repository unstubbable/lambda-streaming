import type {InvokeCommandInput} from '@aws-sdk/client-lambda';
import {InvokeCommand, LambdaClient} from '@aws-sdk/client-lambda';
import {mockClient} from 'aws-sdk-client-mock';
import {handler} from './handler/index.js';

const lambdaClientMock = mockClient(LambdaClient);

lambdaClientMock.on(InvokeCommand).callsFake((input: InvokeCommandInput) => {
  handler(JSON.parse(new TextDecoder().decode(input.Payload))).catch(
    console.error,
  );
});

import(`./proxy/index.js`);
