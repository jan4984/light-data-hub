// noinspection DuplicatedCode
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { after, before, describe, it } from 'mocha';
import chai from 'chai';
import axios from 'axios';
const { expect } = chai;

import { app as appService } from '../main.js';

describe('test case', async () => {
    let appServer;
    let app;
    before(async () => {
        let r;
        const p = new Promise(f => r = f);
        appServer = appService.listen(18778, () => { console.log('app server to be tested listen at 18778'); r(); });
        await p;
        app = axios.create({
            baseURL: 'http://localhost:18778',
        });
    });

    after(async () => {
        appServer.close();
    })

    it('text file', async () => {
            let resp = await app.post('/data/', Buffer.from('hello world'), {
                params:{                    
                    fileName:'helloWorld.txt'
                }
            });
            expect(resp.status).to.eq(200);
            expect(resp.data.tinyUrl).to.not.be.empty;
            expect(resp.data.ready).to.be.true;

            resp = await app.get(`/data/${resp.data.tinyUrl}`);
            expect(resp.status).to.eq(200);
            expect(resp.headers['content-type']).to.eq('text/plain; charset=utf-8');
            expect(resp.data).to.eq('hello world');
            expect(resp.headers['content-disposition']).to.eq('inline; filename="helloWorld.txt"');
    });

    it('image', async() => {
        let resp = await app.post('/data/', Buffer.from('hello world'), {
            params:{                    
                fileName:'helloWorld.png'
            }
        });
        expect(resp.status).to.eq(200);
        expect(resp.data.tinyUrl).to.not.be.empty;
        expect(resp.data.ready).to.be.true;

        resp = await app.get(`/data/${resp.data.tinyUrl}`);
        expect(resp.status).to.eq(200);
        expect(resp.headers['content-type']).to.eq('image/png');
        expect(resp.data).to.eq('hello world');
        expect(resp.headers['content-disposition']).to.eq('inline; filename="helloWorld.png"');
    });
});
