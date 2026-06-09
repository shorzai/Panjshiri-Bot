import fs from "fs";
import path from "path";

export const modul = {
    fs,
    path,

    saveJSON(file, data) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    },

    readJSON(file) {
        try {
            if (!fs.existsSync(file)) return {};
            return JSON.parse(fs.readFileSync(file, "utf8"));
        } catch {
            return {};
        }
    },

    exists(file) {
        return fs.existsSync(file);
    }
};