# Twitch Fox
Quickly browse Twitch. Receive notifications for channels and games. Many customizable features.


## About this fork
Hey! This is a forked version of Twitch Fox. I used this addon for well over 2 years now and loved it however it lacked feature that I really wanted: ability to follow channels locally while also being logged into Twitch. So after inspecting the codebase few times in 2020 I decided to finally make it happen.

This fork is far from perfect and extension needs a full proper rewrite, preferably on some reactive framework. That being said I decided against it, because Twitch Kraken API is already deprecated, and their new Helix API would make it much, much more difficult to port all the awesome features this extension has.


## Differences between original and this fork
- Added ability to follow channels locally while being logged into Twitch
- Redesigned settings
- Now loads whole 100 results instead of 12-20
- Images are now lazy-loaded
- Optimized and heavily cleaned the code
- Changed alarm to simple notification sound (plays once)
- Removed favorites
- Removed onboarding
- Fixed some issues


## Installing
You can give this fork a try without needing to uninstall the old version.  
Download a signed release from [here](https://github.com/kubaska/twitch-fox/releases), then drag-and-drop file on extensions page in Firefox.

## Using new features
Follow and unfollow prioritizes your Twitch account, so if you're logged in it will follow/unfollow the channel on your account. If you want to specifically follow user locally, then search their name in channel search tab. List of locally followed channels, and option to unfollow, is available in addon options.

## Boring stuff
This project uses icons from 'Material Design' set by Templarian.
