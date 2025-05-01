import fs from 'fs';
import fse from 'fs-extra'
export class Cache {
    private ttl: number;
    private highHits: number;
    private maxttl: number;
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
          }, 1000*time);
    }

    add(path: string, data: string | Buffer) {
        const cache = JSON.parse(fs.readFileSync("./cache.json").toString())
        if (!fs.existsSync("./cache/" + path)) { //无则写入文件
            console.log("写入")
            fse.outputFileSync("./cache/" + path, data)
        }
        if (!Object.keys(cache.data).includes(path)) {
            cache.data[path] = { hits: 0, save_time: Date.now() }
            fs.writeFileSync("./cache.json", JSON.stringify(cache))
            return 0;
        } else {
            console.log(cache)
            cache.data[path].hits += 1
            fs.writeFileSync("./cache.json", JSON.stringify(cache))
            return 1;
        }
    }

    refresh() {
        const cache = JSON.parse(fs.readFileSync("./cache.json").toString())
        for (let i = 0; i < Object.keys(cache.data).length; i++) {
            const data = cache.data[Object.keys(cache.data)[i]]
            if (data.hits < this.highHits) {
                delete cache.data[Object.keys(cache.data)[i]]
            } else if (Date.now() - data.save_time > this.maxttl) {
                fs.unlinkSync("./cache/" + cache.data[Object.keys(cache.data)[i]])
                delete cache.data[Object.keys(cache.data)[i]]
            }
        }
        fs.writeFileSync("./cache.json", JSON.stringify(cache))
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