import { modul } from '../module.js';
import fs from 'fs';
import { color } from './color.js';

export async function uncache(modulePath = '.') {
    return new Promise((resolve, reject) => {
        try {
            delete import.meta.cache?.[modulePath]; // not always needed but safe idea
            resolve();
        } catch (e) {
            reject(e);
        }
    });
}

export async function nocache(modulePath, cb = () => {}) {
    console.log(
        color('Module', 'blue'),
        color(`'${modulePath} is up to date!'`, 'cyan')
    );

    fs.watchFile(modulePath, async () => {
        await uncache(modulePath);
        cb(modulePath);
    });
}