# Tweet Scraper

The actor crawls specified twitter profiles and scrapes the following information:

- Name
- Description
- Location
- Date joined
- List of tweets, retweets, and replies
- Number of favorites, replies, and retweets for each tweet
- Conversation threads the tweets belong to

The actor is useful for extracting large amounts of tweet data. Unlike the Twitter API, it does not have rate limit contraints.

## Input Configuration

The actor has the following input options

- **Mode** - Scrape only own tweets from the profile page or include replies to other users
- **List of Handles** - Specify a list of twitter handles (usernames) you want to scrape
  shall the crawler visit. If zero, the actor ignores the links and only crawls the Start URLs.
- **Max. Tweets** - Specify the maximum number of tweets you want to scrape.
- **Proxy Configuration** - Select a proxy to be used by the actor.
- **Login Cookies** - Your Twitter login cookies (no username/password is submitted). For instructions on how to get your login cookies, please see our [tutorial](https://apify.com/help-dev/en/articles/1444249-log-in-to-website-by-transferring-cookies-from-web-browser).

## Migration

Version 0.1 -> 1.0:

* Every item on dataset is now a separate tweet. That means that using `unwind` parameter is not necessary anymore (and doesn't work.)
* Proxies are required when running on Apify platform
* Login isn't required anymore, but some profiles/tweets can only be accessed using login cookies
* Some fields were renamed, it matches twitter property names


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
    "followers_count": 42144443,
    "fast_followers_count": 0,
    "normal_followers_count": 42144443,
    "friends_count": 103,
    "listed_count": 58846,
    "created_at": "2009-06-02T20:12:29.000Z",
    "favourites_count": 7772,
    "verified": true,
    "statuses_count": 13317,
    "media_count": 800,
    "profile_image_url_https": "https://pbs.twimg.com/profile_images/1295975423654977537/dHw9JcrK_normal.jpg",
    "profile_banner_url": "https://pbs.twimg.com/profile_banners/44196397/1576183471",
    "has_custom_timelines": true,
    "advertiser_account_type": "promotable_user",
    "business_profile_state": "none",
    "translator_type": "none"
  },
  "id": "1347978218494513152",
  "conversation_id": "1347978218494513152",
  "full_text": "My 14-year-old son, Saxon, said he feels like 2021 will be a good year. I agree. Let us all make it so.",
  "reply_count": 29669,
  "retweet_count": 66928,
  "favorite_count": 906614,
  "url": "https://twitter.com/elonmusk/status/1347978218494513152",
  "created_at": "2021-01-09T18:47:06.000Z"
}
```

## Extend output function

This parameter allows you to change the shape of your dataset output, split arrays into separate dataset items or filter the output:

```js
async ({ item, request }) => {
    item.user = undefined; // removes this field from the output

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
    if (!item.contentText.includes('lovely')) {
        return null; // omit the output if doesn't contain the text
    }

    return item;
}
```

Splitting into multiple dataset items:

```js
async ({ item }) => {
    const result = [];

    const hashtags = item.contextText.match(/#([\S]+)/g);

    if (hashtags) {
        // dataset will be full of items like { hashtag: '#somehashtag' }
        hashtags.forEach(hashtag => result.push({ hashtag }));
    }

    return result; // returning an array here will split in multiple dataset items
}
```

## Extend scraper function

This parameter allows to extend how the scraper works, can make it easier to extend the default functionality without having to create your own version. As an example, you can include searching the trending topics on each page visit:

```js
async ({ page, request, addSearch, addProfile, customData }) => {
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
        await addSearch(search);

        for (const profile of profiles) {
            await addProfile(profile);
        }
    }
}
```

