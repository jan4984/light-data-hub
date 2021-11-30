import dotenv from 'dotenv';
dotenv.config({ path: '.mytest.env' });
import PrismaClient from '@prisma/client';
import { createHmac } from "crypto";
import express from "express";
import morgan from 'morgan';
import process from 'process';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import moment from 'moment-timezone';

export const db = new PrismaClient.PrismaClient({ log: ['query'] });
export async function connect() {
    try {
        console.log(new Date(), `connecting to db ${process.env.DB_PATH}`);
        await db.$connect();
        console.log(new Date(), 'connected to db');
    } catch (e) {
        console.log(new Date(), 'connect to db failed', e);
        throw e;
    }
}

const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomPlace() {
    return [1, 2, 3, 4, 5].map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const withCatch = fn => {
    return function (req, res, next) {
        fn(req, res, next).catch(e => {
            (res.closes || []).forEach(r=>r.close());
            console.log('ERROR', new Date());
            console.log(e.toString());
            console.log(e?.stack);
            next(e);
        });
    }
};

export const app = express();
app.use(morgan('dev'));
app.use(express.static('static', { index: 'main.html' }));
app.use(express.json({ limit: '32mb' }));

const port = parseInt(process.env.HTTP_PORT) || 3080;
app.get('/healthz', (r_, res) => {
    res.status(200).end();
});

app.post('/data/', withCatch(async (req, res) => {
    let tinyUrl, item;
    while (true) {
        try {
            tinyUrl = randomPlace();
            item = await db.file.create({
                data: {
                    fileName: req.query.fileName || 'file.bin',
                    ready: false,
                    mime: req.query.mime || mime.contentType(req.query.fileName || 'file.bin'),
                    tinyUrl: req.query.tinyUrl || tinyUrl, //for test unique constraint
                }
            });
            break;
        } catch (err) {
            if (err.code == 'P2002') {
                console.log(new Date(), `url hash ${tinyUrl} conflict, re-generate`);
                continue;
            }
            throw err;
        }
    }
    fs.mkdirSync(path.join(process.env.FILE_PATH, `${tinyUrl[0]}/${tinyUrl[1]}`), { recursive: true });
    let onFinsh, onError;
    let p = new Promise((r, e) => { onFinsh = r; onError = e; });
    const dest = fs.createWriteStream(path.join(process.env.FILE_PATH, `${tinyUrl[0]}/${tinyUrl[1]}/${item.tinyUrl}`));
    res.closes = [dest];
    req.pipe(dest);
    req.on('end', () => onFinsh());
    req.on('error', err => onError(err));

    await p;
    await db.file.update({
        where: { tinyUrl },
        data: { ready: true }
    });
    item.ready=true;
    res.json(item).end();
}));

app.get('/data/:tinyUrl', withCatch(async (req, res) => {
    const item = await db.file.findUnique({
        where: { tinyUrl: req.params.tinyUrl },
    });
    res.set('content-type', item.mime);
    res.set('content-disposition', `inline; filename="${item.fileName}"`);
    let onFinsh, onError;
    let p = new Promise((r, e) => { onFinsh = r; onError = e; });
    const src = fs.createReadStream(path.join(process.env.FILE_PATH, `${item.tinyUrl[0]}/${item.tinyUrl[1]}/${item.tinyUrl}`));
    res.closes = [src];
    src.pipe(res);
    src.on('end', () => onFinsh());
    src.on('error', err => onError(err));

    await p;
    //res.end() should triggered by pipe's 'end' event
}));

await connect();
if (process.argv[1].endsWith('main.js')) {    
    app.listen(port, () => console.log(new Date(), `server at port ${port}`));
}
