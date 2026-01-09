
const isDev = import.meta.env.DEV;

export const logger = {
    debug: (...args) => isDev && console.log(...args),
    info: (...args) => isDev && console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
};
