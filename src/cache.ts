import fs from 'fs';
import { logger } from './logger.js';
import {getStorage} from './storage/base.storage.js'
import { config } from './config.js';
import crypto from "node:crypto"
const storage = getStorage(config)
export class Cache {
    private ttl: number;
    private highHits: number;
    maxttl: number;
    constructor() {
        this.ttl = 60 * 60 * 12// 默认隔12小时刷新（秒）
        this.maxttl = 60 * 60 * 24 * 7 //下载量高的文件最大缓存7天（秒）
        this.init()
        this.highHits = 1
        this.settime(this.ttl)
    }

    private init() {
        if (!fs.existsSync("./cache.json")) {
            fs.writeFileSync("./cache.json", JSON.stringify({ data: {} }))
        }
    }

    private settime(time:number) {
        setTimeout(() => {
           this.refresh() //刷新列表
           this.settime(this.ttl)
          }, 1000*time);
    }

    async add(path: string, data:Buffer,) { //文件列表写有的，没有的不写
        const cache = JSON.parse(fs.readFileSync("./cache.json").toString())
        if (!await storage.exists(path)) { //无则写入文件
            await storage.writeFile(path,data,{path:"",hash:crypto.createHash('sha1').update(data as Uint8Array).digest('hex'),size:data.length,mtime: Date.now(),})
            //fse.outputFileSync("./cache/" + path, data)
        }
        if (!Object.keys(cache.data).includes(path)) {
            cache.data[path] = { hits: 0, save_time: Date.now() }
            fs.writeFileSync("./cache.json", JSON.stringify(cache))
            return 0;
        } else {
            cache.data[path].hits += 1
            fs.writeFileSync("./cache.json", JSON.stringify(cache))
            return 1;
        }
    }

    refresh() {
        const cache = JSON.parse(fs.readFileSync("./cache.json").toString())
        const tmp = []
        for (let i = 0; i < Object.keys(cache.data).length; i++) {
            const data = cache.data[Object.keys(cache.data)[i]]
            if(data.hits > this.highHits){
                    tmp.push({path:Object.keys(cache.data)[i],hash:"0",size:0})
            }else{
                delete cache.data[Object.keys(cache.data)[i]]
            }
        }
        fs.writeFileSync("./cache.json", JSON.stringify(cache))
        logger.info("缓存刷新成功！共移除"+storage.gc(tmp)+"个")
    }

    getStatus(path: string) {
        const cache = JSON.parse(fs.readFileSync("./cache.json").toString())
        if (cache.data[path] !== undefined) {
            cache.data[path].hits += 1
            fs.writeFileSync("./cache.json", JSON.stringify(cache))
            return 1;
        } else {
            return 0;
        }
    }

    get(path: string) {

        return fs.readFileSync("./cache/" + path)
    }
}