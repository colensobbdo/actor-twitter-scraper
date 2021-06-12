## 2021-06-12

Features:
- Update to SDK 1.2.1

Fixes:
- New GraphQL format

## 2021-05-03

Features:
- Update to SDK 1.1.2
- Recursive "People" search
- Tweaks to wording in README and INPUT schema

Bug fixes:
- Filter cookies that lead to never loading page / 401 error
- Fetch data from GraphQl responses

## 2021-03-18

Features:
- Update to SDK 1.0.2

Fixes:
- Clicking on non-replies buttons

## 2021-02-26

Features:
- Scrape replies of replies

Fixes:
- Improve scraping stability

## 2021-02-04

Features:
- Add topics
- Add hashtags URLs
- Optimize end of listings
- Labels for outputScraperFunction for various scraper phases

Fixes:
- Deduplication of tweets
- Force retiring forever failing proxies

## 2021-01-19

- Add mentions, symbols, URLs and hashtags to output
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
- Accept twitter URLs, handles or `@usernames` for better user experience
- Throws immediately if invalid handles are passed
