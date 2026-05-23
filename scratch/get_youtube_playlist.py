import urllib.request
import re
import json

url = "https://www.youtube.com/playlist?list=PLFx8rf4WVNI6Iu1Icx5k7_29L4VQ7TXmn"
headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
except Exception as e:
    print(f"Error fetching URL: {e}")
    html = ""

# Look for ytInitialData in the HTML
m = re.search(r'var ytInitialData\s*=\s*(\{.*?\});', html)
if m:
    try:
        data = json.loads(m.group(1))
        # Navigate to videos list
        # ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents
        tabs = data.get('contents', {}).get('twoColumnBrowseResultsRenderer', {}).get('tabs', [])
        if tabs:
            content = tabs[0].get('tabRenderer', {}).get('content', {})
            section_list = content.get('sectionListRenderer', {}).get('contents', [])
            if section_list:
                item_section = section_list[0].get('itemSectionRenderer', {}).get('contents', [])
                if item_section:
                    playlist_video_list = item_section[0].get('playlistVideoListRenderer', {}).get('contents', [])
                    print(f"Found {len(playlist_video_list)} items in JSON data.")
                    for idx, item in enumerate(playlist_video_list):
                        video = item.get('playlistVideoRenderer', {})
                        if video:
                            video_id = video.get('videoId')
                            title = video.get('title', {}).get('runs', [{}])[0].get('text')
                            index = video.get('index', {}).get('simpleText')
                            print(f"{index or idx}: {video_id} - {title}")
    except Exception as e:
        print(f"Error parsing JSON: {e}")
else:
    print("Could not find ytInitialData in HTML")
    # Fallback to regex matching videoIds directly
    video_ids = re.findall(r'"videoId"\s*:\s*"(.*?)"', html)
    print("Fallback video IDs found:", len(set(video_ids)))
    # Print first few unique ones
    seen = set()
    for vid in video_ids:
        if vid not in seen:
            seen.add(vid)
            print(vid)
