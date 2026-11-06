import urllib.request
import re

url = 'https://www.julianfella.de/contact'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        m = re.search(r'data-barba-namespace="([^"]+)"', html)
        print('Namespace:', m.group(1) if m else 'None')
        idx = html.find('Send a mail')
        if idx != -1:
            print('--- SEND A MAIL SNIPPET ---')
            print(html[idx-600:idx+1200])
        else:
            print('Schedule a Call not found')
except Exception as e:
    print('Error:', e)
