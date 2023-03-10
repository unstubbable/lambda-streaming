import {
  editorconfig,
  eslint,
  git,
  ignore,
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
  ...node({nodeVersion: `18`}),
  ...typescript({target: `es2022`, emit: false, lib: [`dom`]}),
  ...npm(),
  ...prettier(),
  ...vscode({includeFilesInExplorer: false}),
  ...ignore(`cdk.out`, `cdk.context.json`, `dist`),

  mergeContent(npm.packageFile, {
    scripts: {
      predeploy: `cdk bootstrap --app "node create-stack.js"`,
      deploy: `cdk deploy --app "node create-stack.js" --all --no-asset-metadata`,
      start: `nodemon dist/dev-server.cjs`,
      watch: `node esbuild.js`,
    },
  }),
);
