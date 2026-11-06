import urllib.request
import re

for u in ['https://www.julianfella.de/', 'https://www.julianfella.de/awards']:
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8')
            m = re.search(r'data-barba-namespace="([^"]+)"', html)
            print(u, '=> namespace:', m.group(1) if m else 'None')
    except Exception as e:
        print(u, e)


