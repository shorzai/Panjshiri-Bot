import { db } from "./db.js";

const getSafe = (path, fallback) => {
  try {
    return path?.() ?? fallback;
  } catch {
    return fallback;
  }
};

export default {
  get PREFIX() {
    return getSafe(() => db.data.settings.prefix, "!");
  },

  get OWNER() {
    return getSafe(() => db.data.settings.owner, "");
  },

  ANTI_LINK: true,
  ANTI_BAD: true,

  BAD_WORDS: ["کص مادر", "کونی", "fuck"],

  MODE: "public"
};