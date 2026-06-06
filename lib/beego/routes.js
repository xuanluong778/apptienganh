/** URL trang Luyện nói / Beego Speaking AI */
export const SPEAKING_PATH = "/luyen-noi";

export function isSpeakingPath(pathname = "") {
  return pathname === SPEAKING_PATH || pathname.startsWith(`${SPEAKING_PATH}/`);
}
