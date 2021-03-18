const Apify = require('apify');
const vm = require('vm');
const Puppeteer = require('puppeteer'); // eslint-disable-line no-unused-vars
const moment = require('moment');
const _ = require('lodash');
const { LABELS } = require('./constants');

const { log, sleep } = Apify.utils;

/**
 * @param {any} user
 * @param {string} id
 */
const tweetToUrl = (user, id) => {
    return `https://twitter.com/${_.get(user, 'screen_name')}/status/${id}`;
};

/**
 * @param {string} url
 */
const categorizeUrl = (url) => {
    if (!url || !/^https:\/\/(mobile|www)?\.?twitter\.com\//i.test(url)) {
        throw new Error(`Invalid url ${url}`);
    }

    const nUrl = new URL(url, 'https://twitter.com');

    if (nUrl.pathname === '/search' || nUrl.pathname.startsWith('/hashtag/')) {
        return LABELS.SEARCH;
    }

    if (/\/[a-zA-Z0-9_]{1,15}\/status\/\d+/.test(nUrl.pathname)) {
        return LABELS.STATUS;
    }

    if (/\/i\/events\/\d+/.test(nUrl.pathname)) {
        return LABELS.EVENTS;
    }

    if (/\/i\/topics\/\d+/.test(nUrl.pathname)) {
        return LABELS.TOPIC;
    }

    if (/^\/[a-zA-Z0-9_]{1,15}(\/|$)/.test(nUrl.pathname)) {
        return LABELS.HANDLE;
    }

    throw new Error(`Url ${url} didn't match any supported type. You can provide search, events and profile urls`);
};

/**
 * @param {Apify.RequestQueue} requestQueue
 */
const createAddProfile = (requestQueue) => async (handle, replies = false) => {
    if (!handle) {
        return;
    }

    const isUrl = `${handle}`.includes('twitter.com');

    return requestQueue.addRequest({
        url: isUrl
            ? handle
            : `https://twitter.com/${cleanupHandle(handle)}${replies ? '/with_replies' : ''}`,
        userData: {
            label: LABELS.HANDLE,
            handle: cleanupHandle(handle),
        },
    });
};

/**
 * @param {Apify.RequestQueue} requestQueue
 */
const createAddThread = (requestQueue) => async (thread) => {
    if (!thread) {
        return;
    }

    const isUrl = `${thread}`.includes('twitter.com');

    return requestQueue.addRequest({
        url: isUrl
            ? thread
            : `https://twitter.com/i/status/${thread}`,
        userData: {
            label: LABELS.STATUS,
            thread,
        },
    });
};

/**
 * @param {Apify.RequestQueue} requestQueue
 */
const createAddTopic = (requestQueue) => async (topic) => {
    if (!topic) {
        return;
    }

    const isUrl = `${topic}`.includes('twitter.com');

    return requestQueue.addRequest({
        url: isUrl
            ? topic
            : `https://twitter.com/i/topics/${topic}`,
        userData: {
            label: LABELS.TOPIC,
            topic,
        },
    });
};

/**
 * @param {Apify.RequestQueue} requestQueue
 */
const createAddSearch = (requestQueue) => async (search, mode) => {
    if (!search) {
        return;
    }

    const isUrl = `${search}`.includes('twitter.com');

    return requestQueue.addRequest({
        url: isUrl
            ? search
            : `https://twitter.com/search?q=${encodeURIComponent(search)}&src=typed_query${mode ? `&f=${mode}` : ''}`,
        userData: {
            label: LABELS.SEARCH,
            search: !isUrl
                ? search
                : new URL(search, 'https://twitter.com').searchParams.get('q'),
        },
    });
};

/**
 * @param {Apify.RequestQueue} requestQueue
 */
const createAddEvent = (requestQueue) => async (event) => {
    if (!event) {
        return;
    }

    const isUrl = `${event}`.includes('twitter.com');

    return requestQueue.addRequest({
        url: isUrl
            ? event
            : `https://twitter.com/i/events/${event}`,
        userData: {
            label: LABELS.EVENTS,
            event: !isUrl
                ? event
                : new URL(event, 'https://twitter.com').pathname.split('/events/', 2)[1],
        },
    });
};

/**
 * @param {string|Date|number} [value]
 * @param {boolean} [isoString]
 */
const convertDate = (value, isoString = false) => {
    if (!value) {
        return isoString ? '2100-01-01T00:00:00.000Z' : Infinity;
    }

    if (value instanceof Date) {
        return isoString ? value.toISOString() : value.getTime();
    }

    let tryConvert = new Date(value);

    // catch values less than year 2002
    if (Number.isNaN(tryConvert.getTime()) || `${tryConvert.getTime()}`.length < 13) {
        if (typeof value === 'string') {
            // convert seconds to miliseconds
            tryConvert = new Date(value.length >= 13 ? +value : +value * 1000);
        } else if (typeof value === 'number') {
            // convert seconds to miliseconds
            tryConvert = new Date(`${value}`.length >= 13 ? value : value * 1000);
        }
    }

    return isoString ? tryConvert.toISOString() : tryConvert.getTime();
};

/**
 * @param {*} value
 * @returns
 */
const parseTimeUnit = (value) => {
    if (!value) {
        return null;
    }

    if (value === 'today' || value === 'yesterday') {
        return (value === 'today' ? moment() : moment().subtract(1, 'day')).startOf('day');
    }

    const [, number, unit] = `${value}`.match(/^(\d+)\s?(minute|second|day|hour|month|year|week)s?$/i) || [];

    if (+number && unit) {
        return moment().subtract(+number, unit);
    }

    return moment(value);
};

/**
 * @typedef MinMax
 * @property {number | string} [min]
 * @property {number | string} [max]
 */

/**
 * @typedef {ReturnType<typeof minMaxDates>} MinMaxDates
 */

/**
 * Generate a function that can check date intervals depending on the input
 * @param {MinMax} param
 */
const minMaxDates = ({ min, max }) => {
    const minDate = parseTimeUnit(min);
    const maxDate = parseTimeUnit(max);

    if (minDate && maxDate && maxDate.diff(minDate) < 0) {
        throw new Error(`Minimum date ${minDate.toString()} needs to be less than max date ${maxDate.toString()}`);
    }

    return {
        /**
         * cloned min date, if set
         */
        get minDate() {
            return minDate?.clone();
        },
        /**
         * cloned max date, if set
         */
        get maxDate() {
            return maxDate?.clone();
        },
        /**
         * compare the given date/timestamp to the time interval
         * @param {string | number} time
         */
        compare(time) {
            const base = moment(time);
            return (minDate ? minDate.diff(base) <= 0 : true) && (maxDate ? maxDate.diff(base) >= 0 : true);
        },
    };
};

/**
 * @param {string} handle
 */
const cleanupHandle = (handle) => {
    const matches = handle.match(/^(?:https:\/\/(mobile|www)?\.?twitter\.com\/|@)?(?<HANDLE>[a-zA-Z0-9_]{1,15})$/);

    if (!matches || !matches.groups || !matches.groups.HANDLE) {
        throw new Error(`Invalid handle provided: ${handle}`);
    }

    return matches.groups.HANDLE;
};

/**
 * @param {{
 *  page: Puppeteer.Page,
 *  maxTimeout?: number,
 *  isDone: () => boolean,
 *  waitForDynamicContent?: number,
 * }} params
 */
const infiniteScroll = async ({ page, isDone, maxTimeout = 0, waitForDynamicContent = 16 }) => {
    let finished = false;
    const startTime = Date.now();

    const maybeResourceTypesInfiniteScroll = ['xhr', 'fetch', 'websocket', 'other'];
    const resourcesStats = {
        newRequested: 0,
        oldRequested: 0,
        matchNumber: 0,
    };

    /**
     * @param {Puppeteer.Request} msg
     */
    const getRequest = (msg) => {
        try {
            if (maybeResourceTypesInfiniteScroll.includes(msg.resourceType())) {
                resourcesStats.newRequested++;
            }
        } catch (e) { }
    };

    page.on('request', getRequest);

    const checkForMaxTimeout = () => {
        if (resourcesStats.oldRequested === resourcesStats.newRequested) {
            resourcesStats.matchNumber++;
            if (resourcesStats.matchNumber >= waitForDynamicContent) {
                finished = true;
                return;
            }
        } else {
            resourcesStats.matchNumber = 0;
            resourcesStats.oldRequested = resourcesStats.newRequested;
        }
        // check if timeout has been reached
        if (maxTimeout !== 0 && (Date.now() - startTime) / 1000 > maxTimeout) {
            finished = true;
        } else {
            setTimeout(checkForMaxTimeout, 3000);
        }
    };

    return new Promise(async (resolve) => {
        checkForMaxTimeout();

        const scrollHeight = await page.evaluate(() => window.innerHeight / 2);
        let lastScrollHeight = 0;

        while (!finished) {
            try {
                lastScrollHeight = await page.evaluate(async (delta) => {
                    window.scrollBy(0, delta);
                    return window.scrollY;
                }, lastScrollHeight + scrollHeight);

                try {
                    while (true) {
                        const buttons = await page.$x('//*[@role="button" and contains(.,"Show") and not(@aria-label)]'); // Show replies / Show more replies / Show buttons

                        for (const button of buttons) {
                            if (isDone()) {
                                break;
                            }
                            await sleep(3000);
                            if (isDone()) {
                                break;
                            }
                            await button.click();
                        }

                        if (!buttons.length) {
                            break;
                        }
                    }
                } catch (e) {
                    log.debug(`Wait for response, ${e.message}`);
                }

                if (isDone()) {
                    finished = true;
                } else {
                    await sleep((maxTimeout * 30) || 3000);
                }
            } catch (e) {
                log.debug(e);
                finished = true;
            }
        }

        log.debug('Stopped scrolling');

        resolve(undefined);
    });
};

/**
 * @template T
 * @typedef {T & { Apify: Apify, customData: any, request: Apify.Request }} PARAMS
 */

/**
 * Compile a IO function for mapping, filtering and outputing items.
 * Can be used as a no-op for interaction-only (void) functions on `output`.
 * Data can be mapped and filtered twice.
 *
 * Provided base map and filter functions is for preparing the object for the
 * actual extend function, it will receive both objects, `data` as the "raw" one
 * and "item" as the processed one.
 *
 * Always return a passthrough function if no outputFunction provided on the
 * selected key.
 *
 * @template RAW
 * @template {{ [key: string]: any }} INPUT
 * @template MAPPED
 * @template {{ [key: string]: any }} HELPERS
 * @param {{
 *  key: string,
 *  map?: (data: RAW, params: PARAMS<HELPERS>) => Promise<MAPPED>,
 *  output?: (data: MAPPED, params: PARAMS<HELPERS> & { data: RAW, item: MAPPED }) => Promise<void>,
 *  filter?: (obj: { data: RAW, item: MAPPED }, params: PARAMS<HELPERS>) => Promise<boolean>,
 *  input: INPUT,
 *  helpers: HELPERS,
 * }} params
 * @return {Promise<(data: RAW, args?: Record<string, any>) => Promise<void>>}
 */
const extendFunction = async ({
    key,
    output,
    filter,
    map,
    input,
    helpers,
}) => {
    /**
     * @type {PARAMS<HELPERS>}
     */
    const base = {
        ...helpers,
        Apify,
        customData: input.customData || {},
    };

    const evaledFn = (() => {
        // need to keep the same signature for no-op
        if (typeof input[key] !== 'string' || input[key].trim() === '') {
            return new vm.Script('({ item }) => item');
        }

        try {
            return new vm.Script(input[key], {
                lineOffset: 0,
                produceCachedData: false,
                displayErrors: true,
                filename: `${key}.js`,
            });
        } catch (e) {
            throw new Error(`"${key}" parameter must be a function`);
        }
    })();

    /**
     * Returning arrays from wrapper function split them accordingly.
     * Normalize to an array output, even for 1 item.
     *
     * @param {any} value
     * @param {any} [args]
     */
    const splitMap = async (value, args) => {
        const mapped = map ? await map(value, args) : value;

        if (!Array.isArray(mapped)) {
            return [mapped];
        }

        return mapped;
    };

    return async (data, args) => {
        const merged = { ...base, ...args };

        for (const item of await splitMap(data, merged)) {
            if (filter && !(await filter({ data, item }, merged))) {
                continue; // eslint-disable-line no-continue
            }

            const result = await (evaledFn.runInThisContext()({
                ...merged,
                data,
                item,
            }));

            for (const out of (Array.isArray(result) ? result : [result])) {
                if (output) {
                    if (out !== null) {
                        await output(out, { ...merged, data, item });
                    }
                    // skip output
                }
            }
        }
    };
};

/**
 * @param {number} count
 */
const requestCounter = async (count) => {
    /** @type {Record<string, number>} */
    const countState = /** @type {any} */(await Apify.getValue('COUNT')) || {};

    const persistState = async () => {
        await Apify.setValue('COUNT', countState);
    };

    Apify.events.on('persistState', persistState);

    return {
        /** @param {Apify.Request} request */
        currentCount(request) {
            return countState[request.id] || 0;
        },
        /** @param {Apify.Request} request */
        increaseCount(request, increment = 1) {
            countState[request.id] = (countState[request.id] || 0) + increment;
        },
        /** @param {Apify.Request} request */
        isDone(request) {
            return countState[request.id] >= count;
        },
    };
};

const deferred = () => {
    let isResolved = false;
    /** @type {(res?: any) => void} */
    let resolve = () => {};
    /** @type {(err: Error) => void} */
    let reject = () => {};

    const promise = new Promise((r1, r2) => {
        resolve = (res) => {
            isResolved = true;
            r1(res);
        };
        reject = (err) => {
            isResolved = true;
            r2(err);
        };
    });

    return {
        resolve,
        reject,
        get isResolved() {
            return isResolved;
        },
        promise,
    };
};

/**
 * @param {any} tweet
 */
const getEntities = (tweet) => {
    const entities = _.get(tweet, 'entities', {});

    return {
        hashtags: _.get(entities, 'hashtags', []).map(({ text }) => text).filter(Boolean),
        symbols: _.get(entities, 'symbols', []).map(({ text }) => text).filter(Boolean),
        user_mentions: _.get(entities, 'user_mentions', []).map((user) => _.omit(user, ['id', 'indices'])).filter(Boolean),
        urls: _.get(entities, 'urls', []).map((url) => _.pick(url, ['url', 'expanded_url', 'display_url'])).filter(Boolean),
    };
};

/**
 * Do a generic check when using Apify Proxy
 *
 * @typedef params
 * @property {any} [params.proxyConfig] Provided apify proxy configuration
 * @property {boolean} [params.required] Make the proxy usage required when running on the platform
 * @property {string[]} [params.blacklist] Blacklist of proxy groups, by default it's ['GOOGLE_SERP']
 * @property {boolean} [params.force] By default, it only do the checks on the platform. Force checking regardless where it's running
 * @property {string[]} [params.hint] Hint specific proxy groups that should be used, like SHADER or RESIDENTIAL
 *
 * @param {params} params
 * @returns {Promise<Apify.ProxyConfiguration | undefined>}
 */
const proxyConfiguration = async ({
    proxyConfig,
    required = true,
    force = Apify.isAtHome(),
    blacklist = ['GOOGLESERP'],
    hint = [],
}) => {
    const configuration = await Apify.createProxyConfiguration(proxyConfig);

    // this works for custom proxyUrls
    if (Apify.isAtHome() && required) {
        if (!configuration || (!configuration.usesApifyProxy && (!configuration.proxyUrls || !configuration.proxyUrls.length)) || !configuration.newUrl()) {
            throw new Error('\n=======\nYou must use Apify proxy or custom proxy URLs\n\n=======');
        }
    }

    // check when running on the platform by default
    if (force) {
        // only when actually using Apify proxy it needs to be checked for the groups
        if (configuration && configuration.usesApifyProxy) {
            if (blacklist.some((blacklisted) => (configuration.groups || []).includes(blacklisted))) {
                throw new Error(`\n=======\nThese proxy groups cannot be used in this actor. Choose other group or contact support@apify.com to give you proxy trial:\n\n*  ${blacklist.join('\n*  ')}\n\n=======`);
            }

            // specific non-automatic proxy groups like RESIDENTIAL, not an error, just a hint
            if (hint.length && !hint.some((group) => (configuration.groups || []).includes(group))) {
                Apify.utils.log.info(`\n=======\nYou can pick specific proxy groups for better experience:\n\n*  ${hint.join('\n*  ')}\n\n=======`);
            }
        }
    }

    return configuration;
};

module.exports = {
    minMaxDates,
    extendFunction,
    convertDate,
    infiniteScroll,
    cleanupHandle,
    proxyConfiguration,
    requestCounter,
    categorizeUrl,
    createAddProfile,
    createAddSearch,
    createAddEvent,
    createAddThread,
    createAddTopic,
    tweetToUrl,
    deferred,
    getEntities,
};
