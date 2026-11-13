/**
 * Android 动态照片（Motion Photo）解析。
 * 支持 Google / Xiaomi / OPPO 的 XMP 标注方式，从 JPEG 尾部切出内嵌 MP4。
 */
export function extractMotionPhotoVideo(data: Buffer): Buffer | null {
  if (data.length < 1024) return null;

  const head = data.subarray(0, Math.min(data.length, 262144)).toString("latin1");
  if (!head.includes("MotionPhoto") && !head.includes("MicroVideo")) return null;

  let length: number | null = null;

  for (const match of head.matchAll(/<Container:Item[^>]*>/g)) {
    const tag = match[0];
    if (!/Item:Semantic=["']MotionPhoto["']/.test(tag)) continue;
    const size = tag.match(/Item:Length=["'](\d+)["']/);
    if (size) {
      length = Number(size[1]);
      break;
    }
  }

  if (!length) {
    const micro = head.match(/GCamera:MicroVideoOffset=["'](\d+)["']/);
    if (micro) length = Number(micro[1]);
  }

  if (!length) {
    const oppo = head.match(/OpCamera:VideoLength=["'](\d+)["']/);
    if (oppo) length = Number(oppo[1]);
  }

  if (!length || length <= 0 || length > data.length) return null;

  let start = data.length - length;
  const ftyp = data.indexOf(Buffer.from("ftyp"), Math.max(0, start - 32));
  if (ftyp >= 4) start = ftyp - 4;

  if (data.subarray(start + 4, start + 8).toString("latin1") !== "ftyp") return null;

  return data.subarray(start);
}
