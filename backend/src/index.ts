import app from "./app";
import { connectRedis } from "./lib/redis";

const port = parseInt(process.env.PORT || "5000", 10);

connectRedis();

console.log(`Starting server on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
