#!/bin/bash
cp manifest.chrome.json manifest.json
zip chrome.zip -r * -x "node_modules/*" -x *.zip
