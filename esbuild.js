import * as esbuild from 'esbuild';
import {z} from 'zod';

const envVariables = z.object({ORIGIN: z.string()});
const {ORIGIN} = envVariables.parse(process.env);

const ctx = await esbuild.context({
  entryPoints: [`src/dev-server.ts`],
  bundle: true,
  outfile: `dist/dev-server.cjs`,
  platform: `node`,
  logLevel: `info`,
  define: {'process.env.ORIGIN': JSON.stringify(ORIGIN)},
});

await ctx.watch();
