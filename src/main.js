const Apify = require('apify');
const _ = require('lodash');
const {
    infiniteScroll,
    parseRelativeDate,
    requestCounter,
    cutOffDate,
    createAddEvent,
    createAddProfile,
    createAddSearch,
    createAddThread,
    createAddTopic,
    extendFunction,
    categorizeUrl,
    tweetToUrl,
    deferred,
    getEntities,
    proxyConfiguration,
} = require('./helpers');
const { LABELS, USER_OMIT_FIELDS } = require('./constants');

const { log } = Apify.utils;

Apify.main(async () => {
    /** @type {any} */
    const input = await Apify.getValue('INPUT');

    const proxyConfig = await proxyConfiguration({
        proxyConfig: input.proxyConfig,
    });

    const {
        tweetsDesired = 100,
        mode = 'replies',
        addUserInfo = true,
    } = input;

    log.info(`Limiting tweet counts to ${tweetsDesired}...`);

    const requestQueue = await Apify.openRequestQueue();
    const requestCounts = await requestCounter(tweetsDesired);
    const pushedItems = new Set(await Apify.getValue('PUSHED'));

    Apify.events.on('migrating', async () => {
        await Apify.setValue('PUSHED', [...pushedItems.values()]);
    });

    const addProfile = createAddProfile(requestQueue);
    const addSearch = createAddSearch(requestQueue);
    const addEvent = createAddEvent(requestQueue);
    const addThread = createAddThread(requestQueue);
    const addTopic = createAddTopic(requestQueue);

    const toDate = cutOffDate(-Infinity, input.toDate ? parseRelativeDate(input.toDate) : undefined);
    const fromDate = cutOffDate(Infinity, input.fromDate ? parseRelativeDate(input.fromDate) : undefined);

    const extendOutputFunction = await extendFunction({
        map: async (data) => {
            if (!data.tweets) {
                return [];
            }

            return Object.values(data.tweets).reduce((/** @type {any[]} */out, tweet) => {
                log.debug('Tweet data', tweet);

                const user = data.users[
                    _.get(
                        tweet,
                        ['user_id_str'],
                        _.get(tweet, ['user', 'id_str']),
                    )
                ];

                out.push({
                    user: addUserInfo ? {
                        ..._.omit(user, USER_OMIT_FIELDS),
                        created_at: new Date(user.created_at).toISOString(),
                    } : undefined,
                    id: tweet.id_str,
                    conversation_id: tweet.conversation_id_str,
                    ..._.pick(tweet, [
                        'full_text',
                        'reply_count',
                        'retweet_count',
                        'favorite_count',
                    ]),
                    ...getEntities(tweet),
                    url: tweetToUrl(user, tweet.id_str),
                    created_at: new Date(tweet.created_at).toISOString(),
                });

                return out;
            }, []);
        },
        filter: async ({ item }) => {
            return toDate(item.created_at) <= 0 && fromDate(item.created_at) >= 0;
        },
        output: async (output, { request, item }) => {
            if (!requestCounts.isDone(request)) {
                if (item.id && pushedItems.has(item.id)) {
                    return;
                }

                pushedItems.add(item.id);
                await Apify.pushData(output);
                requestCounts.increaseCount(request);
            }
        },
        input,
        key: 'extendOutputFunction',
        helpers: {
            _,
        },
    });

    const extendScraperFunction = await extendFunction({
        output: async () => {}, // no-op
        input,
        key: 'extendScraperFunction',
        helpers: {
            addProfile,
            addSearch,
            addEvent,
            addTopic,
            addThread,
            pushedItems,
            extendOutputFunction,
            requestQueue,
            _,
        },
    });

    if (input.startUrls && input.startUrls.length) {
        // parse requestsFromUrl
        const requestList = await Apify.openRequestList('STARTURLS', input.startUrls || []);

        let req;

        while (req = await requestList.fetchNextRequest()) { // eslint-disable-line no-cond-assign
            const categorized = categorizeUrl(req.url);

            switch (categorized) {
                case LABELS.EVENTS:
                    await addEvent(req.url);
                    break;
                case LABELS.HANDLE:
                    await addProfile(req.url, mode === 'replies');
                    break;
                case LABELS.STATUS:
                    await addThread(req.url);
                    break;
                case LABELS.TOPIC:
                    await addTopic(req.url);
                    break;
                case LABELS.SEARCH:
                    await addSearch(req.url, input.searchMode);
                    break;
                default:
                    throw new Error(`Unknown format ${categorized}`);
            }
        }
    }

    if (input.handle && input.handle.length) {
        for (const handle of input.handle) {
            await addProfile(handle, mode === 'replies');
        }
    }

    if (input.searchTerms && input.searchTerms.length) {
        for (const searchTerm of input.searchTerms) {
            await addSearch(searchTerm, input.searchMode);
        }
    }

    const isLoggingIn = input.initialCookies && input.initialCookies.length > 0;

    if (await requestQueue.isEmpty()) {
        throw new Error('You need to provide something to be extracted');
    }

    const crawler = new Apify.PuppeteerCrawler({
        handlePageTimeoutSecs: input.handlePageTimeoutSecs || 3600,
        requestQueue,
        proxyConfiguration: proxyConfig,
        maxConcurrency: isLoggingIn ? 1 : undefined,
        launchPuppeteerOptions: {
            stealth: false,
        },
        puppeteerPoolOptions: {
            useIncognitoPages: true,
            maxOpenPagesPerInstance: 1,
        },
        sessionPoolOptions: {
            createSessionFunction: (sessionPool) => {
                const session = new Apify.Session({
                    sessionPool,
                    maxUsageCount: isLoggingIn ? 5000 : 50,
                    maxErrorScore: 1,
                });

                return session;
            },
        },
        useSessionPool: true,
        maxRequestRetries: 10,
        gotoFunction: async ({ page, request, puppeteerPool, session }) => {
            await page.setBypassCSP(true);

            await Apify.utils.puppeteer.blockRequests(page, {
                urlPatterns: [
                    '.jpg',
                    '.ico',
                    '.jpeg',
                    '.gif',
                    '.svg',
                    '.png',
                    'pbs.twimg.com/semantic_core_img',
                    'pbs.twimg.com/profile_banners',
                    'pbs.twimg.com/media',
                    'pbs.twimg.com/card_img',
                    'www.google-analytics.com',
                    'branch.io',
                    '/guide.json',
                    '/client_event.json',
                ],
            });

            if (input.extendOutputFunction || input.extendScraperFunction) {
                // insert jQuery only when the user have an output function
                await Apify.utils.puppeteer.injectJQuery(page);
            }

            if (isLoggingIn) {
                await page.setCookie(...input.initialCookies);
            }

            try {
                return page.goto(request.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000,
                });
            } catch (e) {
                session.retire();
                await puppeteerPool.retire(page.browser());

                throw new Error('Failed to load page, retrying');
            }
        },
        handlePageFunction: async ({ request, session, puppeteerPool, page, response }) => {
            const retire = async () => {
                // TODO: need to force retiring both, the SDK sticks with forever failing sessions even with errorScore >= 1
                log.warning('Retiring session...');
                session.retire();
                await puppeteerPool.retire(page.browser());
            };

            if (!response || !response.ok()) {
                await retire();
                throw new Error('Page response is invalid');
            }

            if (await page.$('[name="failedScript"]')) {
                await retire();
                throw new Error('Failed to load page scripts, retrying...');
            }

            const failedToLoad = await page.$$eval('[data-testid="primaryColumn"] svg ~ span:not(:empty)', (els) => {
                return els.some((el) => el.innerHTML.includes('Try again'));
            });

            if (failedToLoad) {
                await retire();
                throw new Error('Failed to load page tweets, retrying...');
            }

            const signal = deferred();

            await extendScraperFunction(undefined, {
                page,
                request,
                label: 'before',
                signal,
            });

            page.on('response', async (res) => {
                try {
                    const contentType = res.headers()['content-type'];

                    if (!contentType || !`${contentType}`.includes('application/json')) {
                        return;
                    }

                    if (!res.ok()) {
                        signal.reject(new Error(`Status ${res.status()}`));
                        return;
                    }

                    const url = res.url();

                    if (!url) {
                        signal.reject(new Error('response url is null'));
                        return;
                    }

                    /** @type {any} */
                    const data = (await res.json());

                    if (!data) {
                        signal.reject(new Error('data is invalid'));
                        return;
                    }

                    /**
                     * @type {any}
                     */
                    let payload = null;

                    if (
                        (url.includes('/search/adaptive')
                        || url.includes('/timeline/profile')
                        || url.includes('/live_event/timeline')
                        || url.includes('/topics/')
                        || url.includes('/timeline/conversation'))
                        && data.globalObjects
                    ) {
                        payload = data.globalObjects;
                    }

                    if (url.includes('/live_event/') && data.twitter_objects) {
                        payload = data.twitter_objects;
                    }

                    if (payload) {
                        await extendOutputFunction(payload, {
                            request,
                            page,
                        });
                    }

                    await extendScraperFunction(payload, {
                        request,
                        page,
                        response,
                        url,
                        label: 'response',
                        signal,
                    });

                    const instructions = _.get(data, 'timeline.instructions', []);

                    for (const i of instructions) {
                        if (i && 'terminateTimeline' in i) {
                            signal.resolve();
                            return;
                        }
                    }
                } catch (err) {
                    log.debug(err.message, { request: request.userData });

                    signal.reject(err);
                }
            });

            let lastCount = requestCounts.currentCount(request);

            const intervalFn = (withCount = -1) => {
                if (lastCount === withCount || lastCount !== requestCounts.currentCount(request)) {
                    lastCount = requestCounts.currentCount(request);
                    log.info(`Extracted ${lastCount} tweets from ${request.url}`);
                }
            };

            const displayStatus = setInterval(intervalFn, 5000);

            try {
                await Promise.race([
                    infiniteScroll({
                        page,
                        maxTimeout: 60,
                        isDone: () => (signal.isResolved || requestCounts.isDone(request)),
                    }),
                    signal.promise,
                ]);
            } finally {
                signal.resolve();
                clearInterval(displayStatus);

                page.removeAllListeners('response');
                page.removeAllListeners('request');

                await extendScraperFunction(undefined, {
                    page,
                    request,
                    label: 'after',
                    signal,
                });
            }

            intervalFn(0);
        },
    });

    log.info('Starting scraper');

    await crawler.run();

    log.info('All finished');
});
