// noinspection DuplicatedCode
import fs from 'fs';
import { Readable } from 'stream';
import { v4 as uuid } from 'uuid';
import FormData from 'form-data';
import { after, before, describe, it } from 'mocha';
import chai from 'chai';
import fetch from 'node-fetch';
import HttpsProxyAgent from 'https-proxy-agent';
const { expect } = chai;

import { app as appService } from '../main.js';

describe('test case', async () => {
    let appServer;
    let app;
    const urlBase = 'http://localhost:18778';
    let httpAgent = process.env.MY_INSPECTOR_PROXY ? new HttpsProxyAgent(process.env.MY_INSPECTOR_PROXY) : undefined;
    before(async () => {
        let r;
        const p = new Promise(f => r = f);
        appServer = appService.listen(18778, () => { console.log('app server to be tested listen at 18778'); r(); });
        await p;
    });

    after(async () => {
        appServer.close();
    })

    it('text file', async () => {
        const fd = new FormData();
        fd.append('form-input-name', Readable.from(Buffer.from('hello world')), { filename: 'not-used' });
        let resp = await fetch(`${urlBase}/data/?fileName=helloWorld.txt`, {
            method: 'POST',
            headers: fd.getHeaders(),
            body: fd,
            agent: httpAgent,
        });
        let respJ = await resp.json();
        expect(resp.status).to.eq(200);
        expect(respJ.tinyUrl).to.not.be.empty;
        expect(respJ.ready).to.be.true;

        resp = await fetch(`${urlBase}/data/${respJ.tinyUrl}`);
        respJ = await resp.text();
        expect(resp.status).to.eq(200);
        expect(resp.headers.get('content-type')).to.eq('text/plain; charset=utf-8');
        expect(respJ).to.eq('hello world');
        expect(resp.headers.get('content-disposition')).to.eq('inline; filename="helloWorld.txt"');
    });

    it('image', async () => {
        const fd = new FormData();
        fd.append('form-input-name', Readable.from(Buffer.from('hello world')), { filename: 'not-used' });
        let resp = await fetch(`${urlBase}/data/?fileName=helloWorld.png`, {
            method: 'POST',
            headers: fd.getHeaders(),
            body: fd,
            agent: httpAgent,
        });
        let respJ = await resp.json();
        expect(resp.status).to.eq(200);
        expect(respJ.tinyUrl).to.not.be.empty;
        expect(respJ.ready).to.be.true;

        resp = await fetch(`${urlBase}/data/${respJ.tinyUrl}`);
        respJ = await resp.text();
        expect(resp.status).to.eq(200);
        expect(resp.headers.get('content-type')).to.eq('image/png');
        expect(respJ).to.eq('hello world');
        expect(resp.headers.get('content-disposition')).to.eq('inline; filename="helloWorld.png"');
    });

    it('duplicate hash', async () => {
        let hash;
        {
            const fd = new FormData();
            fd.append('form-input-name', Readable.from(Buffer.from('hello world')), { filename: 'not-used' });
            let resp = await fetch(`${urlBase}/data/?fileName=helloWorld.png`, {
                method: 'POST',
                headers: fd.getHeaders(),
                body: fd,
                agent: httpAgent,
            });
            let respJ = await resp.json();            
            expect(resp.status).to.eq(200);
            expect(respJ.tinyUrl).to.not.be.empty;
            expect(respJ.ready).to.be.true;

            hash=respJ.tinyUrl;

            resp = await fetch(`${urlBase}/data/${respJ.tinyUrl}`);
            respJ = await resp.text();
            expect(resp.status).to.eq(200);
            expect(resp.headers.get('content-type')).to.eq('image/png');
            expect(respJ).to.eq('hello world');
            expect(resp.headers.get('content-disposition')).to.eq('inline; filename="helloWorld.png"');
        }

        {
            const fd = new FormData();
            fd.append('form-input-name', Readable.from(Buffer.from('hello world')), { filename: 'not-used' });
            let resp = await fetch(`${urlBase}/data/?fileName=helloWorld.png&tinyUrl=${hash}`, {
                method: 'POST',
                headers: fd.getHeaders(),
                body: fd,
                agent: httpAgent,
            });
            let respJ = await resp.json();
            expect(resp.status).to.eq(200);
            expect(respJ.tinyUrl).to.not.be.empty;
            expect(respJ.ready).to.be.true;
            expect(respJ.tinyUrl).to.not.eq(hash);

            resp = await fetch(`${urlBase}/data/${respJ.tinyUrl}`);
            respJ = await resp.text();
            expect(resp.status).to.eq(200);
            expect(resp.headers.get('content-type')).to.eq('image/png');
            expect(respJ).to.eq('hello world');
            expect(resp.headers.get('content-disposition')).to.eq('inline; filename="helloWorld.png"');
        }
    });
});
