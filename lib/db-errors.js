/** @param {unknown} error */
export function isDbConnectionError(error) {
  const code = String(error?.code || "");
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "ECONNRESET"
  );
}
