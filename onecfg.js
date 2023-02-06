import {
  editorconfig,
  eslint,
  git,
  node,
  npm,
  prettier,
  typescript,
  vscode,
} from '@onecfg/standard';
import {mergeContent, writeFiles} from 'onecfg';

writeFiles(
  ...editorconfig(),
  ...eslint(),
  ...git(),
  ...node({nodeVersion: `16`}),
  ...typescript({target: `es2019`, emit: false, lib: [`dom`]}),
  ...npm(),
  ...prettier(),
  ...vscode({includeFilesInExplorer: false}),

  mergeContent(npm.packageFile, {
    scripts: {
      predeploy: `cdk bootstrap --app "node create-stack.js"`,
      deploy: `cdk deploy --app "node create-stack.js" --all --no-asset-metadata`,
      start: `node index.js`,
      test: `aws lambda invoke --function-name streaming-test --invocation-type Event --cli-binary-format raw-in-base64-out --payload '{"requestId":"test-id"}' /dev/null`,
    },
  }),

  mergeContent(git.ignoreFile, ['cdk.out', 'cdk.context.json']),
);
