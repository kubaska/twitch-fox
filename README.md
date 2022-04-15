# Twitch Fox
Quickly browse Twitch. Receive notifications for followed channels. Many customizable features.

## About this fork
Hey! This is a forked version of Twitch Fox. I used this addon for well over 2 years now and loved it however it lacked feature that I really wanted: ability to follow channels locally while also being logged into Twitch. So after inspecting the codebase few times in 2020 I decided to finally make it happen.

## Differences between original and this fork
- Removed stuff not supported by new API. See [MISSING_FEATURES.md](MISSING_FEATURES.md)
- Switched to new Twitch API
- Added ability to follow channels locally while being logged into Twitch, since they removed follow/unfollow endpoints.
- Added Extended View: now you can use Twitch Fox from a separate browser tab.
- Redesigned settings
- Now loads whole 100 results instead of 12-20
- Images are now lazy-loaded
- Optimized and heavily cleaned the code
- Changed alarm to simple notification sound (plays once)
- Removed onboarding
- Fixed some issues

## Planned features
- Exporting all settings
- Rewrite of the rendering logic
- More options to filter content
- Key bind for enlarging preview
- Automatic content refreshing

## Installing
Download a signed release from [here](https://github.com/kubaska/twitch-fox/releases), then drag-and-drop file on extensions page in Firefox.

## Disclaimer
This project is in no way affiliated with Twitch Interactive, Inc. or Amazon.com, Inc.

## Boring stuff
This project uses icons from 'Material Design' set by Templarian.
