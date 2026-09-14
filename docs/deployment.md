# Public deployment

Repository: `YesterdaysLemon/dmelanogaster`, branch `main`.

Public hostname: `fly.alirezaafshan.com`, Cloudflare proxied A record to the existing personal VPS. Caddy terminates origin HTTPS and routes to the app's loopback port. The runtime container serves static artifacts and `/healthz`; it performs no server-side neural simulation.

GitHub Actions runs `npm ci`, `npm run verify`, then signs the exact commit webhook with the repository's `DEPLOY_WEBHOOK_SECRET`. `DEPLOY_ENABLED=true` enables delivery to the existing Deploy Manager. The workflow waits for its terminal receipt; HTTP acceptance alone is not deployment success.

Deploy Manager checks out the requested allowed commit, builds the Docker image, starts and checks a candidate, swaps production and rolls back on failure. Its additive app registration holds the host paths and ports. Credentials remain outside Git; `.env` files are excluded from Git and Docker contexts.

The Docker build reads Git HEAD in the build stage and emits `build.json`. `.git` is not copied into the non-root runtime stage. Verify the GitHub run, receipt, running image tag, public health/build SHA, WASM loading and a real browser pulse after deployment.

Host registration: app ID `dmelanogaster`; repo `/opt/dmelanogaster/app`; public port `3190`; candidate `3191`; container `8080`; health path `/healthz`. These ports are reserved through Deploy Manager, not bound publicly by Docker.
