## 2021-02-04

Features:
- Add topics
- Add hashtags urls
- Optimize end of listings
- Labels for outputScraperFunction for various scraper phases

Fixes:
- Deduplication of tweets
- Force retiring forever failing proxies

## 2021-01-19

- Add mentions, symbols, urls and hashtags to output
- Add threads/status links support

## 2021-01-12

- BREAKING CHANGE: Format of the dataset has changed
- Search multiple terms at once, search hashtags and terms
- Enriched user profile information (some information are only available when logged in)
- Added minimum and max tweet dates
- Updated SDK version
- Custom data
- Powerful extend output / scraper function

## 2020-11-25

- Remove the need to provide credentials
- Update SDK version
- Allow to filter profile tweets for own tweets or include replies
- Scrape faster when there's no login information
- Accept twitter urls, handles or `@usernames` for better user experience
- Throws immediately if invalid handles are passed
