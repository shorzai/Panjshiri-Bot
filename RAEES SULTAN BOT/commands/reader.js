import fs from "fs";

export function readData(type, id) {
  try {
    const path = `./data/${type}/${id}.js`;
    const data = fs.readFileSync(path, "utf-8");

    return data.trim();
  } catch {
    return "⚠️ فایل پیدا نشد";
  }
}