## Features

Twitter Scraper crawls specified Twitter profiles and URLs, and extracts:

- User information, such as name, Twitter handle (username), location, follower/following count, profile URL/image/banner, date of creation
- List of tweets, retweets, and replies from profiles
- Statistics for each tweet: favorites, replies, and retweets for each tweet
- Search hashtags, get top, latest, people, picture, or video tweets

Our free Twitter Scraper enables you to extract large amounts of data from Twitter. It lets you do much more than the Twitter API, because it doesn't have rate limits and you don't even need to have a Twitter account, a registered app, or Twitter API key.

You can crawl based on a list of Twitter handles or just by using a Twitter URL such as a search, trending topics, or hashtags.

## Use cases

Scraping Twitter will give you access to the more than 500 million tweets posted every day. You can use that data in lots of different ways:

- Track discussions about your brand, products, country, or city.
- Monitor your competitors and see how popular they really are, and how you can get a competitive edge.
- Keep an eye on new trends, attitudes, and fashions as they emerge.
- Use the data to train AI models or for academic research.
- Track sentiment to make sure your investments are protected.
- Fight fake news by understanding the pattern of how misinformation spreads.
- Explore discussions about travel destinations, services, amenities, and take advantage of local knowledge.
- Analyze consumer habits and develop new products or target underdeveloped niches.


If you would like more inspiration on how scraping social media can help your business or organization, check out our [industry pages](https://apify.com/industries).

## Tutorial

You can read our step-by-step tutorial on [how to scrape Twitter](https://blog.apify.com/how-to-scrape-tweets-and-more-on-twitter-59330e6fb522/) if you need some guidance on how to run the scraper. Or you can always email support@apify.com for help.

## Input Configuration

The Twitter Scraper [actor](https://apify.com/actors) has the following input options

- **Mode** - Scrape only own tweets from the profile page or include replies to other users
- **List of Handles** - Specify a list of Twitter handles (usernames) you want to scrape. If zero, the actor ignores the links and only crawls the Start URLs.
- **Max. Tweets** - Specify the maximum number of tweets you want to scrape.
- **Proxy Configuration** - Select a proxy to be used.
- **Login Cookies** - Your Twitter login cookies (no username/password is submitted). Check the [login](#login) section.

## Supported Twitter URL types

* Searches: https://twitter.com/search?q=tesla&src=typed_query
* Trending topics: https://twitter.com/search?q=%23FESTABBB21&src=trend_click&vertical=trends
* Profiles: https://twitter.com/elonmusk
* Statuses: https://twitter.com/elonmusk/status/1356381230925635591
* Topics: https://twitter.com/i/topics/933033311844286464
* Hashtag: https://twitter.com/hashtag/WandaVison
* Retweets with quotes: https://twitter.com/elonmusk/status/1356524205374918659/retweets/with_comments (requires login)
* Events: https://twitter.com/i/events/1354736314923372544

## Results

The actor stores its results into the default dataset associated with the actor run. The data can be downloaded in machine-readable formats such as JSON, HTML, CSV or Excel.

Each item in the dataset will contain a separate tweet that follows this format:

```jsonc
{
  "user": {
    "id_str": "44196397",
    "name": "Elon Musk",
    "screen_name": "elonmusk",
    "location": "",
    "description": "",
    "followers_count": 42583621,
    "fast_followers_count": 0,
    "normal_followers_count": 42583621,
    "friends_count": 104,
    "listed_count": 59150,
    "created_at": "2009-06-02T20:12:29.000Z",
    "favourites_count": 7840,
    "verified": true,
    "statuses_count": 13360,
    "media_count": 801,
    "profile_image_url_https": "https://pbs.twimg.com/profile_images/1295975423654977537/dHw9JcrK_normal.jpg",
    "profile_banner_url": "https://pbs.twimg.com/profile_banners/44196397/1576183471",
    "has_custom_timelines": true,
    "advertiser_account_type": "promotable_user",
    "business_profile_state": "none",
    "translator_type": "none"
  },
  "id": "1338857124508684289",
  "conversation_id": "1338390123373801472",
  "full_text": "@CyberpunkGame The objective reality is that it is impossible to run an advanced game well on old hardware. This is a much more serious issue: https://t.co/OMNCTa9hJY",
  "reply_count": 792,
  "retweet_count": 669,
  "favorite_count": 17739,
  "hashtags": [],
  "symbols": [],
  "user_mentions": [
    {
      "screen_name": "CyberpunkGame",
      "name": "Cyberpunk 2077",
      "id_str": "821102114"
    }
  ],
  "urls": [
    {
      "url": "https://t.co/OMNCTa9hJY",
      "expanded_url": "https://www.pcgamer.com/the-more-time-i-spend-in-cyberpunk-2077s-world-the-less-i-believe-in-it/",
      "display_url": "pcgamer.com/the-more-time-…"
    }
  ],
  "url": "https://twitter.com/elonmusk/status/1338857124508684289",
  "created_at": "2020-12-15T14:43:07.000Z"
}
```

## Login

By providing *login cookies*, you can access more content, such as tweets with sensitive media or related to your own account. Please **be careful** with this option. Although Twitter Scraper is designed not to scrape too intensively, it is still possible that Twitter will block your account.

The *login cookies* look like this:

```json
[
    {
        "name": "auth_token",
        "domain": ".twitter.com",
        "value": "f431d25ba571dfdb6c03b9900f28f6f2c7de3e97"
    }
]
```

You can get this information using the [EditThisCookie](https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg?hl=en) extension.

## Advanced search

You can use a predefined search using Advanced Search as a `startUrl`, e.g. `https://twitter.com/search?q=cool%20until%3A2020-01-01&src=typed_query`

This returns only tweets containing "cool" before `2020-01-01`.

## Workaround for max tweets limit

By default, the Twitter API will return only at most 3,200 tweets per profile or search. If you need to get more than the maximum number, you can split your start URLs with time slices, like this:

* `https://twitter.com/search?q=(from%3Aelonmusk)%20since%3A2020-03-01%20until%3A2020-04-01&src=typed_query&f=live`
* `https://twitter.com/search?q=(from%3Aelonmusk)%20since%3A2020-02-01%20until%3A2020-03-01&src=typed_query&f=live`
* `https://twitter.com/search?q=(from%3Aelonmusk)%20since%3A2020-01-01%20until%3A2020-02-01&src=typed_query&f=live`

All URLs are from the same profile (elonmusk), but they are split by month (January -> February -> March 2020). This can be created using Twitter "Advanced Search" on https://twitter.com/search

You can use bigger intervals for profiles that don't post very often.

Other limitations include:

- Live tweets are capped by at most 1 day in the past (use the search filters above to get around this)
- Most search modes are capped at around 150 tweets (Top, Videos, Pictures)

## Extend output function

This parameter allows you to change the shape of your dataset output, split arrays into separate dataset items, or filter the output:

```js
async ({ data, item, request }) => {
    item.user = undefined; // removes this field from the output
    delete item.user; // this works as well

    const raw = data.tweets[item['#sort_index']]; // allows you to access the raw data

    item.source = raw.source; // adds "Twitter for ..." to the output

    if (request.userData.search) {
        item.search = request.userData.search; // add the search term to the output
        item.searchUrl = request.loadedUrl; // add the raw search URL to the output
    }

    return item;
}
```

Filtering items:

```js
async ({ item }) => {
    if (!item.full_text.includes('lovely')) {
        return null; // omit the output if the tweet body doesn't contain the text
    }

    return item;
}
```

Splitting into multiple dataset items and change the output completely:

```js
async ({ item }) => {
    // dataset will be full of items like { hashtag: '#somehashtag' }
    // returning an array here will split in multiple dataset items
    return item.hashtags.map((hashtag) => {
        return { hashtag: `#${hashtag}` };
    });
}
```

## Extend scraper function

This parameter allows you to extend how the scraper works and can make it easier to extend the default functionality without having to create your own custom version. For example, you can include a search of the trending topics on each page visit:

```js
async ({ page, request, addSearch, addProfile, addThread, customData }) => {
    await page.waitForSelector('[aria-label="Timeline: Trending now"] [data-testid="trend"]');

    const trending = await page.evaluate(() => {
        const trendingEls = $('[aria-label="Timeline: Trending now"] [data-testid="trend"]');

        return trendingEls.map((_, el) => {
            return {
                term: $(el).find('> div > div:nth-child(2)').text().trim(),
                profiles: $(el).find('> div > div:nth-child(3) [role="link"]').map((_, el) => $(el).text()).get()
            }
        }).get();
    });

    for (const { search, profiles } of trending) {
        await addSearch(search); // add a search using text

        for (const profile of profiles) {
            await addProfile(profile); // adds a profile using link
        }
    }

    // adds a thread and get replies. can accept an id, like from conversation_id or an URL
    // you can call this multiple times but will be added only once
    await addThread("1351044768030142464");
}
```

Additional variables are available inside `extendScraperFunction`:

```js
async ({ label, response, url }) => {
    if (label === 'response' && response) {
        // inside the page.on('response') callback
        if (url.includes('live_pipeline')) {
            // deal with plain text content
            const blob = await (await response.blob()).text();
        }
    } else if (label === 'before') {
        // executes before the page.on('response'), can be used for intercept request/response
    } else if (label === 'after') {
        // executes after the scraping process has finished, even on crash
    }
}
```

## Personal data
You should be aware that the data extracted can contain personal data. Personal data is protected by GDPR in the European Union and by other regulations around the world. You should not scrape personal data unless you have a legitimate reason to do so. If you're unsure whether your reason is legitimate, consult your lawyers. You can also read our blog post on the [legality of web scraping](https://blog.apify.com/is-web-scraping-legal/).

## Custom Twitter scraping solution
If you want to scrape Twitter, but don't want to run the scraper yourself, you can [request a custom solution](https://apify.com/custom-solutions).

## Changelog
Twitter Scraper is under continual development. You can always find out about the latest updates by reading the [changelog](https://github.com/pocesar/actor-twitter-scraper/blob/master/CHANGELOG.md). If you find a problem or would like to suggest a new feature, you can [open a GitHub issue](https://github.com/pocesar/actor-twitter-scraper/issues).
