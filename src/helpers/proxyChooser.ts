import path from "path";
import fs from "fs";
import { Collection } from "@discordjs/collection";
import z from "zod";

interface ProxyI {
    ip: string;
    port: string;
    auth?: {
        username: string;
        password: string;
    };
    fullProxy(): string;
}

class Proxy implements ProxyI {
    ip = "";
    port = "";
    auth?: { username: string; password: string } | undefined;

    constructor(stringProxy: string) {
        this.validateProxy(stringProxy);
    }

    private validateProxy(stringProxy: string) {
        const ipSchema = z
            .string()
            .regex(
                /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                { message: "Invalid IP address format" }
            );

        // Definizione dello schema per la porta
        const portSchema = z
            .string()
            .regex(/^([0-9]{1,5})$/, { message: "Invalid port format" })
            .refine(
                (port) => {
                    const numPort = Number(port);
                    return numPort >= 1 && numPort <= 65535;
                },
                { message: "Port must be between 1 and 65535" }
            );

        // Definizione dello schema per username e password
        const userInfoSchema = z.string().min(1);

        // Definizione dello schema per il formato ip:port
        const ipPortSchema = z.object({
            ip: ipSchema,
            port: portSchema,
        });

        // Definizione dello schema per il formato ip:port:username:password
        const ipPortAuthSchema = z.object({
            ip: ipSchema,
            port: portSchema,
            username: userInfoSchema,
            password: userInfoSchema,
        });

        // Funzione di validazione della stringa proxy
        const proxySchema = z.union([
            z.string().refine(
                (proxy) => {
                    const parts = proxy.split(":");
                    if (parts.length === 2) {
                        const [ip, port] = parts;
                        return ipPortSchema.safeParse({ ip, port }).success;
                    }
                    return false;
                },
                { message: "Invalid ip:port format" }
            ),
            z.string().refine(
                (proxy) => {
                    const parts = proxy.split(":");
                    if (parts.length === 4) {
                        const [ip, port, username, password] = parts;
                        return ipPortAuthSchema.safeParse({
                            ip,
                            port,
                            username,
                            password,
                        }).success;
                    }
                    return false;
                },
                { message: "Invalid ip:port:username:password format" }
            ),
        ]);

        let parsedProxyString: string;
        try {
            parsedProxyString = proxySchema.parse(stringProxy);

            const parts = parsedProxyString.split(":");
            if (parts.length === 4) {
                const [ip, port, username, password] = parts;
                this.ip = ip;
                this.port = port;
                this.auth = {
                    username: username,
                    password: password,
                };
            } else {
                const [ip, port] = parts;
                this.ip = ip;
                this.port = port;
            }
        } catch (err) {
            throw new Error(
                `${stringProxy} is invalid: ${(err as z.ZodError).errors
                    .map((err) => err.message)
                    .join(", ")}`
            );
        }
    }

    fullProxy(): string {
        return `${this.ip}:${this.port}${
            this.auth ? `${this.auth.username}:${this.auth.password}` : ""
        }`;
    }
}

// Type guard function to check if an object is of type ProxyI
function isProxyI(obj: any): obj is ProxyI {
    return (
        typeof obj === "object" &&
        typeof obj.ip === "string" &&
        typeof obj.port === "string" &&
        (obj.auth === undefined ||
            (typeof obj.auth.username === "string" &&
                typeof obj.auth.password === "string"))
    );
}

export class ProxyChooser {
    private proxyes: string[] = [];
    readonly proxyFilePath: string;
    readonly cachePath: string;
    readonly proxyCache = new Collection<string, Proxy>();

    constructor(
        proxyFilePath: string = path.join(
            __dirname,
            "..",
            "..",
            "data",
            "proxyes.txt"
        ),
        cachePath: string = path.join(
            __dirname,
            "..",
            "..",
            "data",
            "proxyCache.json"
        )
    ) {
        this.proxyFilePath = proxyFilePath;
        this.cachePath = cachePath;
        this.loadFile();
    }

    loadFile(): void {
        let proxyStringList: string;
        try {
            proxyStringList = fs.readFileSync(this.proxyFilePath, {
                encoding: "utf8",
            });
        } catch (err) {
            console.log("❌ There was an error in ProxyChoser.loadfile");
            throw err;
        }

        let proxyArray: string[] = proxyStringList.split("\n");
        proxyArray = proxyArray.map((proxy) =>
            proxy.trim().replace("\r", "").replace("\n", "")
        );
        proxyArray = proxyArray.filter((proxy) => proxy.length > 0);

        this.proxyes = proxyArray;
    }

    // Wrapper for the 2 function below, it automaticaly get the proxy and set it in the cache, and mange errors
    /**
     *
     * @param token
     * The token that will be associate with the proxy. The token and the proxy will be cached and every time that a proxy is request with the same token the proxy associate with that token will be retuned from cache
     */
    getProxy(token: string): Proxy {
        if (token.length == 0) throw new Error("insert a valid token");

        const proxy = this.getProxyFromCache(token);
        if (proxy) return proxy;

        let existInCache = true;

        // We set a value for this variabile or typescript will give an error saying that the variabile is used before assegnation
        let randomProxy: Proxy = new Proxy("0.0.0.0:1111:a:b");
        while (existInCache) {
            const randomStringProxy =
                this.proxyes[Math.floor(Math.random() * this.proxyes.length)];
            console.log(randomStringProxy);
            // const randomProxy = this.fromStringProxyToProxyObject(randomStringProxy)
            randomProxy = new Proxy(randomStringProxy);
            existInCache = this.proxyCache.some(
                (proxy) => proxy === randomProxy
            );
        }

        this.setProxyInCache(token, randomProxy);
        // console.log(this.proxyCache);
        return randomProxy;
    }

    private getProxyFromCache(token: string): Proxy | undefined {
        if (token.length == 0) throw new Error("insert a valid token");

        const proxy = this.proxyCache.get(token);
        return proxy;
    }

    private setProxyInCache(token: string, proxy: Proxy): void {
        if (token.length == 0) throw new Error("insert a valid token");

        this.proxyCache.set(token, proxy);
    }

    loadCache(): void {
        this.handleCacheFile();

        const fileData = this.cacheFileContoller<string>(() => {
            return fs.readFileSync(this.cachePath, { encoding: "utf8" });
        });
        // Collection<string, Proxy>
        const proxyCacheObject = JSON.parse(fileData);
        console.log(proxyCacheObject);
        // TODO: Il tipo di proxyCacheArray è any, mentre dobbiamo darli il tipo Collection<string, Proxy> ma dobbiamo verificare che sia effettivamente quello
    }

    saveCache(): void {
        this.handleCacheFile();

        const cacheJson = JSON.stringify(this.proxyCache.toJSON(), null, 4);
        this.cacheFileContoller(() => {
            fs.writeFileSync(this.cachePath, cacheJson, "utf8");
        });
    }

    clearCache(): void {
        this.handleCacheFile();

        this.cacheFileContoller(() => {
            fs.writeFileSync(this.cachePath, "[]", "utf8");
        });
    }

    private handleCacheFile(): void {
        if (fs.existsSync(this.cachePath)) return;

        fs.writeFileSync(this.cachePath, "[]", { flag: "w" });
    }

    private cacheFileContoller<T>(fileAction: () => T): T {
        try {
            return fileAction();
        } catch (err) {
            console.log(
                `❌ There was an error while saving the cache to file: ${this.cachePath}`
            );
            throw err;
        }
    }
}

// Testing
const proxyChooser = new ProxyChooser();
const token1 = "qwert";
// const token2 = "12341234";

const proxy: Proxy = proxyChooser.getProxy("qwert");
console.log(`Key: ${token1} Proxy: ${JSON.stringify(proxy, null, 4)}\n\n`);

// proxyChooser.saveCache();
proxyChooser.loadCache();

// const proxy2 = proxyChooser.getProxy("12341234");
// console.log(`Key: ${token2} Proxy: ${JSON.stringify(proxy2, null, 4)}\n\n`);

// const proxy3 = proxyChooser.getProxy(token1);
// console.log(`Key: ${token1} Proxy: ${JSON.stringify(proxy3, null, 4)}\n\n`);
