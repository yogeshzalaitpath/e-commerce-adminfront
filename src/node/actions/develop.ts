import path from "node:path";
import openBrowser from "react-dev-utils/openBrowser";
import webpack from "webpack";
import WebpackDevDerver, {
  Configuration as DevServerConfiguration,
} from "webpack-dev-server";

import { DevelopArgs } from "../types";
import { logger, watchLocalAdminFolder } from "../utils";
import { createCacheDir } from "../utils/create-cache-dir";
import { getCustomWebpackConfig } from "../webpack";

/**
 * Starts a development server for the admin UI.
 */
export async function develop({
  appDir,
  buildDir,
  plugins,
  options = {
    path: "/",
    backend: process.env.MEDUSA_BACKEND_URL,
    develop: {
      open: true,
      port: process.env.PORT,
      logLevel: "error",
      stats: "normal",
    },
  },
}: DevelopArgs) {
  const { cacheDir } = await createCacheDir({
    appDir,
    plugins,
  });

  const entry = path.resolve(cacheDir, "admin", "src", "main.tsx");
  const dest = path.resolve(appDir, buildDir);
  const env = "development";

  const config = await getCustomWebpackConfig(appDir, {
    entry,
    dest,
    cacheDir,
    env,
    options,
  });

  const compiler = webpack({
    ...config,
    infrastructureLogging: { level: options.develop.logLevel },
    stats: options.develop.stats === "normal" ? "errors-only" : undefined,
  });

  const devServerArgs: DevServerConfiguration = {
    port: options.develop.port,
    client: {
      logging: "none",
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    open: false,
    onListening: options.develop.open
      ? function (devServer) {
          if (!devServer) {
            logger.warn("Failed to open browser.");
          }

          openBrowser(
            `http://localhost:${options.develop.port}${
              options.path ? options.path : ""
            }`
          );
        }
      : undefined,
    devMiddleware: {
      publicPath: options.path,
      stats: options.develop.stats === "normal" ? false : undefined,
    },
    historyApiFallback: {
      index: options.path,
      disableDotRule: true,
    },
    hot: true,
  };

  const server = new WebpackDevDerver(devServerArgs, compiler);

  const runServer = async () => {
    logger.info(
      `Started development server on http://localhost:${options.develop.port}${
        options.path ? options.path : ""
      }`
    );

    await server.start();
  };

  await runServer();

  await watchLocalAdminFolder(appDir, cacheDir, plugins);
}
