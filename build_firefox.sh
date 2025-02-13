#!/bin/bash
cp manifest.firefox.json manifest.json
zip firefox.zip -r * -x "node_modules/*" -x *.zip
