import sourcemaps from 'rollup-plugin-sourcemaps';

export default [
  {
    input: 'dist/index.js',
    external: [
      'remix',
      'fp-ts/function',
      'fp-ts/Either',
      'fp-ts/TaskEither',
      'fp-ts-contrib/List',
      'fp-ts/Task',
      'hyper-ts/lib/Middleware',
      'hyper-ts',
    ],
    plugins: [sourcemaps()],
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
  },
  {
    input: 'dist/Middleware.js',
    external: [
      'fp-ts/function',
      'fp-ts/Either',
      'fp-ts/TaskEither',
      'hyper-ts/lib/Middleware',
      'hyper-ts',
    ],
    plugins: [sourcemaps()],
    output: {
      file: 'dist/Middleware.cjs',
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
  },
  {
    input: 'dist/ReaderMiddleware.js',
    external: [
      'fp-ts/function',
      'fp-ts/Either',
      'fp-ts/TaskEither',
      'hyper-ts/lib/Middleware',
      'hyper-ts/lib/ReaderMiddleware',
      'hyper-ts',
    ],
    plugins: [sourcemaps()],
    output: {
      file: 'dist/ReaderMiddleware.cjs',
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
  },
];
