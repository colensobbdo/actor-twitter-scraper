# Twitter Scraper

The actor crawls specified twitter profiles, searches and events, and scrapes the following information:

- User information, like name, username, location, follower/following count, profile url/image/banner, date of creation
- List of tweets, retweets, and replies from profiles
- Statistics for each tweet of: favorites, replies, and retweets for each tweet
- Search hashtags, get top, latest, people, pictures or videos tweets

The actor is useful for extracting large amounts of tweet data. Unlike the Twitter API, it does not have rate limit contraints.

## Input Configuration

The actor has the following input options

- **Mode** - Scrape only own tweets from the profile page or include replies to other users
- **List of Handles** - Specify a list of twitter handles (usernames) you want to scrape
  shall the crawler visit. If zero, the actor ignores the links and only crawls the Start URLs.
- **Max. Tweets** - Specify the maximum number of tweets you want to scrape.
- **Proxy Configuration** - Select a proxy to be used by the actor.
- **Login Cookies** - Your Twitter login cookies (no username/password is submitted). For instructions on how to get your login cookies, please see our [tutorial](https://apify.com/help-dev/en/articles/1444249-log-in-to-website-by-transferring-cookies-from-web-browser).

## Results

The actor stores its results into the default dataset associated with the actor run,
from where they can be downloaded in formats like JSON, HTML, CSV or Excel.

For each item in the dataset will contain a separate tweet, that follows this format:

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

## Migration

Version 0.1 -> 1.0:

* Every item on dataset is now a separate tweet. That means that using `unwind` parameter is not necessary anymore (and doesn't work.)
* Proxies are required when running on Apify platform
* Login isn't required anymore, but some profiles/tweets can only be accessed using login cookies
* Some fields were renamed, it matches twitter property names

## Extend output function

This parameter allows you to change the shape of your dataset output, split arrays into separate dataset items or filter the output:

```js
async ({ item, request }) => {
    item.user = undefined; // removes this field from the output
    delete item.user; // this works as well

    if (request.userData.search) {
        item.search = request.userData.search; // add the search term to the output
        item.searchUrl = request.loadedUrl; // add the raw search url to the output
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

This parameter allows to extend how the scraper works, can make it easier to extend the default functionality without having to create your own version. As an example, you can include searching the trending topics on each page visit:

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

    // adds a thread and get replies. can accept an id, like from conversation_id or an url
    // you can call this multiple times but will be added only once
    await addThread("1351044768030142464");
}
```

