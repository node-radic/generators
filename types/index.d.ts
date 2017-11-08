
declare global {
    namespace NodeJS {
        export interface ReadableStream {
            pipe<T extends ReadWriteStream>(destination: T, options?: { end?: boolean; }): T;
        }
        export interface ReadWriteStream {
            pipe<T extends ReadWriteStream>(destination: T, options?: { end?: boolean; }): T;
        }
    }
}