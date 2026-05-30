#!/bin/bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"navidhaidari12@gmail.com","phone":"0421411019"}' \
  https://avibm.vercel.app/api/check-whitelist
