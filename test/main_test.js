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
        const loginResult = await axios.post('http://localhost:18778/api/login', { password: process.env.PASSWORD });
        expect(loginResult.status).to.eq(200)
        expect(loginResult.data.token).not.be.empty;
        app = axios.create({
            baseURL: 'http://localhost:18778',
            headers: { authorization: loginResult.data.token },
            validateStatus:()=>true,
        })
    });

    after(async () => {
        appServer.close();
    })

    it('simple get', async () => {
        let tasks = (await app.get('/api/tasks')).data.tasks;
        expect(tasks).to.be.an('array');
        const newTask = uuid();
        const rawFile = uuid();
        fs.mkdirSync(`${process.env.TASKS_DIR}/${newTask}`);
        fs.writeFileSync(`${process.env.TASKS_DIR}/${rawFile}`, 'test task dir');
        tasks = (await app.get('/api/tasks')).data.tasks;
        expect(tasks).to.be.an('array');
        expect(tasks).to.have.lengthOf.gte(1);
        expect(tasks).to.deep.include({
            task: newTask,
            status: { progress: -1, status: '未开始', datetime: '' },
            start: { start: '', product: '' },
            running: false
        });
        expect(tasks).to.not.include({ task: rawFile });
    });

    it('start-exit-start ok', async () => {
        const newTask = uuid();
        const product = uuid();
        fs.mkdirSync(`${process.env.TASKS_DIR}/${newTask}`);
        const startResp = await app.post('/api/task', { task: newTask, product });
        expect(startResp.status).to.eq(200);
        const startAt = startResp.data.start;
        await new Promise(r => setTimeout(r, 2000));
        let tasks = (await app.get('/api/tasks')).data.tasks;        
        let gotTask = tasks.find(t => t.task == newTask);
        expect(gotTask.running).to.be.true;
        expect(gotTask.status.status).to.eq('running');
        expect(gotTask.start.start).to.eq(startAt);
        expect(gotTask.start.product).to.eq(product);
        await new Promise(r => setTimeout(r, 4000));
        tasks = (await app.get('/api/tasks')).data.tasks;
        gotTask = tasks.find(t => t.task == newTask);
        expect(gotTask.status).to.deep.eq({ status: 'finished', progress: 100, datetime: '2021-01-02 03:04:05' });
        expect(gotTask.start.start).to.eq(startAt);
        expect(gotTask.start.product).to.eq(product);

        {
            const newTask = uuid();
            const product = uuid();
            fs.mkdirSync(`${process.env.TASKS_DIR}/${newTask}`);
            const startResp = await app.post('/api/task', { task: newTask, product });
            expect(startResp.status).to.eq(200);
            await new Promise(r => setTimeout(r, 5000));
        }

    }
    ).timeout(15000);

    it('start-start fail', async () => {
        {
            const newTask = uuid();
            const product = uuid();
            fs.mkdirSync(`${process.env.TASKS_DIR}/${newTask}`);
            const startResp = await app.post('/api/task', { task: newTask, product });
            expect(startResp.status).to.eq(200);
        }
        {
            const newTask = uuid();
            const product = uuid();
            fs.mkdirSync(`${process.env.TASKS_DIR}/${newTask}`);
            const startResp = await app.post('/api/task', { task: newTask, product });
            expect(startResp.status).to.eq(400);
            expect(startResp.data.code).to.eq(-2);
        }
    }).timeout(10000);

    it('download log', async()=>{
        {
            const newTask = uuid();
            const product = uuid();
            fs.mkdirSync(`${process.env.TASKS_DIR}/${newTask}`);
            const startResp = await app.post('/api/task', { task: newTask, product });
            expect(startResp.status).to.eq(200);
            await new Promise(r => setTimeout(r, 5000));
            const resp = await app.get(`/api/logs/${newTask}`);
            expect(resp.status).to.eq(200);
            expect(resp.data).to.have.lengthOf.gt(10);            
        }
    }).timeout(10000);

});
